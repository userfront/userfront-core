import { store } from "./store.js";
import { refresh } from "./refresh.js";
import { isJwtLocallyValid } from "./utils.js";

store.tokens.refresh = refresh;

/**
 * Get the access token's value
 */
export function accessToken() {
  return store.tokens.accessToken;
}

/**
 * Get the id token's value
 */
export function idToken() {
  return store.tokens.idToken;
}

/**
 * Client-side check:
 * Determine whether the access token is present and unexpired
 * @returns {Boolean}
 */
export function isAccessTokenLocallyValid() {
  return isJwtLocallyValid(store.tokens.accessToken);
}

/**
 * Client-side check:
 * Determine whether the refresh token is present and unexpired
 * @returns {Boolean}
 */
export function isRefreshTokenLocallyValid() {
  return isJwtLocallyValid(store.tokens.refreshToken);
}

/**
 * Export the store.tokens object
 */
export const tokens = store.tokens;
