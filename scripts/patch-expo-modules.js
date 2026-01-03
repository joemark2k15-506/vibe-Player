const fs = require("fs");
const path = require("path");

const cmakePath = path.join(
  "d:",
  "joeproj",
  "node_modules",
  "expo-modules-core",
  "android",
  "CMakeLists.txt"
);

try {
  if (!fs.existsSync(cmakePath)) {
    console.log("CMakeLists.txt not found");
    process.exit(0);
  }
  let content = fs.readFileSync(cmakePath, "utf8");

  if (content.includes("set(CMAKE_CXX_STANDARD 20)")) {
    console.log("Already patched.");
    process.exit(0);
  }

  // Insert at the top
  const patch = "set(CMAKE_CXX_STANDARD 20)";
  const newContent = patch + "\n" + content;

  fs.writeFileSync(cmakePath, newContent);
  console.log("Successfully patched expo-modules-core CMakeLists.txt");
} catch (error) {
  console.error("Error patching file:", error);
  process.exit(1);
}
