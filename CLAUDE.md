# AI-Mate PMS — Claude Code Context

> Agent = Model + Harness. 이 파일은 Harness의 Context Layer입니다.
> 세션 시작 시 자동으로 로드되어 Claude Code에 프로젝트 전체 맥락을 제공합니다.

---

## 프로젝트 개요

**목표**: 액션 아이템(Action Item) 중심 협업형 웹 기반 프로젝트 관리 시스템  
**차별점**: 세로 축이 날짜가 아닌 실제 업무 행위 키워드(검토·리뷰·작성 등)  
**개발 계획**: [PROJECT_PLAN.md](./PROJECT_PLAN.md) 참조

---

## 기술 스택

| 레이어 | 기술 | 포트 |
|--------|------|------|
| Frontend | React 18 + TypeScript + Vite + Ant Design 5 | 3000 |
| Backend  | Node.js + Express + Prisma ORM | 4000 |
| Database | PostgreSQL 15 (Docker) | 5432 |
| Realtime | Socket.io | — |

---

## 디렉터리 구조

```
aimate_pms/
├── CLAUDE.md                  ← 이 파일 (컨텍스트)
├── PROJECT_PLAN.md            ← 개발 기획서 (Phase별 체크리스트)
├── docker-compose.yml         ← PostgreSQL 컨테이너
├── .claude/
│   ├── settings.json          ← 권한·훅 설정
│   └── commands/              ← 커스텀 슬래시 명령어
│
├── backend/
│   ├── src/
│   │   ├── index.ts           ← Express 앱 진입점
│   │   ├── routes/            ← auth, projects, tasks, actions, keywords, users
│   │   ├── services/
│   │   │   └── wbs.service.ts ← WBS 번호 재계산, 진척도 롤업
│   │   └── middlewares/       ← JWT 인증, 에러 핸들러
│   └── prisma/
│       ├── schema.prisma      ← DB 스키마 (8개 테이블)
│       └── seed.ts            ← 관리자 계정 + 기본 키워드 40개
│
└── frontend/
    └── src/
        ├── types/index.ts     ← 공유 타입 정의
        ├── api/client.ts      ← axios + JWT 자동 갱신
        ├── store/auth.store.ts← Zustand 인증 상태
        ├── router/index.tsx   ← 보호된 라우팅
        ├── styles/global.css  ← CSS 변수 + Ant Design 오버라이드
        ├── pages/             ← Login, ProjectList, WBSEditor, MyPage
        └── components/
            ├── Layout.tsx     ← 사이드바 + 헤더
            └── wbs/           ← WBSGrid, ActionCell, TaskDialog, KeywordMapModal, WBSImportModal
```

---

## 핵심 명령어

```bash
# 개발 환경 시작 (순서 중요)
docker compose up -d                        # 1. PostgreSQL 시작
cd backend && npm run dev                   # 2. 백엔드 (포트 4000)
cd frontend && npm run dev                  # 3. 프론트엔드 (포트 3000)

# DB 관리
cd backend
npx prisma migrate dev --name <이름>       # 마이그레이션 생성 + 적용
npm run db:seed                             # 초기 데이터 (관리자 + 키워드)
npx prisma studio                          # DB GUI

# 타입 체크
cd frontend && npx tsc --noEmit
cd backend  && npx tsc --noEmit
```

---

## DB 스키마 핵심

```
users          ← 사용자 (admin/manager/member)
projects       ← 프로젝트 (owner → users)
tasks          ← WBS 공정 (셀프 조인, depth/sortOrder로 계층)
action_keywords← 마스터 키워드 풀 (~40개 기본)
task_actions   ← 공정-키워드 매핑 (weight 합 = 100%)
change_history ← 필드 단위 변경 이력
wbs_versions   ← WBS 버전 스냅샷 (JSONB)
notifications  ← 알림 로그
```

**진척도 계산 규칙**
- 리프 공정: `Σ(액션.weight × STATUS_PROGRESS[status]) / 100`
- 부모 공정: `Σ(자식.progress) / 자식수` (자동집계, 수동 불가)
- STATUS_PROGRESS: `pending=0, received=10, in_progress=50, done=100, on_hold=0`

---

## API 주요 엔드포인트

```
POST   /api/auth/login                       ← JWT 발급
GET    /api/projects                         ← 프로젝트 목록
GET    /api/projects/:id/tasks               ← WBS 공정 트리 (actions 포함)
POST   /api/projects/:id/tasks               ← 공정 생성 (부모 롤업 자동)
POST   /api/projects/:id/tasks/import        ← Excel WBS 일괄 가져오기
PATCH  /api/tasks/:id                        ← 공정 수정
DELETE /api/tasks/:id                        ← 공정 삭제 (cascade)
POST   /api/tasks/:id/actions                ← 액션 매핑 (리프만 허용)
PATCH  /api/actions/:id                      ← 액션 상태/담당자 변경 → 진척도 자동 계산
GET    /api/keywords                         ← 마스터 키워드 목록
GET    /api/users                            ← 사용자 목록 (담당자 선택용)
```

---

## 코딩 규칙

- **TypeScript strict 모드** — 암묵적 any 금지
- **Prisma 트랜잭션** — DB 변경 후 반드시 `recalculateWbsNumbers` 또는 `rollupProgress` 호출
- **Ant Design 5** — `message.success/error`로 피드백, `Popconfirm`으로 삭제 확인
- **CSS 변수** — `global.css`의 `--primary`, `--text-secondary` 등 사용
- **인증** — 모든 API 라우트에 `authenticate` 미들웨어 적용
- **주석** — WHY가 비명확한 경우만 작성 (WHAT 설명 금지)

---

## 현재 개발 단계

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | 기반 구축 (Docker, Prisma, 인증, 프로젝트 CRUD) | ✅ 완료 |
| 2 | WBS 핵심 기능 (그리드, 액션 매핑, 진척도) | ✅ 완료 |
| 3 | 담당자 알림 (이메일, Slack, 마감 알림) | ⏳ 대기 |
| 4 | 마이페이지 대시보드 | ⏳ 대기 |
| 5 | WBS 버전 관리 + diff 비교 | ⏳ 대기 |
| 6 | 간트 차트 | ⏳ 대기 |
| 7 | 내보내기 + QA | ⏳ 대기 |

---

## 테스트 계정

- **이메일**: admin@aimate.com
- **비밀번호**: admin1234
