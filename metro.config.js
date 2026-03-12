const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// expo-auth-session 7.x ships as ESM — include it (and peers) in Babel transform
// so Metro can resolve the import/export syntax in node_modules.
const TRANSFORM_INCLUDE =
  "react-native|@react-native|@react-navigation|expo|@expo|" +
  "expo-auth-session|expo-web-browser|expo-application|" +
  "firebase|@firebase";

config.transformer.transformIgnorePatterns = [
  `node_modules/(?!(${TRANSFORM_INCLUDE})/)`,
];

module.exports = config;
