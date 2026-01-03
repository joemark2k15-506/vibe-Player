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

  const firstPath = listContent
    .split(/\r?\n/)[0]
    .trim()
    .replace(/^[^\w\\]+/, "");
  console.log("Reading from:", firstPath);

  if (fs.existsSync(firstPath)) {
    const content = fs.readFileSync(firstPath, "utf8");
    const lines = content.split(/\r?\n/);
    const index = lines.findIndex((l) => l.includes("YGUnitPercent"));
    if (index !== -1) {
      console.log("Lines found:");
      console.log(lines.slice(index, index + 3).join("\n"));
    } else {
      console.log("YGUnitPercent not found in file content.");
    }
  } else {
    console.log("File does not exist at path found in list.");
  }
} catch (error) {
  console.error("Error:", error);
}
