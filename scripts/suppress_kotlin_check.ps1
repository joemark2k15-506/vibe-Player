$file = "android\app\build.gradle"
$content = @"

tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
    kotlinOptions {
        freeCompilerArgs += [
            "-P",
            "plugin:androidx.compose.compiler.plugins.kotlin:suppressKotlinVersionCompatibilityCheck=1.9.25"
        ]
    }
}
"@

Add-Content -Path $file -Value $content
Write-Host "Added Kotlin version suppression to android/app/build.gradle"
