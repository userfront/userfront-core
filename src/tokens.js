import Cookies from "js-cookie";

import { store } from "./store.js";

/**
 * Set and then return the access token
 */
export function accessToken() {
  store.accessToken = Cookies.get(store.accessTokenName);
  return store.accessToken;
}

/**
 * Set and then return the ID token
 */
export function idToken() {
  store.idToken = Cookies.get(store.idTokenName);
  return store.idToken;
}

/**
 * Define the store token values from the cookie values.
 */
export function setTokensFromCookies() {
  store.accessToken = Cookies.get(store.accessTokenName);
  store.idToken = Cookies.get(store.idTokenName);
  store.refreshToken = Cookies.get(store.refreshTokenName);
}
