const fs = require("fs");
const path = require("path");

const roots = [
  path.join(process.env.USERPROFILE, ".gradle", "caches"),
  path.join("d:", "joeproj", "node_modules"),
];

const replacement = 'return std::to_string(dimension.value) + "%";';

function walk(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.lstatSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (file === "graphicsConversions.h") {
        let content = fs.readFileSync(fullPath, "utf8");
        if (
          content.includes("std::format") &&
          content.includes("dimension.value")
        ) {
          // Very aggressive replace
          content = content.replace(
            /return\s+std::format\(.*dimension\.value.*\);/g,
            replacement
          );
          fs.writeFileSync(fullPath, content);
          console.log("Patched:", fullPath);
        }
      }
    }
  } catch (e) {}
}

roots.forEach((r) => {
  if (fs.existsSync(r)) walk(r);
});
