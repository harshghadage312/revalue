# ==============================================================================
# ReValue Automated Test Suite Runner for Windows PowerShell
# ==============================================================================

Write-Host "Running ReValue Automated Test Suite..." -ForegroundColor Cyan

function Find-BestPython {
    $candidates = @("py -3.11", "python", "py -3.10", "py")
    foreach ($cand in $candidates) {
        $parts = $cand -split " "
        $exe = $parts[0]
        if (-not (Get-Command $exe -ErrorAction SilentlyContinue)) {
            continue
        }
        $oldEAP = $ErrorActionPreference
        $ErrorActionPreference = "SilentlyContinue"
        $pkgCheck = $null
        try {
            if ($parts.Length -gt 1) {
                $pkgCheck = & $parts[0] $parts[1] -c "try: import fastapi, pymongo, sklearn, pytest; print('OK')`nexcept: pass" 2>$null
            } else {
                $pkgCheck = & $parts[0] -c "try: import fastapi, pymongo, sklearn, pytest; print('OK')`nexcept: pass" 2>$null
            }
        } catch {}
        $ErrorActionPreference = $oldEAP

        if ($pkgCheck -match "OK") {
            return $cand
        }
    }
    return "python"
}

$pyCmd = Find-BestPython
$pyParts = $pyCmd -split " "
if ($pyParts.Length -gt 1) {
    & $pyParts[0] $pyParts[1] -m pytest backend/app/tests -v
} else {
    & $pyParts[0] -m pytest backend/app/tests -v
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[OK] All Backend and ML Integration Tests Passed Successfully!" -ForegroundColor Green
} else {
    Write-Host "`n[FAIL] Some tests encountered failures (Exit code: $LASTEXITCODE)." -ForegroundColor Red
    exit $LASTEXITCODE
}
