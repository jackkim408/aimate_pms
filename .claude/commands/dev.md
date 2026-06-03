# /dev — 개발 환경 시작

다음 순서로 개발 환경을 시작하세요.

## 1. PostgreSQL (Docker)
```powershell
docker compose up -d
```
컨테이너가 이미 실행 중이면 건너뜁니다.

## 2. 포트 충돌 확인 및 기존 프로세스 종료
```powershell
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
```

## 3. 백엔드 실행 (포트 4000)
`c:\src\aimate_pms\backend` 디렉터리에서:
```powershell
npm run dev
```
`🚀 Server running on http://localhost:4000` 메시지 확인 후 프론트엔드 시작.

## 4. 프론트엔드 실행 (포트 3000)
`c:\src\aimate_pms\frontend` 디렉터리에서:
```powershell
npm run dev
```

## 5. Health Check
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/health"
```
`status: ok` 응답 확인.

## 접속 정보
- 앱: http://localhost:3000
- 백엔드: http://localhost:4000
- 테스트 계정: admin@aimate.com / admin1234
