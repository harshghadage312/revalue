# ==============================================================================
# ReValue Setup Script for Windows PowerShell
# ==============================================================================

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "   ReValue - AI Resale Marketplace Setup Script" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Dynamic Python Interpreter Discovery
Write-Host "`n[1/5] Detecting installed Python environment..." -ForegroundColor Yellow

function Find-BestPython {
    $candidates = @("py -3.11", "python", "py -3.10", "py")
    $fallback = $null

    foreach ($cand in $candidates) {
        $parts = $cand -split " "
        $exe = $parts[0]
        if (-not (Get-Command $exe -ErrorAction SilentlyContinue)) {
            continue
        }

        $oldEAP = $ErrorActionPreference
        $ErrorActionPreference = "SilentlyContinue"
        $verCheck = $null
        $pkgCheck = $null

        try {
            if ($parts.Length -gt 1) {
                $verCheck = & $parts[0] $parts[1] -c "import sys; print(str(sys.version_info[0]) + '.' + str(sys.version_info[1]))" 2>$null
                $pkgCheck = & $parts[0] $parts[1] -c "try: import fastapi, pymongo, sklearn, pytest; print('OK')`nexcept: pass" 2>$null
            } else {
                $verCheck = & $parts[0] -c "import sys; print(str(sys.version_info[0]) + '.' + str(sys.version_info[1]))" 2>$null
                $pkgCheck = & $parts[0] -c "try: import fastapi, pymongo, sklearn, pytest; print('OK')`nexcept: pass" 2>$null
            }
        } catch {
            # Ignore detection errors
        }
        $ErrorActionPreference = $oldEAP

        if ($pkgCheck -match "OK") {
            Write-Host "Selected Python ($cand) [Version $verCheck] with full ML and testing stack." -ForegroundColor Green
            return $cand
        }
        if ($verCheck -and -not $fallback) {
            $fallback = $cand
        }
    }

    if ($fallback) {
        Write-Host "Notice: Using available Python ($fallback). Some ML or testing packages may need installation." -ForegroundColor Yellow
        return $fallback
    }

    return $null
}

$pyCmd = Find-BestPython
if (-not $pyCmd) {
    Write-Host "ERROR: No valid Python interpreter found on PATH or via py launcher." -ForegroundColor Red
    exit 1
}

# 2. Check Node.js & npm
Write-Host "`n[2/5] Checking Node.js and npm..." -ForegroundColor Yellow
if (Get-Command "node" -ErrorAction SilentlyContinue) {
    $nodeVer = node --version
    $npmVer = npm --version
    Write-Host "Node.js $nodeVer and npm $npmVer detected." -ForegroundColor Green
} else {
    Write-Host "ERROR: Node.js is not found on PATH." -ForegroundColor Red
    exit 1
}

# 3. Environment configuration (.env)
Write-Host "`n[3/5] Checking environment configuration (.env)..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "Created .env from .env.example with default local values." -ForegroundColor Green
    } else {
        Write-Host "ERROR: Neither .env nor .env.example exists." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host ".env configuration file already exists." -ForegroundColor Green
}

# 4. Train/Verify Random Forest ML Model
Write-Host "`n[4/5] Training/Verifying Random Forest Resale Price Model..." -ForegroundColor Yellow
$pyParts = $pyCmd -split " "
if ($pyParts.Length -gt 1) {
    & $pyParts[0] $pyParts[1] -m ml.price_prediction.train
} else {
    & $pyParts[0] -m ml.price_prediction.train
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Random Forest model training failed with exit code $LASTEXITCODE." -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "Random Forest price estimation model verified and artifacts ready." -ForegroundColor Green

# 5. Build Frontend assets
Write-Host "`n[5/5] Building Frontend..." -ForegroundColor Yellow
Push-Location frontend
try {
    npx vite build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Frontend production build failed with exit code $LASTEXITCODE." -ForegroundColor Red
        Pop-Location
        exit $LASTEXITCODE
    }
    Write-Host "Frontend build completed successfully." -ForegroundColor Green
} finally {
    Pop-Location
}

Write-Host "`n====================================================" -ForegroundColor Green
Write-Host "   ReValue Setup Completed Successfully!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host "To start the application:"
Write-Host "  1. Backend API:     .\scripts\start-backend.ps1"
Write-Host "  2. Frontend Client: .\scripts\start-frontend.ps1"
Write-Host "  3. Seed Dev Data:   $pyCmd scripts/seed_dev.py"
Write-Host "  4. Run Test Suite:  .\scripts\run-tests.ps1"
