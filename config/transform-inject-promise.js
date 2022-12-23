// Inject
//   import Promise from "promise-polyfill"
// into files that use global Promise.
// Via https://github.com/developit/microbundle/issues/761#issuecomment-755683916
module.exports = ({ template }) => ({
  name: "transform-inject-promise",
  visitor: {
    Identifier(path, state) {
      if (state.p || !(path=path.resolve()).isIdentifier({name:"Promise"}) || path.scope.getBinding("Promise")) return;
      state.p = path.scope.getProgramParent().path.unshiftContainer("body", template.ast`import Promise from"promise-polyfill"`);
    }
  }
});