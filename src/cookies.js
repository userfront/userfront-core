import Cookies from "js-cookie";
import { store } from "./store.js";
import { setTokensFromCookies, unsetTokens } from "./tokens.js";

/**
 * Set a cookie value based on the given options.
 * @param {String} value
 * @param {Object} options
 * @param {String} type
 */
export function setCookie(value, options, type) {
  const cookieName = `${type}.${store.tenantId}`;
  options = options || {
    secure: store.mode === "live",
    sameSite: "Lax",
  };
  if (type === "refresh") {
    options.sameSite = "Strict";
  }
  Cookies.set(cookieName, value, options);
}

/**
 * Remove a cookie by name, regardless of its cookie setting(s).
 * @param {String} name
 */
function removeCookie(name) {
  Cookies.remove(name);
  Cookies.remove(name, { secure: true, sameSite: "Lax" });
  Cookies.remove(name, { secure: true, sameSite: "None" });
  Cookies.remove(name, { secure: false, sameSite: "Lax" });
  Cookies.remove(name, { secure: false, sameSite: "None" });
}

/**
 * Remove all auth cookies (access, id, refresh).
 */
export function removeAllCookies() {
  removeCookie(store.tokens.accessTokenName);
  removeCookie(store.tokens.idTokenName);
  removeCookie(store.tokens.refreshTokenName);
  unsetTokens();
}

/**
 * Set the cookies from a tokens object, and add to the local store.
 * @param {Object} tokens
 */
export function setCookiesAndTokens(tokens) {
  setCookie(tokens.access.value, tokens.access.cookieOptions, "access");
  setCookie(tokens.id.value, tokens.id.cookieOptions, "id");
  if (tokens.refresh && tokens.refresh.value) {
    setCookie(tokens.refresh.value, tokens.refresh.cookieOptions, "refresh");
  }
  setTokensFromCookies();
}
