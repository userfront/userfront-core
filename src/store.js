import { isTestHostname } from "./mode.js";

export const store = {
  mode: isTestHostname() ? "test" : "live",
};
