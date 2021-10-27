import axios from "axios";
import { store } from "./store.js";
import {
  tokens,
  accessToken,
  idToken,
  setTokensFromCookies,
  setTokenNames,
} from "./tokens";
import { redirectIfLoggedIn } from "./url.js";
import {
  login,
  resetPassword,
  sendLoginLink,
  sendResetLink,
  signup,
} from "./signon.js";
import { logout } from "./logout.js";
import { mode, setMode, setModeSync } from "./mode.js";
// import { setIframe } from "./iframe.js";
import { user } from "./user.js";
import "./user.methods.js";
import { refresh } from "./refresh.js";

let initCallbacks = [];

/**
 * Initialize the Userfront library.
 * @param {String} tenantId
 */
function init(tenantId, opts = {}) {
  if (!tenantId) return console.warn("Userfront initialized without tenant ID");

  store.tenantId = tenantId;

  if (opts.domain) {
    store.domain = opts.domain;
    axios.defaults.headers.common[
      "x-application-id"
    ] = `https://${store.domain}`;
  }

  setTokenNames();
  // setIframe(); // TODO re-enable when iframe is needed
  setTokensFromCookies();
  setModeSync();

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

export default {
  // index
  addInitCallback,
  init,
  registerUrlChangedEventListener,

  //logout
  logout,

  // mode
  mode,
  setMode,

  // refresh
  refresh,

  // signon
  login,
  resetPassword,
  sendLoginLink,
  sendResetLink,
  signup,

  // store
  store,

  // tokens
  tokens,
  accessToken,
  idToken,

  // url
  redirectIfLoggedIn,

  // user
  user,

  // utils
};
