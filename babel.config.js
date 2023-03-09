const config = {
  plugins: [],
  presets: []
}

switch (process.env.COMPAT) {
  // If building the IE11 compatible version:
  // - set preset-env target to IE11
  // - run the transform-inject-promise plugin to inject 
  case "ie11": {
    config.plugins.push(
      require.resolve("./config/transform-inject-promise.js")
    );
    config.presets.push(["@babel/preset-env", {
      targets: { ie: "11" }
    }]);
    break;
  }
  // Otherwise:
  // - set preset-env target to modern environments
  default: {
    config.presets.push(["@babel/preset-env", { targets: { node: "12" } }]);
    break;
  }
}

if (process.env.NODE_ENV === "test") {
  // Allow non-exported functions from a module to be testable https://github.com/jhnns/rewire
  config.plugins.push("babel-plugin-rewire");
}

module.exports = config;
