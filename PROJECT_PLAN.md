# 프로젝트 관리 시스템 (WBS Manager) — 개발 기획서

> **대상**: Claude Code / VS Code 개발 환경  
> **최종 목표**: Windows 독립 실행형(.exe) 프로젝트 관리 앱  
> **기준 화면**: 코리안리 특종보험요율산출 WBS (2026-02-03 ~ 2026-07-07)

---

## 1. 프로젝트 개요

### 1.1 목적
Excel 기반 WBS의 한계(수식 깨짐, `####` 표시, 이력 추적 불가, 색상 조건부 서식 취약)를 해소하고,  
**계층형 작업 분류 + 간트 차트 + 산출률 자동 계산**을 통합한 데스크톱 앱을 개발한다.

### 1.2 핵심 요구사항
- Windows 10/11 독립 실행 (인터넷 불필요, `.exe` 단일 배포)
- 계층형 WBS 트리 (무제한 depth, WBS 번호 자동 부여)
- 계획 vs 실제 비교, 산출률 자동 계산 및 색상 경보
- 간트 차트 (드래그로 일정 조정)
- Excel / PDF 내보내기
- 변경 이력 자동 로깅

---

## 2. 기술 스택

### 2.1 선택: Python + PyQt6 (권장)

```
언어:       Python 3.11+
UI 프레임워크: PyQt6
DB:         SQLite3 (내장, 별도 서버 불필요)
패키징:     PyInstaller (단일 .exe)
차트:       PyQtGraph 또는 QCustomPlot
Excel 출력: openpyxl
PDF 출력:   reportlab
```

**선택 이유**
- Python 생태계로 빠른 개발 가능
- SQLite → 파일 1개로 프로젝트 저장
- PyInstaller → `pyinstaller --onefile main.py`로 배포

---

## 3. 디렉터리 구조

### Python/PyQt6 구조

```
wbs-manager/
├── main.py                  # 진입점, PyQt6 앱 실행
├── requirements.txt
├── build.spec               # PyInstaller 설정
│
├── app/
│   ├── __init__.py
│   ├── config.py            # 앱 설정, 상수
│   ├── database/
│   │   ├── db.py            # SQLite 연결, 마이그레이션
│   │   ├── models.py        # 데이터 모델 (dataclass)
│   │   └── migrations/      # SQL 마이그레이션 파일
│   │       ├── 001_init.sql
│   │       └── 002_history.sql
│   │
│   ├── core/
│   │   ├── wbs_engine.py    # WBS 계층 계산, 롤업 로직
│   │   ├── schedule.py      # 임계경로(CPM), 지연 감지
│   │   ├── progress.py      # 산출률 계산 공식
│   │   └── alerts.py        # 경보 규칙 (지연, 미착수 등)
│   │
│   ├── ui/
│   │   ├── main_window.py   # 메인 윈도우 (QMainWindow)
│   │   ├── wbs_tree.py      # WBS 트리뷰 위젯 (QTreeView)
│   │   ├── gantt_chart.py   # 간트 차트 위젯
│   │   ├── dashboard.py     # 대시보드 (KPI 카드)
│   │   ├── task_dialog.py   # 작업 추가/편집 다이얼로그
│   │   └── styles.py        # QSS 스타일시트
│   │
│   └── export/
│       ├── excel_exporter.py
│       └── pdf_exporter.py
│
├── assets/
│   ├── icons/
│   └── templates/
│       └── wbs_template.xlsx  # Excel 출력 템플릿
│
└── tests/
    ├── test_wbs_engine.py
    └── test_schedule.py
```

---

## 4. 데이터베이스 스키마

### 4.1 테이블 정의

```sql
-- 프로젝트
CREATE TABLE projects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    start_date  DATE,
    end_date    DATE,
    description TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- WBS 작업 (계층형, 셀프 조인)
CREATE TABLE tasks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id      INTEGER NOT NULL REFERENCES projects(id),
    parent_id       INTEGER REFERENCES tasks(id),   -- NULL = 최상위
    wbs_number      TEXT NOT NULL,                  -- "1.2.3" 형식
    name            TEXT NOT NULL,
    note            TEXT,                           -- 비고

    -- 계획
    plan_start      DATE,
    plan_end        DATE,
    plan_work       REAL DEFAULT 0,                 -- 계획 작업량 (M/M 또는 시간)
    plan_duration   INTEGER,                        -- 계획 기간 (일)

    -- 실제
    actual_start    DATE,
    actual_end      DATE,
    actual_work     REAL DEFAULT 0,                 -- 실제 투입 작업량

    -- 산출물
    output_rate     REAL DEFAULT 0,                 -- 산출률 (0.0 ~ 1.0)
    plan_rate       REAL DEFAULT 0,                 -- 계획 산출률

    -- 상태
    status          TEXT DEFAULT 'not_started',     -- not_started | in_progress | done | delayed
    is_milestone    INTEGER DEFAULT 0,
    sort_order      INTEGER DEFAULT 0,

    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 담당자 (M:N)
CREATE TABLE assignees (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    name    TEXT NOT NULL UNIQUE
);

CREATE TABLE task_assignees (
    task_id     INTEGER REFERENCES tasks(id),
    assignee_id INTEGER REFERENCES assignees(id),
    PRIMARY KEY (task_id, assignee_id)
);

-- 변경 이력
CREATE TABLE task_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id     INTEGER REFERENCES tasks(id),
    field_name  TEXT NOT NULL,
    old_value   TEXT,
    new_value   TEXT,
    changed_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    changed_by  TEXT DEFAULT 'user'
);

-- 앱 설정
CREATE TABLE settings (
    key     TEXT PRIMARY KEY,
    value   TEXT
);
```

### 4.2 WBS 번호 자동 부여 로직

```python
# wbs_engine.py 에서 구현할 핵심 로직
def recalculate_wbs_numbers(project_id: int) -> None:
    """
    트리 순서대로 WBS 번호를 재계산.
    예: 루트 작업들 → 1, 2, 3
        1의 자식    → 1.1, 1.2, 1.3
        1.1의 자식  → 1.1.1, 1.1.2
    """
    pass

def rollup_progress(task_id: int) -> float:
    """
    부모 작업의 진행률 = 자식 작업들의 가중 평균
    가중치 = 각 자식의 plan_work / 부모의 전체 plan_work
    """
    pass
```

---

## 5. 핵심 기능 명세

### 5.1 WBS 트리뷰

**컬럼 구성** (이미지 참고)

| 컬럼 | 내용 | 편집 |
|------|------|------|
| WBS | 자동 계산 | ✗ |
| 작업명 | 텍스트 | ✓ 인라인 |
| 비고 | 텍스트 | ✓ |
| 시작일(계획) | 날짜 | ✓ |
| 완료일(계획) | 날짜 | ✓ |
| 총 작업량 | 숫자 | ✓ |
| 계획 작업량 | 숫자 | ✓ |
| 총 기간 | 자동 계산 | ✗ |
| 계획 기간 | 숫자 | ✓ |
| 실제 시작일 | 날짜 | ✓ |
| 실제 완료일 | 날짜 | ✓ |
| 실제 출력업량 | 숫자 | ✓ |
| 담당자 | 다중 선택 | ✓ |
| 산출률(계획) | % | ✓ |
| 산출률(실제) | % | 자동/수동 |

**색상 경보 규칙**

```python
# progress.py
def get_row_color(task: Task) -> str:
    """
    반환: QColor 헥스 코드
    - 완료(100%)         → 연초록 #C6EFCE
    - 계획 < 실제(지연)   → 연빨강 #FFC7CE
    - 진행 중(정상)       → 연노랑 #FFEB9C
    - 미착수              → 흰색   #FFFFFF
    - 부모(요약) 행       → 연파랑 #D6E4F7 (볼드)
    """
```

### 5.2 산출률 계산 공식

```python
# progress.py
def calc_output_rate(task: Task) -> float:
    """
    리프 노드:   actual_work / plan_work  (단, plan_work > 0)
    부모 노드:   Σ(자식 actual_work) / Σ(자식 plan_work)
    전체 프로젝트: 최상위 롤업 결과
    """

def calc_plan_rate(task: Task, reference_date: date) -> float:
    """
    기준일 기준으로 계획상 달성해야 할 산출률
    = (reference_date - plan_start) / (plan_end - plan_start)
    단, 0.0 ~ 1.0 클램핑
    """
```

### 5.3 간트 차트

**구현 방식**: `QGraphicsScene` + `QGraphicsView` 커스텀 위젯

**기능 목록**
- [ ] X축: 날짜 (월/주/일 단위 전환)
- [ ] Y축: WBS 트리뷰와 동기화된 작업 목록
- [ ] 계획 바 (파랑) + 실제 바 (초록/빨강)
- [ ] 마일스톤 마커 (다이아몬드)
- [ ] 드래그로 날짜 조정 → DB 즉시 반영
- [ ] 오늘 기준선 (빨간 세로선)
- [ ] 전체 기간 / 이번 달 / 이번 주 줌 레벨

### 5.4 대시보드 KPI

```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ 전체 산출률      │ 계획 대비 실적   │ 지연 작업 수     │ 이번 주 마감     │
│ 80.42%          │ -1.53%p         │ 3건             │ 5건             │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

### 5.5 Excel 내보내기

```python
# excel_exporter.py 구현 목표
# openpyxl 사용
# - 계층 들여쓰기 (WBS depth에 따라)
# - 조건부 서식 (색상 경보)
# - 간트 차트 시트 별도 생성
# - 헤더 고정 (freeze_panes)
# - 프린트 영역 설정
```

---

## 6. 개발 단계별 체크리스트

### Phase 1 — 기반 구축 (1~2주)
- [ ] 프로젝트 초기화 (`requirements.txt`, 가상환경)
- [ ] SQLite DB 연결 및 마이그레이션 시스템
- [ ] `Task` 데이터 모델 (dataclass)
- [ ] WBS 엔진: 번호 부여, 진행률 롤업
- [ ] PyQt6 메인 윈도우 뼈대
- [ ] WBS 트리뷰 기본 CRUD (추가/삭제/이동)

### Phase 2 — 핵심 기능 (1~2주)
- [ ] 인라인 셀 편집 (날짜 피커 포함)
- [ ] 산출률 자동 계산 및 색상 경보
- [ ] 계획 vs 실제 컬럼 비교 표시
- [ ] 담당자 다중 배정
- [ ] 변경 이력 자동 저장

### Phase 3 — 간트 차트 (2주)
- [ ] QGraphicsScene 기반 간트 렌더링
- [ ] 계획/실제 바 이중 표시
- [ ] 드래그로 날짜 수정
- [ ] WBS 트리뷰와 스크롤 동기화

### Phase 4 — 대시보드 + 알림 (1주)
- [ ] KPI 요약 카드 위젯
- [ ] 산출률 트렌드 차트
- [ ] 지연 작업 자동 감지 알림 (QSystemTrayIcon)
- [ ] 프로젝트 전환 기능

### Phase 5 — 내보내기 (1주)
- [ ] Excel 내보내기 (openpyxl)
- [ ] PDF 내보내기 (reportlab)
- [ ] 현황 스냅샷 이미지 저장

### Phase 6 — 패키징 및 QA (1주)
- [ ] PyInstaller .spec 파일 작성
- [ ] `--onefile` 단일 .exe 빌드
- [ ] Windows 10/11 설치 테스트
- [ ] 데이터 마이그레이션 (기존 Excel → SQLite 가져오기)

---

## 7. 산출률 계산 레퍼런스

기존 이미지에서 확인된 산식:

```
계획 산출률(%) = 기준일까지 완료되어야 할 비율
실제 산출률(%) = 실제 완료된 작업량 / 전체 계획 작업량

상위 항목 산출률 = Σ(하위 실제 작업량) / Σ(하위 계획 작업량)

예:
  1.4 개발 전체:  실제 121.3 / 계획 (66+32+50에서 유추) → 89.91%
  1.5 테스트:     실제 16.4 / 계획 53.0 → 19.53% (지연 중)
  1.6 구현:       실제 0.0 / 계획 14.0 → 0.00% (미착수)
```

---

## 8. 주요 Python 패키지

```txt
# requirements.txt
PyQt6>=6.6.0
PyQt6-Qt6>=6.6.0
openpyxl>=3.1.0
reportlab>=4.0.0
pyinstaller>=6.0.0

# 선택
pyqtgraph>=0.13.0    # 간트 차트 대안
python-dateutil>=2.8.0
```

---

## 9. Claude Code 작업 지시 템플릿

각 Phase 시작 시 Claude Code에 아래 형식으로 지시:

```
[작업 지시]
Phase: 1
파일: app/database/db.py
목표: SQLite 연결 클래스 및 마이그레이션 시스템 구현

요구사항:
- DBManager 클래스 (싱글톤)
- connect(db_path: str) 메서드
- run_migrations() — app/database/migrations/ 폴더의 SQL 파일을 버전 순으로 실행
- execute / fetchall / fetchone 헬퍼
- 에러 시 롤백 보장

참고:
- PROJECT_PLAN.md 4.1 스키마 사용
- Python 3.11, sqlite3 내장 모듈
```

---

## 10. 참고 이미지 분석

| 항목 | 내용 |
|------|------|
| 프로젝트 기간 | 2026-02-03 ~ 2026-07-07 (계획), 약 5개월 |
| 전체 산출률 | 계획 81.95% / 실제 80.42% |
| 주요 지연 | 1.5 테스트 (계획 22.64% vs 실제 19.53%), 1.4.1.1.4 (33.33% vs 20.00%) |
| WBS 최대 depth | 4단계 (예: 1.4.1.2.4) |
| 담당자 | 홍길동, 김상우, 김송우, 김장군, 김승훈 |
| 작업량 단위 | M/M (Man-Month) 추정 |
| 색상 규칙 | 노랑=계획 미달, 초록=계획 초과/완료, 빨강=심각 지연 |

---

*이 문서는 Claude Code 개발 세션 전 컨텍스트 로딩용으로 작성되었습니다.*  
*각 세션 시작 시 `@PROJECT_PLAN.md` 로 참조하세요.*
