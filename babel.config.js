module.exports = {
  presets: [["@babel/preset-env", { targets: { node: "current" } }]],
  // Allow non-exported functions from a module to be testable https://github.com/jhnns/rewire
  plugins: ["babel-plugin-rewire"],
};
