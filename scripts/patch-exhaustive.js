const fs = require("fs");
const path = require("path");

const listFile = path.join("d:", "joeproj", "all_found_headers.txt");

try {
  const buffer = fs.readFileSync(listFile);
  let listContent = "";

  // Check for UTF-16 LE BOM (FF FE)
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    listContent = buffer.toString("utf16le", 2);
  }
  // Check for UTF-16 BE BOM (FE FF)
  else if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    listContent = buffer.toString("utf16be", 2);
  }
  // Check for UTF-8 BOM (EF BB BF)
  else if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    listContent = buffer.toString("utf8", 3);
  } else {
    listContent = buffer.toString("utf8");
  }

  const headers = listContent
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[^\w\\]+/, ""))
    .filter((line) => line.length > 0 && fs.existsSync(line));

  // Add node_modules instance
  const nodeModulesHeader = path.join(
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
  if (!headers.includes(nodeModulesHeader)) {
    headers.push(nodeModulesHeader);
  }

  // Simplest replacement: find the line and replace it
  // We target "return ...format("{}%"..." and replace with std::to_string
  const newStr = 'return std::to_string(dimension.value) + "%";';

  headers.forEach((headerPath) => {
    let content = fs.readFileSync(headerPath, "utf8");
    if (content.includes(newStr)) {
      console.log("Already patched:", headerPath);
      return;
    }

    // Just look for the line that has YGUnitPercent in context or just the format call
    const lines = content.split("\n");
    let patched = false;
    for (let i = 0; i < lines.length; i++) {
      if (
        lines[i].includes("format(") &&
        lines[i].includes("{}%") &&
        lines[i].includes("dimension.value")
      ) {
        lines[i] = lines[i].replace(/return.*format\(.*\);/, newStr);
        patched = true;
      }
    }

    if (patched) {
      fs.writeFileSync(headerPath, lines.join("\n"));
      console.log("Successfully patched (simple search):", headerPath);
    } else {
      console.log("Target line not found in:", headerPath);
    }
  });
} catch (error) {
  console.error("Error:", error);
}
