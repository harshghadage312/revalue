# ==============================================================================
# ReValue Start Backend Server Script for Windows PowerShell
# ==============================================================================

Write-Host "Starting ReValue FastAPI Backend Server on http://localhost:8000 ..." -ForegroundColor Cyan
Write-Host "API Documentation available at: http://localhost:8000/api/docs" -ForegroundColor Green

$env:PYTHONPATH = "backend;."

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
                $pkgCheck = & $parts[0] $parts[1] -c "try: import fastapi, pymongo, sklearn; print('OK')`nexcept: pass" 2>$null
            } else {
                $pkgCheck = & $parts[0] -c "try: import fastapi, pymongo, sklearn; print('OK')`nexcept: pass" 2>$null
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
    & $pyParts[0] $pyParts[1] -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
} else {
    & $pyParts[0] -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
}
