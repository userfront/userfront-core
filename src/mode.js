import axios from "axios";

import { apiUrl, privateIPRegex } from "./constants.js";
import { store } from "./store.js";

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

/**
 * Define the mode of operation (live or test)
 */
export async function setMode() {
  try {
    const { data } = await axios.get(`${apiUrl}tenants/${store.tenantId}/mode`);
    store.mode = data.mode || "test";
  } catch (err) {
    store.mode = "test";
  }
}
