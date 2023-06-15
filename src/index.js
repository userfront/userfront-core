import axios from "axios";
import { store } from "./store.js";
import {
  tokens,
  accessToken,
  idToken,
  setTokensFromCookies,
  setTokenNames,
} from "./tokens";
import { getSession } from "./session";
import { redirectIfLoggedIn, redirectIfLoggedOut } from "./url.js";
import { signup } from "./signup.js";
import { login } from "./login.js";
import { updatePassword, resetPassword, sendResetLink } from "./password.js";
import { sendLoginLink } from "./link.js";
import { sendVerificationCode } from "./verificationCode";
import { logout } from "./logout.js";
import { mode, setMode, setModeSync } from "./mode.js";
// import { setIframe } from "./iframe.js";
import { user } from "./user.js";
import "./user.methods.js";
import { refresh } from "./refresh.js";
import { apiUrl } from "./constants.js";
import { resetMfa } from "./mfa.js";

let initCallbacks = [];

/**
 * Initialize the Userfront library.
 * @param {String} tenantId
 */
function init(tenantId, opts = {}) {
  if (!tenantId) return console.warn("Userfront initialized without tenantId");

  store.tenantId = tenantId;

  store.baseUrl = opts.baseUrl || apiUrl;
  if (!store.baseUrl.endsWith("/")) {
    store.baseUrl += "/";
  }

  if (opts.domain) {
    store.domain = opts.domain;
    const url = `https://${store.domain}`;
    axios.defaults.headers.common["x-application-id"] = url;
    axios.defaults.headers.common["x-origin"] = url;
  }

  setTokenNames();
  // setIframe(); // TODO re-enable when iframe is needed
  setTokensFromCookies();

  // Estimate the mode synchronously with local data.
  // Clients that require the true mode or the default
  // authenticationData should call and await setMode.
  setModeSync();

  resetMfa();

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
  refresh: (a, b, c) => {
    try {
      console.warn(
        "Userfront.refresh() is deprecated and will be removed. Please use Userfront.tokens.refresh() instead."
      );
    } catch (error) {}
    return refresh(a, b, c);
  },

  // signon
  login,
  resetPassword,
  updatePassword,
  sendLoginLink,
  sendResetLink,
  sendVerificationCode,
  signup,

  // store
  store,

  // tokens
  tokens,
  accessToken,
  idToken,

  // session
  getSession,

  // url
  redirectIfLoggedIn,
  redirectIfLoggedOut,

  // user
  user,

  // utils
};
