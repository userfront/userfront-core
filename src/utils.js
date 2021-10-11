/**
 * This file is for zero-dependency utilities that can
 * be imported by any other file. Don't add any imports
 * to this file other than constants
 */

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
