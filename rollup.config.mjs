import terser from "@rollup/plugin-terser";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonJs from "@rollup/plugin-commonjs";

export default {
  input: "src/index.js",
  output: [
    {
      file: "build/userfront-core.module.js",
      format: "es",
      plugins: [terser()],
      sourcemap: true
    },
    {
      file: "build/userfront-core.umd.js",
      format: "umd",
      name: "Userfront",
      plugins: [terser()],
      sourcemap: true
    },
    {
      file: "build/userfront-core.js",
      format: "cjs",
      name: "Userfront",
      plugins: [terser()],
      sourcemap: true
    }
  ],
  plugins: [commonJs(),
    nodeResolve({
      browser: true,
      preferBuiltins: false,
      external: []
  })]
}