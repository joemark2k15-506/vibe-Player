const fs = require("fs");
const path = require("path");

const target =
  "C:\\Users\\Ps Joe\\.gradle\\caches\\8.10.2\\transforms\\0f839437195569227022e709037172ec\\transformed\\prefab\\modules\\reactnative\\include\\react\\renderer\\core\\graphicsConversions.h";

try {
  if (fs.existsSync(target)) {
    const content = fs.readFileSync(target, "utf8");
    console.log("--- START ---");
    console.log(content.slice(0, 2000));
    console.log("--- END ---");

    const index = content.indexOf("format(");
    if (index !== -1) {
      console.log("Found format at index:", index);
      console.log("Snippet:", content.slice(index - 50, index + 100));
    } else {
      console.log("format( not found in file.");
    }
  } else {
    console.log("File does not exist:", target);
  }
} catch (error) {
  console.error("Error:", error);
}
