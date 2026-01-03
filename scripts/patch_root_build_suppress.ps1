$file = "android\build.gradle"
$content = @"

allprojects {
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            freeCompilerArgs += [
                "-P",
                "plugin:androidx.compose.compiler.plugins.kotlin:suppressKotlinVersionCompatibilityCheck=1.9.25"
            ]
        }
    }
}
"@

Add-Content -Path $file -Value $content
Write-Host "Added global Kotlin version suppression to android/build.gradle"
