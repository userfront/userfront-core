import Cookies from "js-cookie";
import { store, setCookieOptionsByTokenType } from "./store.js";

/**
 * Remove a cookie by name, regardless of its cookie setting(s).
 * @param {String} name
 */
export function removeCookie(name) {
  // Define all possible path and domain combinations
  let paths, domains;
  try {
    const path = window.location.pathname;
    const hostname = window.location.hostname;
    const hostnameParts = hostname.split(".");
    const primaryDomain = hostnameParts.slice(-2).join(".");
    paths = [undefined, path, "/"];
    domains = [
      undefined,
      hostname,
      `.${hostname}`,
      primaryDomain,
      `.${primaryDomain}`,
    ];
  } catch (err) {
    paths = [undefined, "/"];
    domains = [undefined];
  }

  // Iterate over paths and domains, and remove cookies if present
  paths.map((path) => {
    domains.map((domain) => {
      const options = {};
      if (domain) options.domain = domain;
      if (path) options.path = path;
      Cookies.remove(name, options);
    });
  });
}

/**
 * Remove all auth cookies (access, id, refresh).
 */
export function removeAllCookies() {
  removeCookie(store.tokens.accessTokenName);
  removeCookie(store.tokens.idTokenName);
  removeCookie(store.tokens.refreshTokenName);
}

/**
 * Set the cookies from a tokens object, and add to the local store.
 * @param {Object} tokens
 */
export function setCookiesAndTokens(tokens) {
  setCookieOptionsByTokenType("access", tokens.access.cookieOptions);
  store.tokens.accessToken = tokens.access.value;

  setCookieOptionsByTokenType("id", tokens.id.cookieOptions);
  store.tokens.idToken = tokens.id.value;

  if (tokens.refresh && tokens.refresh.value) {
    setCookieOptionsByTokenType("refresh", tokens.refresh.cookieOptions);
    store.tokens.refreshToken = tokens.refresh.value;
  }
}
