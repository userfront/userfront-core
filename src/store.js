import { isTestHostname } from "./utils.js";

export const store = {
  user: {},
  tokens: {},
  mode: isTestHostname() ? "test" : "live",
};
