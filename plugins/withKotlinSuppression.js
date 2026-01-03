const { withProjectBuildGradle } = require("expo/config-plugins");

module.exports = function withKotlinSuppression(config) {
  return withProjectBuildGradle(config, (config) => {
    if (
      !config.modResults.contents.includes(
        "suppressKotlinVersionCompatibilityCheck"
      )
    ) {
      config.modResults.contents += `
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
`;
    }
    return config;
  });
};
