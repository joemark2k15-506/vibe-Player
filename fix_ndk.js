const fs = require("fs");
const path = "android/build.gradle";
let c = fs.readFileSync(path, "utf8");

if (!c.includes('ndkVersion = "26.1.10909125"')) {
  // Append the ext block to the end or inside existing ext
  // Since we didn't see ext block, we'll strip any existing ndkVersion definition and add ours
  // But safer to just append a new ext block if gradle allows it (it does, last writer wins usually, or merges)
  // However, to be clean, let's insert it after buildscript.

  // Check if ext { exists
  if (c.includes("ext {")) {
    c = c.replace(/ext \{/, 'ext {\n    ndkVersion = "26.1.10909125"');
  } else {
    c += '\n\next {\n    ndkVersion = "26.1.10909125"\n}\n';
  }
  fs.writeFileSync(path, c);
  console.log("Added ndkVersion to android/build.gradle");
} else {
  console.log("ndkVersion already present");
}
