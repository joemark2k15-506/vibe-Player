const {
  withProjectBuildGradle,
  withAppBuildGradle,
} = require("@expo/config-plugins");

module.exports = function withAndroidFFmpeg(config) {
  // 1. Root project configuration: ADD EXTS AND REPOS
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      let contents = config.modResults.contents;

      // Force Version Strategy into root ext block
      const ffmpegExts = `
    ext {
        ffmpegKitPackage = "full-gpl"
        ffmpegKitVersion = "6.0.LTS"
    }
`;
      if (!contents.includes("ffmpegKitPackage")) {
        contents = contents.replace(
          "buildscript {",
          ffmpegExts + "\nbuildscript {"
        );
      }

      // Add Repositories to allprojects safely
      const aliyunRepo =
        'maven { url "https://maven.aliyun.com/repository/public" }';
      if (!contents.includes("maven.aliyun.com")) {
        // Simple replacement to avoid regex greediness issues
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

  // 2. App-level packaging options
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      let contents = config.modResults.contents;

      const packagingOptions = `
    packagingOptions {
        pickFirst '**/libc++_shared.so'
        pickFirst '**/libffmpegkit_abidetect.so'
    }
`;

      if (
        contents.includes("android {") &&
        !contents.includes("libc++_shared.so")
      ) {
        contents = contents.replace(
          "android {",
          "android {" + packagingOptions
        );
      }

      config.modResults.contents = contents;
    }
    return config;
  });
};
