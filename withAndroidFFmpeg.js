const {
  withProjectBuildGradle,
  withAppBuildGradle,
  withDangerousMod,
  withGradleProperties,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withAndroidFFmpeg(config) {
  // 1. Root project configuration: ADD EXTS AND REPOS
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      let contents = config.modResults.contents;

      // UPDATE or ADD ffmpegKitPackage
      if (contents.includes("ffmpegKitPackage =")) {
        // Force update to min-gpl
        console.log("Updating existing ffmpegKitPackage to min-gpl");
        contents = contents.replace(
          /ffmpegKitPackage\s*=\s*".*"/,
          'ffmpegKitPackage = "min-gpl"'
        );
      } else {
        // Append
        console.log("Appending ffmpegKitPackage (min-gpl)");
        const ffmpegExts = `
    ext {
        ffmpegKitPackage = "min-gpl"
        ffmpegKitVersion = "6.0.LTS"
    }
`;
        contents = contents.replace(
          "buildscript {",
          ffmpegExts + "\nbuildscript {"
        );
      }

      // Add Repositories
      const aliyunRepo =
        'maven { url "https://maven.aliyun.com/repository/public" }';
      if (!contents.includes("maven.aliyun.com")) {
        console.log("Adding Aliyun repo");
        contents = contents.replace(
          "allprojects {",
          "allprojects {\n    repositories {\n        " +
            aliyunRepo +
            "\n        mavenCentral()\n    }"
        );
      }

      config.modResults.contents = contents;
    }
    return config;
  });

  // 2. App-level packaging options and ABI filters
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      let contents = config.modResults.contents;

      // Ensure Packaging Options
      if (!contents.includes("pickFirst '**/libc++_shared.so'")) {
        console.log("Adding packagingOptions for libc++_shared.so");
        const packagingOptions = `
    packagingOptions {
        pickFirst '**/libc++_shared.so'
        pickFirst '**/libffmpegkit_abidetect.so'
    }
`;
        // Inject into android tag
        contents = contents.replace(
          "android {",
          "android {" + packagingOptions
        );
      }

      // Ensure ABI Filters (The critical size fix)
      if (!contents.includes("abiFilters 'armeabi-v7a', 'arm64-v8a'")) {
        console.log("Injecting ABI Filters (armeabi-v7a, arm64-v8a)");
        const abiFilters = `
    defaultConfig {
        ndk {
            abiFilters 'armeabi-v7a', 'arm64-v8a'
        }
    }
`;
        // Inject into android tag (it's safe to have multiple defaultConfig blocks, they merge)
        contents = contents.replace("android {", "android {" + abiFilters);
      } else {
        console.log("ABI Filters already present");
      }

      config.modResults.contents = contents;
    }
    return config;
  });

  // 3. Inject Proguard Rules (Safeguard for Release Builds)
  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const file = path.join(
        config.modRequest.platformProjectRoot,
        "app/proguard-rules.pro"
      );
      if (fs.existsSync(file)) {
        let contents = fs.readFileSync(file, "utf8");
        if (!contents.includes("expo.modules.filesystem")) {
          console.log("Injecting Proguard Rules for Metadata Parsers");
          contents += `
# Added by withAndroidFFmpeg.js
-keep class expo.modules.filesystem.** { *; }
-keep class expo.modules.medialibrary.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.swmansion.reanimated.** { *; }
# Keep Base64 and Buffer polyfills if reachable via reflection
-keep class com.facebook.react.modules.** { *; }
`;
          fs.writeFileSync(file, contents);
        }
      } else {
        console.warn("proguard-rules.pro not found, skipping rule injection");
      }
      return config;
    },
  ]);

  // 4. Inject into gradle.properties (The Robust Way)
  config = withGradleProperties(config, (config) => {
    const key = "ffmpegKitPackage";
    const value = "min-gpl";
    const props = config.modResults;
    const index = props.findIndex((p) => p.key === key);
    if (index >= 0) {
      props[index].value = value;
    } else {
      props.push({ type: "property", key, value });
    }

    // Also inject version just in case
    const verKey = "ffmpegKitVersion";
    const verValue = "6.0.LTS";
    const verIndex = props.findIndex((p) => p.key === verKey);
    if (verIndex >= 0) {
      props[verIndex].value = verValue;
    } else {
      props.push({ type: "property", key: verKey, value: verValue });
    }

    return config;
  });

  return config;
};
