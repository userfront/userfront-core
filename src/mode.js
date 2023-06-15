import { get } from "./api.js";
import { privateIPRegex } from "./constants.js";
import { store } from "./store.js";
import { setFirstFactors } from "./mfa.js";

/**
 * Global mode object
 */
export const mode = {
  value: "live",
  reason: undefined,
  setMode,
};

setModeSync();

/**
 * Determine whether a hostname is in test mode.
 * @param {String} hn
 */
export function isTestHostname(hn) {
  try {
    const hostname = hn || window.location.hostname;
    return !!(hostname.match(/localhost/g) || hostname.match(privateIPRegex));
  } catch (err) {
    return true;
  }
}

export function isHttps() {
  try {
    return window.location.protocol === "https:";
  } catch (error) {
    return false;
  }
}

/**
 * Define the mode of operation (live or test)
 * and the tenant's authentication factors
 */
export async function setMode() {
  try {
    const { data } = await get(`/tenants/${store.tenantId}/mode`);
    mode.value = data.mode || "test";
    mode.reason = getReason(mode.value);
    store.mode = mode.value;
    setFirstFactors(data.authentication);
    return data;
  } catch (err) {
    mode.value = "test";
    store.mode = mode.value;
  }
}

/**
 * Estimate the mode without making an API call
 */
export function setModeSync() {
  const modeValue = isTestHostname() || !isHttps() ? "test" : "live";
  mode.value = modeValue;
  mode.reason = getReason(modeValue);
  store.mode = modeValue;
}

/**
 * Set the reason for the mode
 * - http
 * - domain
 */
function getReason(mode) {
  try {
    if (mode === "live") {
      return "domain";
    }
    if (window.location.protocol === "http:") {
      return "http";
    } else if (window.location.protocol !== "https:") {
      return "protocol";
    } else {
      return "domain";
    }
  } catch (error) {}
}
