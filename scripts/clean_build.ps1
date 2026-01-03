Write-Host "Cleaning Android Build..."

if (Test-Path "android\.gradle") {
    Remove-Item -Path "android\.gradle" -Recurse -Force
    Write-Host "Removed android/.gradle"
}

if (Test-Path "android\app\build") {
    Remove-Item -Path "android\app\build" -Recurse -Force
    Write-Host "Removed android/app/build"
}

if (Test-Path "android\build") {
    Remove-Item -Path "android\build" -Recurse -Force
    Write-Host "Removed android/build"
}

Write-Host "Running Gradle Clean..."
Set-Location android
./gradlew clean
Set-Location ..

Write-Host "Regenerating Android Project..."
npx expo prebuild --platform android --clean

Write-Host "Clean Build Setup Complete. You can now run 'npx expo run:android'"
