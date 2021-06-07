import { isTestHostname } from "./utils.js";

export const store = {
  user: {},
  mode: isTestHostname() ? "test" : "live",
};
