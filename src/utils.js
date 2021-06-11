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
    const encodedPayload = token.split(".")[1];
    return JSON.parse(atob(encodedPayload));
  } catch (error) {
    console.error("Problem decoding JWT payload", error);
  }
}
