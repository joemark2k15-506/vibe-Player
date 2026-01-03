const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push("mjs", "cjs");

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  stream: require.resolve("readable-stream"),
  buffer: require.resolve("buffer"),
  process: require.resolve("process/browser"),
  fs: require.resolve("./mocks/fs.js"),
  path: require.resolve("path-browserify"),
};

const path = require("path");

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "music-metadata") {
    return {
      filePath: path.resolve(
        __dirname,
        "node_modules/music-metadata/lib/index.js"
      ),
      type: "sourceFile",
    };
  }
  if (moduleName === "strtok3") {
    return {
      filePath: path.resolve(__dirname, "node_modules/strtok3/lib/index.js"),
      type: "sourceFile",
    };
  }
  if (moduleName === "token-types") {
    return {
      filePath: path.resolve(
        __dirname,
        "node_modules/token-types/lib/index.js"
      ),
      type: "sourceFile",
    };
  }
  if (moduleName === "file-type") {
    return {
      filePath: path.resolve(__dirname, "node_modules/file-type/core.js"),
      type: "sourceFile",
    };
  }
  if (moduleName === "peek-readable") {
    return {
      filePath: path.resolve(
        __dirname,
        "node_modules/peek-readable/lib/index.js"
      ),
      type: "sourceFile",
    };
  }
  if (moduleName === "@borewit/text-codec") {
    return {
      filePath: path.resolve(
        __dirname,
        "node_modules/@borewit/text-codec/lib/index.js"
      ),
      type: "sourceFile",
    };
  }
  if (moduleName === "uint8array-extras") {
    return {
      filePath: path.resolve(
        __dirname,
        "node_modules/uint8array-extras/index.js"
      ),
      type: "sourceFile",
    };
  }
  if (moduleName === "jsmediatags") {
    return {
      filePath: path.resolve(
        __dirname,
        "node_modules/jsmediatags/dist/jsmediatags.min.js"
      ),
      type: "sourceFile",
    };
  }

  // Ensure we don't break other resolutions
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
