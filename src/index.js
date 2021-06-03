import axios from "axios";
import Cookies from "js-cookie";

import { apiUrl } from "./constants.js";

import { store, setTokensFromCookies } from "./store.js";
import { getQueryAttr } from "./url.js";
import {
  signup,
  login,
  sendLoginLink,
  sendResetLink,
  resetPassword,
} from "./signon.js";
import { removeAllCookies } from "./cookies.js";
import { isTestHostname, setMode } from "./mode.js";

import { setIframe } from "./iframe.js";

let initCallbacks = [];

/**
 * Initialize the Userfront library.
 * @param {String} tenantId
 */
export function init(tenantId) {
  if (!tenantId) return console.warn("Userfront initialized without tenant ID");
  store.tenantId = tenantId;
  store.accessTokenName = `access.${tenantId}`;
  store.idTokenName = `id.${tenantId}`;
  store.refreshTokenName = `refresh.${tenantId}`;
  setIframe();
  setTokensFromCookies();
  try {
    if (initCallbacks.length > 0) {
      initCallbacks.forEach((cb) => {
        if (!cb || typeof cb !== "function") return;
        cb({ tenantId });
      });
    }
    initCallbacks = [];
  } catch (error) {}
}

/**
 * Add a callback function to be called upon Userfront.init()
 * @param {Function} cb
 */
export function addInitCallback(cb) {
  if (!cb || typeof cb !== "function") return;
  initCallbacks.push(cb);
}

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

// TODO replace with direct check of the access token.
/**
 * If the access token is valid, redirect the browser to the
 * tenant's login redirection path (path after login).
 */
export async function redirectIfLoggedIn() {
  if (!store.accessToken) {
    return removeAllCookies();
  }
  if (getQueryAttr("redirect")) {
    return redirectToPath(getQueryAttr("redirect"));
  }

  try {
    const { data } = await axios.get(`${apiUrl}self`, {
      headers: {
        authorization: `Bearer ${store.accessToken}`,
      },
    });
    if (data.tenant && data.tenant.loginRedirectPath) {
      redirectToPath(data.tenant.loginRedirectPath);
    }
  } catch (err) {
    removeAllCookies();
  }
}

/**
 * Redirect to path portion of a URL.
 */
function redirectToPath(pathOrUrl) {
  try {
    document;
  } catch (error) {
    return;
  }
  if (!pathOrUrl) return;
  const el = document.createElement("a");
  el.href = pathOrUrl;
  let path = `${el.pathname}${el.hash}${el.search}`;
  if (el.pathname !== window.location.pathname) {
    window.location.assign(path);
  }
}

/**
 * Log a user out and redirect to the logout path.
 */
export async function logout() {
  if (!store.accessToken) return removeAllCookies();
  try {
    const { data } = await axios.get(`${apiUrl}auth/logout`, {
      headers: {
        authorization: `Bearer ${store.accessToken}`,
      },
    });
    removeAllCookies();
    redirectToPath(data.redirectTo);
  } catch (err) {
    removeAllCookies();
  }
}

/**
 * Register a window-level event called "urlchanged" that will fire
 * whenever the browser URL changes.
 */
let isRegistered = false;
function registerUrlChangedEventListener() {
  if (isRegistered) return;
  isRegistered = true;
  try {
    history.pushState = ((f) =>
      function pushState() {
        var ret = f.apply(this, arguments);
        window.dispatchEvent(new Event("pushstate"));
        window.dispatchEvent(new Event("urlchanged"));
        return ret;
      })(history.pushState);

    history.replaceState = ((f) =>
      function replaceState() {
        var ret = f.apply(this, arguments);
        window.dispatchEvent(new Event("replacestate"));
        window.dispatchEvent(new Event("urlchanged"));
        return ret;
      })(history.replaceState);

    window.addEventListener("popstate", () => {
      window.dispatchEvent(new Event("urlchanged"));
    });
  } catch (error) {}
}

/**
 * EXPORTS
 */

export {
  signup,
  login,
  sendLoginLink,
  sendResetLink,
  resetPassword,
} from "./signon.js";

export default {
  addInitCallback,
  accessToken,
  getQueryAttr,
  idToken,
  init,
  isTestHostname,
  login,
  logout,
  redirectIfLoggedIn,
  registerUrlChangedEventListener,
  resetPassword,
  sendLoginLink,
  sendResetLink,
  setMode,
  signup,
  store,
};
