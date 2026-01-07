const fs = require("fs");
const path = "android/app/build.gradle";
let c = fs.readFileSync(path, "utf8");
// Matches the line with 3 braces and replaces with 2 braces
const replacement =
  '    defaultConfig { ndk { abiFilters "armeabi-v7a", "arm64-v8a" } externalNativeBuild { cmake { arguments "-DANDROID_STL=c++_shared" } }';
c = c.replace(/.*defaultConfig \{ externalNativeBuild.*/g, replacement);
fs.writeFileSync(path, c);
console.log("Fixed build.gradle brace count");
