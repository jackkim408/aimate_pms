# 프로젝트 관리 시스템 (AI-Mate PMS) — 개발 기획서

> **최종 목표**: 액션 아이템 중심의 협업형 웹 기반 프로젝트 관리 시스템  
> **개발 방식**: 웹(Web) — 편의성·협업·프로세스 자동화 중심  
> **기준 모델**: 코리안리 특종보험요율산출 WBS (2026-02-03 ~ 2026-07-07)

---

## 1. 프로젝트 개요

### 1.1 목적

기존 Excel 기반 WBS 및 standard WBS 도구의 한계를 극복하고,  
**실제 업무 행위(Action Item) 중심**의 디테일한 관리와 **프로세스 자동화**에 초점을 맞춘  
웹 기반 프로젝트 관리 시스템을 개발한다.

### 1.2 기존 시스템과의 차별점

| 구분 | 기존 WBS | AI-Mate PMS |
|------|----------|-------------|
| 세로 축(Column) | 날짜/기간 정보 | **실제 액션 키워드** (검토, 리뷰, 작성 등) |
| 진척도 단위 | 공정(Task) 단위 | **액션 아이템 단위** (가중치 합산) |
| 담당자 지정 | 공정 단위 | **액션 아이템 단위** (세분화) |
| 알림 | 수동 | **자동 알림** (이메일 + Slack) |
| 버전 관리 | 없음 | **자동 버전 스냅샷 + diff 비교** |
| 인터페이스 | 클라이언트(exe) | **웹 브라우저** (협업 중심) |

### 1.3 핵심 요구사항 요약

- 웹 기반 시스템 (멀티유저 협업, 별도 설치 불필요)
- 가로(Row) = 시간 흐름의 공정, 세로(Column) = 액션 키워드
- 마스터 액션 키워드 리스트(~100개) 관리 및 공정별 활성화
- 액션 아이템별 가중치(%) 부여 → 가중치 합 = 공정 진척도 100%
- 액션 아이템별 상태 관리 (접수 / 진행중 / 완료 / 보류)
- 액션 아이템 단위 담당자 지정 + 자동 알림 (이메일, Slack)
- 개인화 대시보드 (마이페이지)
- WBS 변경 시 자동 버전 스냅샷 + 버전 간 diff 비교
- 간트 차트, 산출률 자동 계산, Excel/PDF 내보내기

---

## 2. 기술 스택

### 2.1 선택: React + Node.js + PostgreSQL (권장)

```
Frontend:   React 18 + TypeScript + Vite
UI Library: Ant Design 또는 shadcn/ui
Backend:    Node.js + Express (or Fastify)
ORM:        Prisma
DB:         PostgreSQL 15
Real-time:  Socket.io (알림, 진척도 실시간 갱신)
인증:       JWT (Access Token + Refresh Token)
이메일:     Nodemailer + SMTP (또는 SendGrid)
Slack:      Slack Incoming Webhooks API
배포:       Docker + Docker Compose
```

**선택 이유**
- React: 복잡한 트리뷰·간트차트·모달 등 UI 구성에 최적
- PostgreSQL: 다중 사용자 동시 접속, 트랜잭션 안정성
- Prisma: 타입 안전한 ORM, 마이그레이션 관리 편의
- Docker Compose: 로컬 개발 → 서버 배포 환경 일관성

### 2.2 대안: Next.js Full-Stack (팀 규모 작을 경우)

```
Framework:  Next.js 14 (App Router) + TypeScript
DB:         PostgreSQL 15 + Prisma
API:        Next.js API Routes (서버리스 방식)
배포:       Vercel 또는 Docker
```

---

## 3. 디렉터리 구조

```
aimate-pms/
├── docker-compose.yml
├── .env.example
│
├── frontend/                        # React + Vite
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/                     # API 클라이언트 (axios)
│   │   ├── components/
│   │   │   ├── wbs/
│   │   │   │   ├── WBSGrid.tsx      # 핵심: 행=공정, 열=액션키워드
│   │   │   │   ├── ActionCell.tsx   # 액션 아이템 셀 (상태·담당자·가중치)
│   │   │   │   └── GanttChart.tsx   # 간트 차트
│   │   │   ├── dashboard/
│   │   │   │   ├── MyPage.tsx       # 개인화 대시보드
│   │   │   │   └── KPICards.tsx
│   │   │   ├── keyword/
│   │   │   │   └── KeywordManager.tsx  # 마스터 키워드 관리
│   │   │   └── version/
│   │   │       └── VersionDiff.tsx  # 버전 diff 비교 화면
│   │   ├── pages/
│   │   │   ├── ProjectList.tsx
│   │   │   ├── WBSEditor.tsx
│   │   │   ├── MyPage.tsx
│   │   │   └── Settings.tsx
│   │   └── store/                   # Zustand 상태 관리
│   └── package.json
│
├── backend/                         # Node.js + Express
│   ├── src/
│   │   ├── index.ts                 # 앱 진입점
│   │   ├── routes/
│   │   │   ├── projects.ts
│   │   │   ├── tasks.ts
│   │   │   ├── actions.ts           # 액션 아이템 CRUD
│   │   │   ├── keywords.ts          # 마스터 키워드 관리
│   │   │   ├── users.ts
│   │   │   ├── auth.ts
│   │   │   └── versions.ts          # WBS 버전 관리
│   │   ├── services/
│   │   │   ├── progress.service.ts  # 산출률 계산 (가중치 롤업)
│   │   │   ├── notify.service.ts    # 이메일 + Slack 알림
│   │   │   ├── version.service.ts   # 버전 스냅샷 + diff
│   │   │   └── wbs.service.ts       # WBS 번호 재계산
│   │   ├── middlewares/
│   │   │   ├── auth.ts              # JWT 검증
│   │   │   └── errorHandler.ts
│   │   └── socket/
│   │       └── events.ts            # Socket.io 이벤트 정의
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── package.json
│
└── docs/
    └── PROJECT_PLAN.md
```

---

## 4. 데이터베이스 스키마

### 4.1 핵심 테이블

```sql
-- 사용자
CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    email       VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(100) NOT NULL,
    password    VARCHAR(255) NOT NULL,           -- bcrypt 해시
    slack_id    VARCHAR(100),                    -- Slack 사용자 ID
    role        VARCHAR(20) DEFAULT 'member',    -- admin | manager | member
    created_at  TIMESTAMP DEFAULT NOW()
);

-- 프로젝트
CREATE TABLE projects (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    start_date  DATE,
    end_date    DATE,
    owner_id    INTEGER REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- WBS 공정(Task) — 계층형, 셀프 조인
CREATE TABLE tasks (
    id              SERIAL PRIMARY KEY,
    project_id      INTEGER NOT NULL REFERENCES projects(id),
    parent_id       INTEGER REFERENCES tasks(id),   -- NULL = 최상위
    wbs_number      VARCHAR(50) NOT NULL,            -- "1.2.3" 형식
    name            VARCHAR(255) NOT NULL,
    note            TEXT,
    depth           INTEGER NOT NULL DEFAULT 0,

    -- 일정
    plan_start      DATE,
    plan_end        DATE,
    actual_start    DATE,
    actual_end      DATE,

    -- 담당자 (공정 단위, 액션 단위는 별도)
    assignee_id     INTEGER REFERENCES users(id),

    -- 진척도 (액션 아이템 가중치 합산으로 자동 계산)
    progress        REAL DEFAULT 0.0,               -- 0.0 ~ 100.0
    plan_progress   REAL DEFAULT 0.0,

    status          VARCHAR(20) DEFAULT 'not_started',
    -- not_started | in_progress | done | delayed | on_hold

    is_milestone    BOOLEAN DEFAULT FALSE,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- 마스터 액션 키워드 (~100개)
-- 예: 검토, 리뷰, 작성, 입력, 승인, 확인, 배포, 테스트 ...
CREATE TABLE action_keywords (
    id          SERIAL PRIMARY KEY,
    project_id  INTEGER REFERENCES projects(id),    -- NULL이면 전체 공용
    name        VARCHAR(100) NOT NULL,              -- "검토", "리뷰", "작성" 등
    description TEXT,
    sort_order  INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE
);

-- 공정-키워드 매핑 (공정마다 필요한 키워드만 활성화)
-- 이 테이블이 실제 액션 아이템 인스턴스
CREATE TABLE task_actions (
    id              SERIAL PRIMARY KEY,
    task_id         INTEGER NOT NULL REFERENCES tasks(id),
    keyword_id      INTEGER NOT NULL REFERENCES action_keywords(id),
    seq_order       INTEGER NOT NULL DEFAULT 1,     -- 공정 내 액션 순서 (1, 2, 3...)
    weight          REAL NOT NULL DEFAULT 0.0,      -- 가중치 (%) — 공정 내 합계 = 100
    assignee_id     INTEGER REFERENCES users(id),   -- 액션 단위 담당자
    status          VARCHAR(20) DEFAULT 'pending',
    -- pending(접수대기) | received(접수) | in_progress(진행중)
    -- done(완료) | on_hold(보류)
    progress        REAL DEFAULT 0.0,               -- 0.0 ~ 100.0 (상태 기반 자동 계산)
    note            TEXT,
    due_date        DATE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE (task_id, keyword_id)
);

-- 변경 이력 (필드 단위)
CREATE TABLE change_history (
    id          SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,   -- 'task' | 'task_action' | 'project'
    entity_id   INTEGER NOT NULL,
    field_name  VARCHAR(100) NOT NULL,
    old_value   TEXT,
    new_value   TEXT,
    changed_by  INTEGER REFERENCES users(id),
    changed_at  TIMESTAMP DEFAULT NOW()
);

-- WBS 버전 스냅샷
CREATE TABLE wbs_versions (
    id          SERIAL PRIMARY KEY,
    project_id  INTEGER NOT NULL REFERENCES projects(id),
    version_no  INTEGER NOT NULL,                   -- 1, 2, 3...
    label       VARCHAR(100),                       -- "초기 기준선", "1차 변경" 등
    snapshot    JSONB NOT NULL,                     -- 전체 WBS 구조 JSON 스냅샷
    created_by  INTEGER REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE (project_id, version_no)
);

-- 알림 로그
CREATE TABLE notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id),
    type        VARCHAR(50) NOT NULL,               -- 'assignment' | 'status_change' | 'deadline'
    title       VARCHAR(255),
    body        TEXT,
    channel     VARCHAR(20),                        -- 'email' | 'slack' | 'in_app'
    is_read     BOOLEAN DEFAULT FALSE,
    sent_at     TIMESTAMP DEFAULT NOW()
);
```

### 4.2 진척도 자동 계산 로직

```typescript
// backend/src/services/progress.service.ts

/**
 * 액션 아이템 상태 → 진척도 매핑
 * 상태가 바뀌면 progress 자동 계산
 */
const STATUS_PROGRESS: Record<string, number> = {
  pending:     0,
  received:    10,
  in_progress: 50,
  done:        100,
  on_hold:     0,
};

/**
 * 공정(Task)의 진척도 = Σ(액션.가중치 × 액션.진척도) / 100
 * 예: 인터뷰(10%, done=100%) + 작성(70%, in_progress=50%) + 리뷰(20%, pending=0%)
 *   = (10×100 + 70×50 + 20×0) / 100 = 45%
 */
async function calcTaskProgress(taskId: number): Promise<number> { ... }

/**
 * 부모 공정 진척도 = Σ(자식 plan_work × 자식 progress) / Σ(자식 plan_work)
 * 리프가 아닌 경우 자식들의 가중 평균으로 롤업
 */
async function rollupProgress(taskId: number): Promise<number> { ... }

/**
 * WBS 번호 재계산 (트리 순서 기반)
 * 루트: 1, 2, 3 / 1의 자식: 1.1, 1.2 / 1.1의 자식: 1.1.1
 */
async function recalculateWbsNumbers(projectId: number): Promise<void> { ... }
```

### 4.3 WBS 버전 관리 로직

```typescript
// backend/src/services/version.service.ts

/**
 * 현재 WBS 전체를 JSON 스냅샷으로 저장 (버전 증가)
 * 공정·액션·담당자 정보 포함
 */
async function createSnapshot(projectId: number, label: string, userId: number): Promise<number> { ... }

/**
 * 두 버전 간 diff 계산
 * 반환: { added[], removed[], changed: [{field, old, new}] }
 */
async function compareVersions(projectId: number, vA: number, vB: number): Promise<WBSDiff> { ... }
```

---

## 5. 핵심 기능 명세

### 5.1 WBS 그리드 화면 (핵심 차별점)

**화면 구조**

```
        [검토] [리뷰] [작성] [입력] [승인] [확인] ... (마스터 키워드 중 활성화된 것)
WBS No  공정명   ─────────────────────────────────────  시작일  종료일  담당자  진척도
1       요구사항  [10%↑]  [20%↑]  [70%↑]              2026-02-03  ...   홍길동  45%
1.1     인터뷰    [100%✓] [ - ]   [ - ]               2026-02-03  ...   홍길동  100%
1.2     분석      [ - ]   [50%▶]  [ - ]               2026-02-10  ...   김철수  50%
2       설계      ...
```

- **가로 행(Row)**: 시간 흐름에 따른 공정 (계층형 WBS 트리)
- **세로 열(Column)**: 마스터 액션 키워드 (~100개 중 프로젝트별 활성화)
- **셀**: 해당 공정에 해당 키워드가 매핑된 경우 → 가중치 + 상태 + 담당자 표시

**액션 셀 상세 UI**

```
┌──────────────┐
│ 작성         │  ← 키워드명
│ ②번          │  ← 공정 내 순서
│ 가중치: 70%  │
│ ───────────  │
│ ▶ 진행중     │  ← 상태 드롭다운
│ 담당: 김철수  │  ← 담당자 변경 가능
│ 진척도: 50%  │  ← 상태 기반 자동 계산
└──────────────┘
```

**색상 경보 규칙**

| 조건 | 행 색상 |
|------|---------|
| 진척도 = 100% (완료) | 연초록 `#C6EFCE` |
| 실제 진척도 < 계획 진척도 (지연) | 연빨강 `#FFC7CE` |
| 진행 중 (정상) | 연노랑 `#FFEB9C` |
| 미착수 | 흰색 `#FFFFFF` |
| 부모(요약) 공정 | 연파랑 `#D6E4F7` (볼드) |

### 5.2 마스터 액션 키워드 관리

- 전체 공용 키워드 풀(~100개)과 프로젝트별 사용 키워드 분리
- 관리자가 키워드 추가·수정·비활성화
- 프로젝트 생성 시 사용할 키워드 선택 (체크박스)
- 공정별로 필요한 키워드만 활성화하여 셀 생성

**예시 키워드 목록**

```
검토, 리뷰, 작성, 입력, 승인, 확인, 배포, 테스트, 인터뷰,
분석, 설계, 구현, 디버그, 문서화, 보고, 협의, 수정, 검증,
제출, 수령, 정리, 공유, 교육, 데모, 피드백, 조율, 승인요청 ...
```

### 5.3 액션 아이템 가중치 및 상태 관리

**가중치 규칙**
- 하나의 공정에 매핑된 모든 액션 가중치의 합 = **반드시 100%**
- 가중치 합이 100%가 되지 않으면 저장 불가 (프론트엔드 유효성 검사)

**상태 → 진척도 자동 계산**

| 상태 | 진척도 |
|------|--------|
| 접수대기 (pending) | 0% |
| 접수 (received) | 10% |
| 진행중 (in_progress) | 50% |
| 완료 (done) | 100% |
| 보류 (on_hold) | 0% |

> 공정 진척도 예시: 인터뷰(10%, done) + 작성(70%, in_progress) + 리뷰(20%, pending)  
> = (10×100 + 70×50 + 20×0) / 100 = **45%**

**액션 내 순서 부여**
- 하나의 공정 내 액션 아이템에 1번, 2번, 3번 순서 부여 가능
- 업무 실행 순서와 무관하게 시스템 내 관리 순서 지정

### 5.4 담당자 지정 및 자동 알림

**담당자 지정 레벨**
1. 프로젝트 담당자 (전체 관리)
2. 공정(Task) 단위 담당자
3. **액션 아이템 단위 담당자** (핵심 — 개별 액션마다 다른 담당자 가능)

**자동 알림 트리거**

| 이벤트 | 알림 대상 | 채널 |
|--------|-----------|------|
| 액션 아이템 담당자 지정/변경 | 신규 담당자 | 이메일 + Slack |
| 액션 상태 변경 (보류 → 진행중 등) | 공정 담당자 + 프로젝트 관리자 | 이메일 + Slack |
| 마감일 D-3, D-1 | 해당 액션 담당자 | 이메일 |
| 공정 지연 감지 | 공정 담당자 + 관리자 | Slack |

### 5.5 개인화 대시보드 (마이페이지)

로그인 시 본인에게 할당된 정보만 모아서 표시:

```
┌─────────────────────────────────────────────────────────┐
│  홍길동님의 오늘 할 일 (2026-05-30)                      │
├──────────────────┬──────────────────┬───────────────────┤
│ 진행중 액션      │ 마감 임박 (D-3)   │ 보류/지연         │
│ 5건              │ 3건               │ 2건               │
└──────────────────┴──────────────────┴───────────────────┘

[내 액션 아이템 목록]
프로젝트         공정       액션    상태      마감일   가중치
코리안리 WBS  1.2 분석   작성    진행중    06-10    70%
코리안리 WBS  2.1 설계   리뷰    접수      06-15    30%
```

### 5.6 WBS 버전 관리 및 변경 이력

**버전 스냅샷**
- WBS 최초 확정 시 버전 1 자동 생성
- 공정 추가/삭제, 담당자 변경, 일정 변경 등 주요 변경 발생 시 새 버전 생성
- 각 버전에 레이블 지정 가능 ("초기 기준선", "1차 변경", "중간 점검" 등)

**버전 간 diff 화면**

```
버전 1 (2026-03-01)  vs  버전 2 (2026-04-15)

[변경 항목]
공정 1.3 테스트
  ✗ 종료일: 2026-06-01 → 2026-06-15 (+14일 지연)
  ✗ 담당자: 홍길동 → 김철수 (변경)

공정 1.4 구현
  + 신규 추가됨

액션: 1.2 분석 > 리뷰
  ✗ 가중치: 20% → 30% (변경)
```

### 5.7 간트 차트

- X축: 날짜 (월/주/일 단위 전환)
- Y축: WBS 공정 목록 (트리뷰와 동기화)
- 계획 바(파랑) + 실제 바(초록/빨강) 이중 표시
- 마일스톤 마커 (다이아몬드)
- 오늘 기준선 (빨간 세로선)
- 드래그로 날짜 수정 → DB 즉시 반영

### 5.8 내보내기

**Excel 내보내기** (exceljs)
- WBS 그리드 (액션 키워드 컬럼 포함)
- 계층 들여쓰기, 조건부 서식(색상 경보), 헤더 고정
- 간트 차트 시트 별도 생성

**PDF 내보내기** (pdfmake)
- 현황 요약 리포트
- 프린트 영역 최적화

---

## 6. API 설계 (REST)

```
POST   /api/auth/login
POST   /api/auth/refresh

GET    /api/projects
POST   /api/projects
GET    /api/projects/:id

GET    /api/projects/:id/tasks         # WBS 트리 전체
POST   /api/projects/:id/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
PATCH  /api/tasks/:id/reorder          # 순서/부모 변경

GET    /api/projects/:id/keywords      # 프로젝트 활성 키워드
POST   /api/tasks/:id/actions          # 공정에 액션 매핑
PATCH  /api/actions/:id                # 가중치·상태·담당자 변경
DELETE /api/actions/:id

GET    /api/projects/:id/versions      # 버전 목록
POST   /api/projects/:id/versions      # 수동 스냅샷 생성
GET    /api/projects/:id/versions/diff?from=1&to=2

GET    /api/users/me/actions           # 마이페이지: 내 액션 아이템

GET    /api/keywords                   # 마스터 키워드 풀
POST   /api/keywords
PATCH  /api/keywords/:id
```

---

## 7. 개발 단계별 체크리스트

### Phase 1 — 기반 구축 (1~2주)
- [ ] 프로젝트 초기화 (Docker Compose, PostgreSQL, Prisma)
- [ ] 사용자 인증 (JWT 로그인/로그아웃)
- [ ] 프로젝트 CRUD API
- [ ] 마스터 액션 키워드 관리 API
- [ ] React 앱 초기화 (라우팅, 인증 컨텍스트)

### Phase 2 — WBS 핵심 기능 (2~3주)
- [ ] 계층형 WBS 공정 CRUD (무제한 depth, WBS 번호 자동 부여)
- [ ] 공정-액션 매핑 (키워드 선택 + 가중치 입력)
- [ ] 액션 가중치 합 100% 유효성 검사
- [ ] 액션 상태 변경 → 진척도 자동 계산
- [ ] 상위 공정 진척도 롤업
- [ ] WBS 그리드 화면 (행=공정, 열=액션 키워드)
- [ ] 색상 경보 (지연·완료·진행중·미착수)

### Phase 3 — 담당자 및 알림 (1~2주)
- [ ] 액션 아이템별 담당자 지정 UI
- [ ] 이메일 알림 (Nodemailer)
- [ ] Slack Webhook 알림
- [ ] 인앱 알림 (Socket.io)
- [ ] 마감일 D-3, D-1 알림 스케줄러 (node-cron)

### Phase 4 — 개인화 대시보드 (1주)
- [ ] 마이페이지 (내 액션 아이템 목록, 상태별 필터)
- [ ] 프로젝트 전체 KPI 대시보드
- [ ] 산출률 트렌드 차트 (recharts)

### Phase 5 — 버전 관리 (1주)
- [ ] WBS 변경 시 자동 스냅샷 저장
- [ ] 버전 목록 화면
- [ ] 버전 간 diff 비교 화면

### Phase 6 — 간트 차트 (1~2주)
- [ ] 간트 차트 렌더링 (react-gantt-chart 또는 커스텀)
- [ ] 계획/실제 바 이중 표시
- [ ] 드래그로 일정 수정 → API 반영
- [ ] WBS 트리와 스크롤 동기화

### Phase 7 — 내보내기 및 QA (1주)
- [ ] Excel 내보내기 (exceljs)
- [ ] PDF 내보내기 (pdfmake)
- [ ] 멀티유저 동시 접속 테스트
- [ ] 브라우저 호환성 테스트 (Chrome, Edge)

---

## 8. 주요 패키지

### Frontend

```json
{
  "react": "^18.3.0",
  "typescript": "^5.4.0",
  "vite": "^5.2.0",
  "antd": "^5.17.0",
  "axios": "^1.7.0",
  "zustand": "^4.5.0",
  "recharts": "^2.12.0",
  "react-router-dom": "^6.23.0",
  "socket.io-client": "^4.7.0",
  "dayjs": "^1.11.0",
  "exceljs": "^4.4.0"
}
```

### Backend

```json
{
  "express": "^4.19.0",
  "prisma": "^5.14.0",
  "@prisma/client": "^5.14.0",
  "jsonwebtoken": "^9.0.0",
  "bcryptjs": "^2.4.3",
  "nodemailer": "^6.9.0",
  "socket.io": "^4.7.0",
  "node-cron": "^3.0.0",
  "zod": "^3.23.0",
  "typescript": "^5.4.0"
}
```

---

## 9. 산출률 계산 레퍼런스

```
[액션 아이템 기반 공정 진척도]
공정 1.2 분석:
  - 인터뷰 (10%, 완료=100%) → 기여: 10%
  - 작성   (70%, 진행중=50%) → 기여: 35%
  - 리뷰   (20%, 접수대기=0%) → 기여: 0%
  공정 진척도 = 10 + 35 + 0 = 45%

[상위 공정 롤업]
공정 1 (요구사항):
  - 1.1 인터뷰  (plan_work 5MM, progress 100%) → 기여: 5
  - 1.2 분석    (plan_work 10MM, progress 45%)  → 기여: 4.5
  - 1.3 정의    (plan_work 8MM,  progress 0%)   → 기여: 0
  상위 진척도 = (5 + 4.5 + 0) / (5 + 10 + 8) = 9.5/23 ≈ 41.3%
```

---

## 10. 기존 WBS 참고 데이터 (코리안리 레퍼런스)

| 항목 | 내용 |
|------|------|
| 프로젝트 기간 | 2026-02-03 ~ 2026-07-07 (약 5개월) |
| 전체 산출률 | 계획 81.95% / 실제 80.42% |
| 주요 지연 | 1.5 테스트 (계획 22.64% vs 실제 19.53%) |
| WBS 최대 depth | 4단계 (예: 1.4.1.2.4) |
| 담당자 | 성승준, 황제환, 박마루찬, 천신영, 이승훈 |
| 작업량 단위 | M/M (Man-Month) |
| 색상 규칙 | 노랑=계획 미달, 초록=완료, 빨강=심각 지연 |

---

*본 문서는 AI-Mate PMS 개발 세션 컨텍스트 로딩용으로 작성되었습니다.*  
*각 세션 시작 시 `@PROJECT_PLAN.md`로 참조하세요.*
