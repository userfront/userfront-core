import { isTestHostname } from "../../src/utils.js";

function resetStore(Userfront) {
  Userfront.store = {
    mode: isTestHostname() ? "test" : "live",
  };
}

export default {
  resetStore,
};
