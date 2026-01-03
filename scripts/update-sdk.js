const fs = require("fs");
const path = require("path");

const buildGradlePath = path.join("d:", "joeproj", "android", "build.gradle");

try {
  let content = fs.readFileSync(buildGradlePath, "utf8");

  // We want to replace the block we added or update it.
  // Since we are running this script again, we'll just overwrite the file content logic or regex replace.

  if (
    content.includes('buildToolsVersion = "35.0.0"') &&
    content.includes("compileSdkVersion = 35")
  ) {
    const newContent = content
      .replace('buildToolsVersion = "35.0.0"', 'buildToolsVersion = "36.0.0"')
      .replace("compileSdkVersion = 35", "compileSdkVersion = 36")
      .replace("targetSdkVersion = 35", "targetSdkVersion = 36");

    fs.writeFileSync(buildGradlePath, newContent);
    console.log("Successfully updated SDK versions to 36");
  } else {
    console.log(
      "Pattern not found to update, or checking manual content needed."
    );
    // If we can't find the exact string, we might have already updated it or the file changed.
    // Let's fallback to regex
    const replaced = content
      .replace(/compileSdkVersion = \d+/g, "compileSdkVersion = 36")
      .replace(/targetSdkVersion = \d+/g, "targetSdkVersion = 36")
      .replace(
        /buildToolsVersion = "\d+\.\d+\.\d+"/g,
        'buildToolsVersion = "36.0.0"'
      );
    if (replaced !== content) {
      fs.writeFileSync(buildGradlePath, replaced);
      console.log("Regex updated SDK versions to 36");
    } else {
      console.log("No changes made.");
    }
  }
} catch (error) {
  console.error("Error patching file:", error);
  process.exit(1);
}
