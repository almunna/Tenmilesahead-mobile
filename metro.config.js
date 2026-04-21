const { getDefaultConfig } = require("expo/metro-config");

const defaultConfig = getDefaultConfig(__dirname);
const { transformer, resolver } = defaultConfig;

// expo-auth-session 7.x ships as ESM — include it (and peers) in Babel transform
// so Metro can resolve the import/export syntax in node_modules.
const TRANSFORM_INCLUDE =
  "react-native|@react-native|@react-navigation|expo|@expo|" +
  "expo-auth-session|expo-web-browser|expo-application|" +
  "firebase|@firebase";

defaultConfig.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
  transformIgnorePatterns: [
    `node_modules/(?!(${TRANSFORM_INCLUDE})/)`,
  ],
};

defaultConfig.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...resolver.sourceExts, "svg"],
};

module.exports = defaultConfig;
