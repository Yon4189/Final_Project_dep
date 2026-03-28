# set-ip.ps1
# This script automatically detects your local IP address and updates the .env files
# for both the backend and mobile_app to ensure connectivity.

# 1. Get the local IP address (preferring Wi-Fi or Ethernet, ignoring 169.254.x.x)
$localIp = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    ($_.InterfaceAlias -like '*Wi-Fi*' -or $_.InterfaceAlias -like '*Ethernet*') -and 
    $_.IPAddress -notlike '169.254.*'
} | Select-Object -First 1 -ExpandProperty IPAddress

if (-not $localIp) {
    # Fallback: Get any non-loopback IPv4
    $localIp = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne '127.0.0.1' } | Select-Object -First 1 -ExpandProperty IPAddress
}

if (-not $localIp) {
    Write-Error "Could not detect a local IP address."
    exit 1
}

Write-Host "Detected Local IP: $localIp" -ForegroundColor Cyan

# 2. Paths to .env files
$backendEnv = "backend/.env"
$mobileEnv = "mobile_app/.env"

# 3. Update backend/.env
if (Test-Path $backendEnv) {
    Write-Host "Updating $backendEnv..."
    $content = Get-Content $backendEnv
    $content = $content -replace '^REVERB_HOST=.*', "REVERB_HOST=${localIp}"
    $content = $content -replace '^APP_URL=.*', "APP_URL=http://${localIp}:8000"
    $content | Set-Content $backendEnv
    Write-Host "Done." -ForegroundColor Green
} else {
    Write-Warning "Backend .env not found at $backendEnv"
}

# 4. Update mobile_app/.env
if (Test-Path $mobileEnv) {
    Write-Host "Updating $mobileEnv..."
    $content = Get-Content $mobileEnv
    $content = $content -replace '^EXPO_PUBLIC_API_IP=.*', "EXPO_PUBLIC_API_IP=${localIp}"
    $content = $content -replace '^EXPO_PUBLIC_API_URL=.*', "EXPO_PUBLIC_API_URL=http://${localIp}:8000/api"
    $content = $content -replace '^EXPO_PUBLIC_REVERB_HOST=.*', "EXPO_PUBLIC_REVERB_HOST=${localIp}"
    $content | Set-Content $mobileEnv
    Write-Host "Done." -ForegroundColor Green
} else {
    Write-Warning "Mobile .env not found at $mobileEnv"
}

Write-Host "`nProject IP successfully updated to $localIp" -ForegroundColor Cyan
Write-Host "Please restart your backend (artisan serve) and mobile app (expo start) if they are running."
