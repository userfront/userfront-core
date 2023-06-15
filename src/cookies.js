import Cookies from "js-cookie";
import { store } from "./store.js";
import { unsetTokens } from "./tokens.js";

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
  unsetTokens();
}
