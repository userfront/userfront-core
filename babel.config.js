let config = {
  presets: [["@babel/preset-env", { targets: { node: "current" } }]],
};

if (process.env.NODE_ENV === "test") {
  // Allow non-exported functions from a module to be testable https://github.com/jhnns/rewire
  config.plugins = ["babel-plugin-rewire"];
}

module.exports = config;
