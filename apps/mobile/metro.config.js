// Metro watches the repository root so the app can import ../../engine/*.ts, and resolves packages
// only from the app's own node_modules, since the root's are the web apps' (.docs/mobile.md).
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const root = path.resolve(__dirname, "../..");
const escaped = root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const config = getDefaultConfig(__dirname);
config.watchFolders = [root];
config.resolver.nodeModulesPaths = [path.join(__dirname, "node_modules")];
config.resolver.blockList = [
    ...[config.resolver.blockList ?? []].flat(),
    new RegExp(
        `^${escaped}/(?:node_modules|\\.git|\\.scratchpad|spikes|dist|coverage|public|server|tools)/`,
    ),
];

module.exports = config;
