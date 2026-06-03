# /db — 데이터베이스 관리

백엔드 디렉터리: `c:\src\aimate_pms\backend`

## 주요 작업

### 마이그레이션 생성 및 적용
```powershell
cd c:\src\aimate_pms\backend
npx prisma migrate dev --name <변경_내용_설명>
```

### 스키마만 빠르게 적용 (개발 중)
```powershell
npx prisma db push
```

### 초기 데이터 재설정
```powershell
npm run db:seed
# 관리자 계정: admin@aimate.com / admin1234
# 기본 키워드 40개
```

### Prisma Studio (GUI)
```powershell
npx prisma studio
# http://localhost:5555 에서 DB 직접 조회·수정
```

### 마이그레이션 상태 확인
```powershell
npx prisma migrate status
```

### Docker PostgreSQL 재시작
```powershell
cd c:\src\aimate_pms
docker compose down
docker compose up -d
```

## 주의사항
- `prisma migrate dev`는 기존 데이터를 보존합니다.
- `prisma db push`는 마이그레이션 파일을 생성하지 않습니다 (개발 전용).
- 스키마 변경 후 반드시 `npx prisma generate`로 클라이언트를 재생성하세요.
