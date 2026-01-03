const fs = require("fs");
const path = require("path");

const buildGradlePath = path.join(
  "d:",
  "joeproj",
  "android",
  "app",
  "build.gradle"
);

try {
  let content = fs.readFileSync(buildGradlePath, "utf8");

  if (content.includes("pickFirst '**/libc++_shared.so'")) {
    console.log("Packaging options already set.");
    process.exit(0);
  }

  // Find android {
  const androidRegex = /android\s*\{/;
  const match = content.match(androidRegex);

  if (match) {
    const insertIndex = match.index + match[0].length;
    const patch = `
    packagingOptions {
        pickFirst '**/libc++_shared.so'
        pickFirst '**/libfbjni.so'
    }
      `;
    const newContent =
      content.slice(0, insertIndex) + patch + content.slice(insertIndex);
    fs.writeFileSync(buildGradlePath, newContent);
    console.log("Successfully patched packagingOptions");
  } else {
    console.log("android block not found");
  }
} catch (error) {
  console.error("Error patching file:", error);
  process.exit(1);
}
