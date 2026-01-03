const fs = require("fs");
const path = require("path");

const listFile = path.join("d:", "joeproj", "all_headers_manual.txt");

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
    .filter((line) => line.length > 0);

  console.log("Total paths in list:", headers.length);
  let existCount = 0;

  headers.forEach((h) => {
    if (fs.existsSync(h)) {
      console.log("EXISTS:", h);
      existCount++;

      // Print a snippet if it's the first one that exists
      if (existCount === 1) {
        const content = fs.readFileSync(h, "utf8");
        const idx = content.indexOf("format(");
        if (idx !== -1) {
          console.log("Snippet found in", h);
          console.log(content.slice(idx - 50, idx + 100));
        }
      }
    } else {
      // console.log('MISSING:', h);
    }
  });

  console.log("Total existing files:", existCount);
} catch (error) {
  console.error("Error:", error);
}
