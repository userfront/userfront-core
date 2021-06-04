import { store } from "./store.js";
import { accessToken, idToken, setTokensFromCookies } from "./tokens";
import { redirectIfLoggedIn } from "./url.js";
import {
  login,
  resetPassword,
  sendLoginLink,
  sendResetLink,
  signup,
} from "./signon.js";
import { logout } from "./logout.js";
import { setMode } from "./mode.js";
import { setIframe } from "./iframe.js";
import { isTestHostname } from "./utils.js";

let initCallbacks = [];

/**
 * Initialize the Userfront library.
 * @param {String} tenantId
 */
function init(tenantId) {
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
function addInitCallback(cb) {
  if (!cb || typeof cb !== "function") return;
  initCallbacks.push(cb);
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

// export { logout } from "./logout.js";
// export { setMode } from "./mode";
// export {
//   login,
//   resetPassword,
//   sendLoginLink,
//   sendResetLink,
//   signup,
// } from "./signon.js";
// export { store } from "./store";
// export { accessToken, idToken } from "./tokens";
// export { redirectIfLoggedIn } from "./url.js";
// export { isTestHostname } from "./utils.js";

export default {
  // index
  addInitCallback,
  init,
  registerUrlChangedEventListener,

  //logout
  logout,

  // mode
  setMode,

  // signon
  login,
  resetPassword,
  sendLoginLink,
  sendResetLink,
  signup,

  // store
  store,

  // tokens
  accessToken,
  idToken,

  // url
  redirectIfLoggedIn,

  // utils
  isTestHostname,
};
