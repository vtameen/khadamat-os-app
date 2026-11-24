// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// pdf-lib (used to put signatures on PDFs inside the app) depends on tslib. Metro picks
// tslib's "import" entry, which re-exports from a CommonJS file and comes out empty
// ("Cannot destructure property '__extends'"). Point tslib at its plain ES build instead.
const tslib = path.join(__dirname, 'node_modules/tslib/tslib.es6.js');
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib') return { type: 'sourceFile', filePath: tslib };
  return upstream ? upstream(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
