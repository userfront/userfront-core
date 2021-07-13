/**
 * This file is for zero-dependency utilities that can
 * be imported by any other file. Don't add any imports
 * to this file other than constants
 */

import { privateIPRegex } from "./constants.js";

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
 * Get the unverified base64 decoded payload of a JWT
 *
 * @param {String} token - JSON Web Token
 * @returns {Object}
 */
export function getJWTPayload(token) {
  try {
    const encodedPayload = token
      .split(".")[1]
      .replace("-", "+")
      .replace("_", "/");
    return JSON.parse(atob(encodedPayload));
  } catch (error) {
    console.error("Problem decoding JWT payload", error);
  }
}

export function throwFormattedError(error) {
  if (!error) return;
  if (typeof error === "string") throw new Error(error);
  if (error?.response?.data?.message) {
    throw new Error(error.response.data.message);
  }
  throw error;
}
