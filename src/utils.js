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
export function getJwtPayload(token) {
  try {
    // Split token into constituent parts
    const base64Url = token.split('.')[1];
    // Convert from base64url to base64 encoding
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // To correctly decode a UTF-8 string without misinterpreting non-ASCII characters:
    // 1. Decode the base64 to a UTF-16 string that may contain misinterpreted chars (window.atob)
    //    -> DOMStrings are natively UTF-16LE, while JWTs are UTF-8
    // 2. Convert the string to percent encoding (map each char to %HH where HH = hex value of byte)
    //    (the '00' + ... + .slice(-2) bit ensures a single char is encoded correctly,
    //     not strictly necessary here but included for correctness)
    // 3. Interpret the percent-encoded string as a URI component, which is UTF-8 by definition (decodeURIComponent)
    //    -> now non-ASCII characters 
    //  
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => 
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Problem decoding JWT payload", error);
  }
}

/*
  Worked example of decoding above:
  A JWT payload {"foo":"bår"} is base64url encoded as eyJmb28iOiJiw6VyIn0
  1. base64url to base64: eyJmb28iOiJiw6VyIn0
    = eyJmb28iOiJiw6VyIn0
    (no change in this case)
  2. base64 to DOMString: atob(eyJmb28iOiJiw6VyIn0)
    = {"foo":"bÃ¥r"}
    ->  "å" in UTF-8 encoding = 0xC3 0xA5
        0xC3 0xA5 as UTF-16LE = Ã¥
  3. DOMString to percent-encoding
    = %7b%22%66%6f%6f%22%3a%22%62 %c3%a5 %72%22%7d
    -> Ã¥ was encoded as %c3%a5 
  4. Percent-encoded UTF-8 to DOMString
    = {"foo":"bår"}
    ->  URIs are always UTF-8, so decodeURIComponent knows to interpret the percent-encoded
        string as UTF-8.
        (As before, DOMStrings are UTF-16LE, so internally "å" is encoded as 0xE5 per UTF-16.)
  Note: UTF-8 and UTF-16 are equivalent in the ASCII range 0x00 - 0x7f, so atob(base64) is OK
  if it's known that the string uses only those characters.
*/

/**
 * Client-side check:
 * Determine whether the given JWT is present and unexpired
 *
 * @param {String} token JSON Web Token
 * @returns {Boolean}
 */
export function isJwtLocallyValid(token) {
  try {
    // Must be present
    if (!token) {
      return false;
    }

    // Must not be expired
    const payload = getJwtPayload(token);
    return new Date(payload.exp * 1000) > new Date();
  } catch (error) {
    return false;
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

export function isBrowser() {
  return typeof window !== "undefined";
}