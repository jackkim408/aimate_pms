# /wbs-test — WBS 핵심 로직 API 테스트

백엔드가 실행 중인 상태에서 WBS 진척도 롤업 로직을 검증합니다.

## 실행할 테스트 시나리오

### 1. 인증 토큰 획득
```powershell
$r = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" `
  -Method POST -Body '{"email":"admin@aimate.com","password":"admin1234"}' `
  -ContentType "application/json"
$h = @{ Authorization = "Bearer $($r.access)" }
```

### 2. 테스트 프로젝트 + 공정 생성
```powershell
$proj = Invoke-RestMethod -Uri "http://localhost:4000/api/projects" `
  -Method POST -Headers $h `
  -Body '{"name":"[TEST] 진척도 롤업 검증"}' -ContentType "application/json"

$parent = Invoke-RestMethod -Uri "http://localhost:4000/api/projects/$($proj.id)/tasks" `
  -Method POST -Headers $h `
  -Body '{"name":"상위 공정"}' -ContentType "application/json"

$child = Invoke-RestMethod -Uri "http://localhost:4000/api/projects/$($proj.id)/tasks" `
  -Method POST -Headers $h `
  -Body "{`"name`":`"하위 공정`",`"parentId`":$($parent.id)}" `
  -ContentType "application/json"
```

### 3. 액션 매핑 + 상태 변경
```powershell
$kws = Invoke-RestMethod -Uri "http://localhost:4000/api/keywords" -Method GET -Headers $h
$kwId = $kws[0].id

$action = Invoke-RestMethod -Uri "http://localhost:4000/api/tasks/$($child.id)/actions" `
  -Method POST -Headers $h `
  -Body "{`"keywordId`":$kwId,`"weight`":100,`"seqOrder`":1,`"status`":`"pending`"}" `
  -ContentType "application/json"

# in_progress → 50% 예상
Invoke-RestMethod -Uri "http://localhost:4000/api/actions/$($action.id)" `
  -Method PATCH -Headers $h `
  -Body '{"status":"in_progress"}' -ContentType "application/json" | Out-Null
```

### 4. 부모 공정 진척도 확인 (50%이어야 함)
```powershell
$tasks = Invoke-RestMethod -Uri "http://localhost:4000/api/projects/$($proj.id)/tasks" `
  -Method GET -Headers $h
$tasks | Select-Object wbsNumber, name, progress | Format-Table
```

### 5. 테스트 정리
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/projects/$($proj.id)" `
  -Method DELETE -Headers $h
Write-Host "테스트 완료 및 정리됨"
```

## 기대 결과
- 하위 공정 진척도: 50% (in_progress 상태)
- 상위 공정 진척도: 50% (자동 롤업)
- 부모 공정에 액션 매핑 시도 시 HTTP 400 반환
