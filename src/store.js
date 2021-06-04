import { isTestHostname } from "./utils.js";

export const store = {
  mode: isTestHostname() ? "test" : "live",
};
