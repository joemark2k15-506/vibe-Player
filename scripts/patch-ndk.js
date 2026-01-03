const fs = require("fs");
const path = require("path");

const buildGradlePath = path.join("d:", "joeproj", "android", "build.gradle");

try {
  let content = fs.readFileSync(buildGradlePath, "utf8");

  if (content.includes('ndkVersion = "26.1.10909125"')) {
    console.log("NDK version already set.");
    process.exit(0);
  }

  // Insert inside buildscript {
  const patch = `
    ext {
        buildToolsVersion = "35.0.0"
        minSdkVersion = 24
        compileSdkVersion = 35
        targetSdkVersion = 35
        ndkVersion = "26.1.10909125"
    }
  `;

  // We find "buildscript {" and insert after it, but we need to receive the existing valid closures.
  // Actually, easiest is to prepend it or put it in the top level 'buildscript' block.
  // Or just put it in `ext` block if it exists. content shows no ext block in buildscript.

  const buildscriptRegex = /buildscript\s*\{/;
  const match = content.match(buildscriptRegex);

  if (match) {
    const insertIndex = match.index + match[0].length;
    const newContent =
      content.slice(0, insertIndex) + patch + content.slice(insertIndex);
    fs.writeFileSync(buildGradlePath, newContent);
    console.log("Successfully set NDK version in build.gradle");
  } else {
    console.log("buildscript block not found");
  }
} catch (error) {
  console.error("Error patching file:", error);
  process.exit(1);
}
