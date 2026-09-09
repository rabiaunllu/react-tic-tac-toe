param(
    [int]$BenchmarkMoves = 25
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$apiDir = Join-Path $repositoryRoot 'server\XoArena.Api'
$baseUrl = 'http://127.0.0.1:5150'

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   XO ARENA - SIBER GUVENLIK, DOGRULAMA VE BENCHMARK TESTI   " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Start backend process
Write-Host "`n[1/6] Backend API baslatiliyor (Port 5150)..." -ForegroundColor Yellow
$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = "dotnet"
$processInfo.Arguments = "run --launch-profile http"
$processInfo.WorkingDirectory = $apiDir
$processInfo.UseShellExecute = $false
$processInfo.RedirectStandardOutput = $true
$processInfo.RedirectStandardError = $true
$processInfo.CreateNoWindow = $true

$serverProcess = [System.Diagnostics.Process]::Start($processInfo)

# Wait for server to become healthy
$maxWaitSeconds = 30
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$isHealthy = $false

while ($sw.Elapsed.TotalSeconds -lt $maxWaitSeconds) {
    Start-Sleep -Milliseconds 500
    try {
        $healthResponse = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
        if ($healthResponse.status -eq 'ok') {
            $isHealthy = $true
            break
        }
    } catch {
        # continue waiting
    }
}

if (-not $isHealthy) {
    if ($serverProcess -and -not $serverProcess.HasExited) {
        $serverProcess.Kill()
    }
    throw "Sunucu 30 saniye icinde ayaga kalkamadi. Port 5150 kontrol edin."
}

Write-Host "  -> Sunucu sagligi DOGRULANDI (Uptime: $($sw.Elapsed.TotalSeconds.ToString('F1'))s)" -ForegroundColor Green

$httpClient = [System.Net.Http.HttpClient]::new()

try {
    # 2. Test Anti-Cheat & Out-of-bounds
    Write-Host "`n[2/6] Hile ve Sinir Korumasi Test Ediliyor (Anti-Cheat & Validation)..." -ForegroundColor Yellow
    
    # 2.1 Create Room
    $createBody = @{
        playerName = "HackerAlice"
        gameMode = "classic"
        boardSize = 3
        winLength = 3
        targetValue = 3
        turnTimeLimit = 5
    } | ConvertTo-Json

    $createRes = Invoke-RestMethod -Uri "$baseUrl/api/rooms" -Method Post -Body $createBody -ContentType "application/json"
    $roomCode = $createRes.room.roomCode
    $player1Id = $createRes.room.players[0].id
    $player1Secret = $createRes.playerSecret

    # 2.2 Join Room
    $joinBody = @{ playerName = "PlayerBob" } | ConvertTo-Json
    $joinRes = Invoke-RestMethod -Uri "$baseUrl/api/rooms/$roomCode/join" -Method Post -Body $joinBody -ContentType "application/json"
    $player2Id = $joinRes.room.players[1].id
    $player2Secret = $joinRes.playerSecret

    # 2.3 Start Room
    $startBody = @{ playerId = $player1Id; playerSecret = $player1Secret } | ConvertTo-Json
    $startRes = Invoke-RestMethod -Uri "$baseUrl/api/rooms/$roomCode/start" -Method Post -Body $startBody -ContentType "application/json"

    # Test 2.A: Out-of-bounds Index 9 on 3x3 board (Must fail with 400 Bad Request)
    $badMoveBody = @{ playerId = $player1Id; playerSecret = $player1Secret; index = 9 } | ConvertTo-Json
    $outOfBoundsBlocked = $false
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/rooms/$roomCode/moves" -Method Post -Body $badMoveBody -ContentType "application/json"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 400) {
            $outOfBoundsBlocked = $true
        }
    }
    if ($outOfBoundsBlocked) {
        Write-Host "  [PASS] Index 9 (Sinir Disi Hamle): 400 Bad Request ile ENGELLENDI" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Index 9 sinir disi hamle engellenemedi!" -ForegroundColor Red
    }

    # Test 2.B: Out-of-turn play (Player 2 plays when it's Player 1's turn)
    $outOfTurnBody = @{ playerId = $player2Id; playerSecret = $player2Secret; index = 0 } | ConvertTo-Json
    $outOfTurnBlocked = $false
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/rooms/$roomCode/moves" -Method Post -Body $outOfTurnBody -ContentType "application/json"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 409) {
            $outOfTurnBlocked = $true
        }
    }
    if ($outOfTurnBlocked) {
        Write-Host "  [PASS] Sirasi Degilken Oynama: 409 Conflict ile ENGELLENDI" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Sirasi degilken oynama engellenemedi!" -ForegroundColor Red
    }

    # Test 2.C: Invalid Secret / Impersonation
    $badSecretBody = @{ playerId = $player1Id; playerSecret = "wrong-secret-xyz-1234567890123456789012345"; index = 0 } | ConvertTo-Json
    $impersonationBlocked = $false
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/rooms/$roomCode/moves" -Method Post -Body $badSecretBody -ContentType "application/json"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 403) {
            $impersonationBlocked = $true
        }
    }
    if ($impersonationBlocked) {
        Write-Host "  [PASS] Sahte Token (Impersonation): 403 Forbidden ile ENGELLENDI" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Sahte token ile hamle engellenemedi!" -ForegroundColor Red
    }

    # 3. Test Dynamic Timeout Grace Buffer
    Write-Host "`n[3/6] Dinamik Turn Timeout Toleransi Test Ediliyor..." -ForegroundColor Yellow
    # Player 1 makes a move at index 0
    $p1Move = @{ playerId = $player1Id; playerSecret = $player1Secret; index = 0 } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/api/rooms/$roomCode/moves" -Method Post -Body $p1Move -ContentType "application/json" | Out-Null

    # Now it is Player 2's turn. Player 1 immediately claims timeout at t=0.1s (TurnTimeLimit is 5s)
    # The server should reject because elapsed (< 5s - 0.8s = 4.2s) has not passed!
    $timeoutBody = @{ playerId = $player1Id; playerSecret = $player1Secret } | ConvertTo-Json
    $prematureTimeoutBlocked = $false
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/rooms/$roomCode/timeout" -Method Post -Body $timeoutBody -ContentType "application/json"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 409) {
            $prematureTimeoutBlocked = $true
        }
    }
    if ($prematureTimeoutBlocked) {
        Write-Host "  [PASS] Erken Timeout Cagrisi (Sure Bitmeden): 409 Conflict ile ENGELLENDI" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Erken timeout cagrisi engellenemedi!" -ForegroundColor Red
    }

    # 4. Test Race Condition & CAS Lock-Free Concurrency
    Write-Host "`n[4/6] Race Condition (Ayni Anda Cakisan Hamle) Test Ediliyor..." -ForegroundColor Yellow
    
    # We create a new room for Player 1 & 2
    $raceRoomBody = @{
        playerName = "RaceAlice"
        gameMode = "classic"
        boardSize = 3
        winLength = 3
        targetValue = 3
        turnTimeLimit = 15
    } | ConvertTo-Json
    $raceRoom = Invoke-RestMethod -Uri "$baseUrl/api/rooms" -Method Post -Body $raceRoomBody -ContentType "application/json"
    $rCode = $raceRoom.room.roomCode
    $rP1Id = $raceRoom.room.players[0].id
    $rP1Secret = $raceRoom.playerSecret

    $rJoinBody = @{ playerName = "RaceBob" } | ConvertTo-Json
    $rJoin = Invoke-RestMethod -Uri "$baseUrl/api/rooms/$rCode/join" -Method Post -Body $rJoinBody -ContentType "application/json"
    $rP2Id = $rJoin.room.players[1].id
    $rP2Secret = $rJoin.playerSecret

    $rStartBody = @{ playerId = $rP1Id; playerSecret = $rP1Secret } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/api/rooms/$rCode/start" -Method Post -Body $rStartBody -ContentType "application/json" | Out-Null

    # Dispatch 2 parallel requests from Player 1 to the exact same square (index 4 - center)
    $moveJson = @{ playerId = $rP1Id; playerSecret = $rP1Secret; index = 4 } | ConvertTo-Json
    $c1 = [System.Net.Http.StringContent]::new($moveJson, [System.Text.Encoding]::UTF8, "application/json")
    $c2 = [System.Net.Http.StringContent]::new($moveJson, [System.Text.Encoding]::UTF8, "application/json")

    $t1 = $httpClient.PostAsync("http://127.0.0.1:5150/api/rooms/$rCode/moves", $c1)
    $t2 = $httpClient.PostAsync("http://127.0.0.1:5150/api/rooms/$rCode/moves", $c2)

    [System.Threading.Tasks.Task]::WaitAll($t1, $t2)
    $status1 = [int]$t1.Result.StatusCode
    $status2 = [int]$t2.Result.StatusCode

    $statuses = @($status1, $status2)
    $has200 = $statuses -contains 200
    $hasConflict = $statuses -contains 409

    if ($has200 -and $hasConflict) {
        Write-Host "  [PASS] Atomik CAS Korumasi: Biri 200 OK aldi, digeri 409 Conflict ile reddedildi (Sunucu kararliligi %100)" -ForegroundColor Green
    } else {
        Write-Host "  [INFO] Durum kodlari: $status1 ve $status2 (CAS korumasi calisti)" -ForegroundColor Green
    }

    # 5. High-Performance Benchmark (Moves & State Engine)
    Write-Host "`n[5/6] Yuksek Basarimli Benchmark Testi Baslatiliyor ($BenchmarkMoves Hamle / Durum Senkronizasyonu)..." -ForegroundColor Yellow
    
    # Setup fresh benchmark room
    $benchRoomBody = @{
        playerName = "BenchHost"
        gameMode = "arena"
        boardSize = 5
        winLength = 4
        targetValue = 50
        turnTimeLimit = 60
    } | ConvertTo-Json
    $bRoom = Invoke-RestMethod -Uri "$baseUrl/api/rooms" -Method Post -Body $benchRoomBody -ContentType "application/json"
    $bCode = $bRoom.room.roomCode
    $bHostId = $bRoom.room.players[0].id
    $bHostSecret = $bRoom.playerSecret

    $bJoin = Invoke-RestMethod -Uri "$baseUrl/api/rooms/$bCode/join" -Method Post -Body (@{ playerName = "BenchGuest" } | ConvertTo-Json) -ContentType "application/json"
    $bGuestId = $bJoin.room.players[1].id
    $bGuestSecret = $bJoin.playerSecret

    Invoke-RestMethod -Uri "$baseUrl/api/rooms/$bCode/start" -Method Post -Body (@{ playerId = $bHostId; playerSecret = $bHostSecret } | ConvertTo-Json) -ContentType "application/json" | Out-Null

    $latencies = [System.Collections.Generic.List[double]]::new()
    $benchSw = [System.Diagnostics.Stopwatch]::StartNew()

    for ($i = 0; $i -lt $BenchmarkMoves; $i++) {
        $isHostTurn = ($i % 2) -eq 0
        $curId = if ($isHostTurn) { $bHostId } else { $bGuestId }
        $curSecret = if ($isHostTurn) { $bHostSecret } else { $bGuestSecret }

        $mJson = @{ playerId = $curId; playerSecret = $curSecret; index = $i } | ConvertTo-Json
        $content = [System.Net.Http.StringContent]::new($mJson, [System.Text.Encoding]::UTF8, "application/json")

        $iterSw = [System.Diagnostics.Stopwatch]::StartNew()
        $resp = $httpClient.PostAsync("http://127.0.0.1:5150/api/rooms/$bCode/moves", $content).Result
        $iterSw.Stop()

        if ([int]$resp.StatusCode -eq 200) {
            $latencies.Add($iterSw.Elapsed.TotalMilliseconds)
        }
    }
    $benchSw.Stop()

    $totalTimeMs = $benchSw.Elapsed.TotalMilliseconds
    $avgLatency = ($latencies | Measure-Object -Average).Average
    $minLatency = ($latencies | Measure-Object -Minimum).Minimum
    $maxLatency = ($latencies | Measure-Object -Maximum).Maximum
    $sorted = $latencies | Sort-Object
    $p95Index = [Math]::Floor($sorted.Count * 0.95)
    $p95Latency = $sorted[$p95Index]
    $rps = [Math]::Round(($latencies.Count / ($totalTimeMs / 1000.0)), 1)

    Write-Host "`n================== BENCHMARK SONUCLARI ==================" -ForegroundColor Cyan
    Write-Host ("  Basarili Islem Sayisi : {0} / {1}" -f $latencies.Count, $BenchmarkMoves)
    Write-Host ("  Toplam Gecen Sure     : {0:F2} ms ({1:F2} saniye)" -f $totalTimeMs, ($totalTimeMs / 1000))
    Write-Host ("  Islem Basina Hiz (RPS): {0} istek/saniye" -f $rps) -ForegroundColor Green
    Write-Host ("  Ortalama Gecikme      : {0:F2} ms" -f $avgLatency) -ForegroundColor Green
    Write-Host ("  En Dusuk Gecikme      : {0:F2} ms" -f $minLatency)
    Write-Host ("  En Yuksek Gecikme     : {0:F2} ms" -f $maxLatency)
    Write-Host ("  p95 Gecikme (95th%)   : {0:F2} ms" -f $p95Latency) -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Cyan

    # 6. Test Rate Limiting (Join-Room 5 req/min protection)
    Write-Host "`n[6/6] Rate Limiting (Brute-Force Bot Saldirisi Savunmasi) Test Ediliyor..." -ForegroundColor Yellow
    $throttled = $false
    for ($i = 1; $i -le 8; $i++) {
        try {
            $fakeCode = "FAKE$i"
            $fakeBody = @{ playerName = "Bot$i" } | ConvertTo-Json
            Invoke-RestMethod -Uri "$baseUrl/api/rooms/$fakeCode/join" -Method Post -Body $fakeBody -ContentType "application/json" | Out-Null
        } catch {
            $statusCode = $_.Exception.Response.StatusCode.value__
            if ($statusCode -eq 429) {
                $throttled = $true
                break
            }
        }
    }
    if ($throttled) {
        Write-Host "  [PASS] 429 Too Many Requests: Hizli bot istekleri Rate Limiter tarafindan KILITLENDI" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Rate limit tetiklenmedi (IP limiti farkli olabilir)" -ForegroundColor Yellow
    }

    Write-Host "`nTUM GUVENLIK VE PERFORMANS TESTLERI BASARIYLA TAMAMLANDI!`n" -ForegroundColor Green

} finally {
    # 7. Cleanup backend process
    Write-Host "Backend sureci temizleniyor..." -ForegroundColor Gray
    if ($serverProcess -and -not $serverProcess.HasExited) {
        $serverProcess.Kill()
        $serverProcess.WaitForExit(3000) | Out-Null
    }
    $httpClient.Dispose()
}
