# /check — 전체 코드 품질 검사

프론트엔드와 백엔드 TypeScript 컴파일을 모두 확인합니다.

## 실행 순서

### 1. 프론트엔드 타입 체크
```powershell
cd c:\src\aimate_pms\frontend
npx tsc --noEmit
```

### 2. 백엔드 타입 체크
```powershell
cd c:\src\aimate_pms\backend
npx tsc --noEmit
```

## 결과 해석
- 출력 없음 = 오류 없음 ✅
- 오류 있으면 즉시 수정 후 다시 실행

## 추가 검사 항목 (선택)
- Prisma 스키마 유효성: `npx prisma validate`
- 누락된 migration: `npx prisma migrate status`
