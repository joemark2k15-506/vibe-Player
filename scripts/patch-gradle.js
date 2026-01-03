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

  if (content.includes('cppFlags "-std=c++20"')) {
    console.log("Already patched.");
    process.exit(0);
  }

  // Look for defaultConfig {
  const patch = `
        externalNativeBuild {
            cmake {
                cppFlags "-std=c++20"
            }
        }`;

  const newContent = content.replace(
    /defaultConfig\s*\{/,
    `defaultConfig {${patch}`
  );

  fs.writeFileSync(buildGradlePath, newContent);
  console.log("Successfully patched build.gradle");
} catch (error) {
  console.error("Error patching file:", error);
  process.exit(1);
}
