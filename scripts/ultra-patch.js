const fs = require("fs");
const path = require("path");

const SEARCH_ROOTS = [
  path.join(process.env.USERPROFILE, ".gradle", "caches"),
  path.join("d:", "joeproj", "node_modules"),
];

const TARGET_REGEX = /return\s+std::format\("\{}%\s*",\s*dimension\.value\);/;
const REPLACEMENT = 'return std::to_string(dimension.value) + "%";';

function patchFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    if (content.includes(REPLACEMENT)) {
      // console.log(`Already patched: ${filePath}`);
      return;
    }

    if (TARGET_REGEX.test(content)) {
      const newContent = content.replace(TARGET_REGEX, REPLACEMENT);
      fs.writeFileSync(filePath, newContent);
      console.log(`Successfully patched: ${filePath}`);
    }
  } catch (err) {
    // Silently skip binary files or permission issues
  }
}

function walkDir(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      let stat;
      try {
        stat = fs.lstatSync(fullPath);
      } catch (e) {
        continue;
      }

      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (
        stat.isFile() &&
        (file.endsWith(".h") || file.endsWith(".cpp") || file.endsWith(".hpp"))
      ) {
        patchFile(fullPath);
      }
    }
  } catch (err) {
    // console.error(`Error walking ${dir}: ${err.message}`);
  }
}

console.log("Starting recursive search and patch...");
SEARCH_ROOTS.forEach((root) => {
  if (fs.existsSync(root)) {
    console.log(`Searching in ${root}...`);
    walkDir(root);
  } else {
    console.log(`Root not found: ${root}`);
  }
});
console.log("Finished.");
