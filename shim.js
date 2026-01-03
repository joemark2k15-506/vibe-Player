import { Buffer } from "buffer";
import process from "process";

// Forcefully polyfill Buffer
global.Buffer = Buffer;
global.process = process;

// Ensure standard streams are available if needed (helper for some libs)
if (typeof global.stream === "undefined") {
  global.stream = require("readable-stream");
}

// FIX for broken community forks that use __dirname in bundle
if (typeof global.__dirname === "undefined") {
  global.__dirname = "/";
}
