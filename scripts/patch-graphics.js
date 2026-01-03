const fs = require("fs");
const path = require("path");

const targetFile = path.join(
  "d:",
  "joeproj",
  "node_modules",
  "react-native",
  "ReactCommon",
  "react",
  "renderer",
  "core",
  "graphicsConversions.h"
);

try {
  if (!fs.existsSync(targetFile)) {
    console.log("File not found:", targetFile);
    process.exit(1);
  }

  let content = fs.readFileSync(targetFile, "utf8");
  const oldStr = 'return std::format("{}%", dimension.value);';
  const newStr = 'return std::to_string(dimension.value) + "%";';

  if (content.includes(newStr)) {
    console.log("Already patched.");
    process.exit(0);
  }

  if (content.includes(oldStr)) {
    const newContent = content.replace(oldStr, newStr);
    fs.writeFileSync(targetFile, newContent);
    console.log("Successfully patched graphicsConversions.h");
  } else {
    console.log("Target string not found for patching.");
    process.exit(1);
  }
} catch (error) {
  console.error("Error:", error);
  process.exit(1);
}
