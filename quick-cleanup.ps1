# EP Group Project Quick Cleanup
Write-Host "🧹 Starting cleanup..." -ForegroundColor Green

# Get initial stats
$initialFiles = (Get-ChildItem -Recurse -File | Measure-Object).Count
Write-Host "Initial files: $initialFiles" -ForegroundColor Yellow

# Remove node_modules
if (Test-Path "node_modules") {
    Write-Host "Removing node_modules..." -ForegroundColor Red
    Remove-Item "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
}

# Remove .next
if (Test-Path ".next") {
    Write-Host "Removing .next..." -ForegroundColor Red
    Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
}

# Remove deployment.zip
if (Test-Path "deployment.zip") {
    Write-Host "Removing deployment.zip..." -ForegroundColor Red
    Remove-Item "deployment.zip" -Force -ErrorAction SilentlyContinue
}

# Remove duplicate SQL files
$sqlFiles = @("cleanup_stock_tables.sql", "force_cleanup_stock.sql", "020_advanced_stock_management_system.sql", "FINAL_MIGRATION.sql")
foreach ($file in $sqlFiles) {
    if (Test-Path $file) {
        Write-Host "Removing $file..." -ForegroundColor Red
        Remove-Item $file -Force -ErrorAction SilentlyContinue
    }
}

# Get final stats
Start-Sleep -Seconds 2
$finalFiles = (Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
$removed = $initialFiles - $finalFiles

Write-Host "✅ Cleanup completed!" -ForegroundColor Green
Write-Host "Files removed: $removed" -ForegroundColor Cyan
Write-Host "Final files: $finalFiles" -ForegroundColor Cyan