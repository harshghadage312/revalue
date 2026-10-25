# ==============================================================================
# ReValue Start Frontend Server Script for Windows PowerShell
# ==============================================================================

Write-Host "Starting ReValue React Frontend on http://localhost:5173 ..." -ForegroundColor Cyan

Push-Location frontend
npx vite --port 5173
Pop-Location
