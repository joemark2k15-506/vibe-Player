$content = Get-Content android\build.gradle
$content = $content -replace "findProperty\('android.kotlinVersion'\) \?: '1.9.25'", "'1.9.24'"
$content | Set-Content android\build.gradle
Write-Host "Patched android/build.gradle to force Kotlin 1.9.24"
