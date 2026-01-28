# build-check.ps1

# Step 1: Concurrently run front and back builds
Write-Host "Starting build process..."
$concurrentCommand = 'concurrently -p "[ {name} ]" -n "BCK,FNT" -c "bgGreen.bold,bgBlue.bold" "npm run build:back" "npm run build:front"'
Invoke-Expression $concurrentCommand

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build process failed. Exiting..."
    exit 1
}

# Step 2: Navigate to back/dist directory
Set-Location -Path .\back\dist

# Step 3: Run node index.js
Write-Host "Running backend server, please wait while the process is checked..."
$process = Start-Process -FilePath "node" -ArgumentList "index.js" -PassThru

# Step 4: Wait for 10 seconds
Start-Sleep -Seconds 10


# Step 5: Check if the process is still running (indicating success)
if ($process.HasExited) {
    Write-Host "Build check failed: Backend process terminated unexpectedly."
    exit 1
} else {
    Write-Host "Build check succeeded"
    # Optionally kill the backend process if required
    Stop-Process -Id $process.Id
    exit 0
}