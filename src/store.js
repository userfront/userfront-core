import Cookies from "js-cookie";
import { isTestHostname } from "./mode.js";

export const store = {
  mode: isTestHostname() ? "test" : "live",
};

/**
 * Define the store token values from the cookie values.
 */
export function setTokensFromCookies() {
  store.accessToken = Cookies.get(store.accessTokenName);
  store.idToken = Cookies.get(store.idTokenName);
  store.refreshToken = Cookies.get(store.refreshTokenName);
}
