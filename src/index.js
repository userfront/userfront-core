import axios from "axios";
import Cookies from "js-cookie";
// import jwt from "jsonwebtoken";

import constants from "./constants";
const { apiUrl, privateIPRegex } = constants;

let initCallbacks = [];

/**
 * Determine whether a hostname is in test mode.
 * @param {String} hn
 */
const isTestHostname = (hn) => {
  try {
    const hostname = hn || window.location.hostname;
    return !!(hostname.match(/localhost/g) || hostname.match(privateIPRegex));
  } catch (err) {
    return true;
  }
};

const store = {
  mode: isTestHostname() ? "test" : "live",
};

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
 * Set and then return the access token
 */
function accessToken() {
  store.accessToken = Cookies.get(store.accessTokenName);
  return store.accessToken;
}

/**
 * Set and then return the ID token
 */
function idToken() {
  store.idToken = Cookies.get(store.idTokenName);
  return store.idToken;
}

/**
 * Get the value of a query attribute, e.g. ?attr=value
 * @param {String} attrName
 */
function getQueryAttr(attrName) {
  if (
    !window.location.href ||
    window.location.href.indexOf(`${attrName}=`) < 0
  ) {
    return;
  }
  return decodeURIComponent(
    window.location.href.split(`${attrName}=`)[1].split("&")[0]
  );
}

function getProviderLink(provider) {
  if (!provider) throw new Error("Missing provider");
  if (!store.tenantId) throw new Error("Missing tenant ID");

  let url = `https://api.userfront.com/v0/auth/${provider}/login?tenant_id=${store.tenantId}&origin=${window.location.origin}`;

  const redirect = getQueryAttr("redirect");
  if (redirect) {
    url += `&redirect=${encodeURIComponent(redirect)}`;
  }

  return url;
}

/**
 * Define the mode of operation (live or test)
 */
async function setMode() {
  try {
    const { data } = await axios.get(`${apiUrl}tenants/${store.tenantId}/mode`);
    store.mode = data.mode || "test";
  } catch (err) {
    store.mode = "test";
  }
}

/**
 * Register a user via the provided method. This method serves to call other
 * methods, depending on the "method" parameter passed in.
 * @param {Object} options
 */
async function signup({ method, username, name, email, password }) {
  if (!method) {
    throw new Error('Userfront.signup called without "method" property');
  }
  switch (method) {
    case "azure":
    case "facebook":
    case "github":
    case "google":
    case "linkedin":
      return signupWithSSO(method);
    case "password":
      return signupWithPassword({ username, name, email, password });
    default:
      throw new Error('Userfront.signup called with invalid "method" property');
  }
}

/**
 * Register a new user in via SSO provider.
 * Redirect the browser after successful authentication and 302 redirect from server.
 * @param {String} provider Name of SSO provider
 */
function signupWithSSO(provider) {
  if (!provider) throw new Error("Missing provider");
  const url = getProviderLink(provider);
  window.location.assign(url);
}

/**
 * Register a new user with username, name, email, and password.
 * Redirect the browser after successful signup based on the redirectTo value returned.
 * @param {Object} options
 */
async function signupWithPassword({ username, name, email, password }) {
  const { data } = await axios.post(`${apiUrl}auth/create`, {
    tenantId: store.tenantId,
    username,
    name,
    email,
    password,
  });

  if (data.tokens) {
    setCookiesAndTokens(data.tokens);
    redirectToPath(getQueryAttr("redirect") || data.redirectTo || "/");
  } else {
    throw new Error("Please try again.");
  }
}

/**
 * Log a user in via the provided method. This method serves to call other
 * methods, depending on the "method" parameter passed in.
 * @param {Object} options
 */
async function login({
  method,
  email,
  username,
  emailOrUsername,
  password,
  token,
  uuid,
}) {
  if (!method) {
    throw new Error('Userfront.login called without "method" property');
  }
  switch (method) {
    case "azure":
    case "facebook":
    case "github":
    case "google":
    case "linkedin":
      return loginWithSSO(method);
    case "password":
      return loginWithPassword({ email, username, emailOrUsername, password });
    case "link":
      return loginWithLink(token, uuid);
    default:
      throw new Error('Userfront.login called with invalid "method" property');
  }
}

/**
 * Log a user in via SSO provider.
 * Redirect the browser after successful authentication and 302 redirect from server.
 * @param {String} provider Name of SSO provider
 */
function loginWithSSO(provider) {
  if (!provider) throw new Error("Missing provider");
  const url = getProviderLink(provider);
  window.location.assign(url);
}

/**
 * Log a user in with email/username and password.
 * Redirect the browser after successful login based on the redirectTo value returned.
 * @param {Object} options
 */
async function loginWithPassword({
  email,
  username,
  emailOrUsername,
  password,
}) {
  const { data } = await axios.post(`${apiUrl}auth/basic`, {
    tenantId: store.tenantId,
    emailOrUsername: email || username || emailOrUsername,
    password,
  });
  if (data.tokens) {
    setCookiesAndTokens(data.tokens);
    redirectToPath(getQueryAttr("redirect") || data.redirectTo || "/");
  } else {
    throw new Error("Please try again.");
  }
}

/**
 * Log a user in with a token/uuid combo passed into the function or
 * in the URL querystring. ?token=...&uuid=...
 * @param {String} token
 * @param {UUID} uuid
 */
async function loginWithLink(token, uuid) {
  if (!token) token = getQueryAttr("token");
  if (!uuid) uuid = getQueryAttr("uuid");
  if (!token || !uuid) return;

  const { data } = await axios.put(`${apiUrl}auth/link`, {
    token,
    uuid,
    tenantId: store.tenantId,
  });

  if (data.tokens) {
    setCookiesAndTokens(data.tokens);
    redirectToPath(getQueryAttr("redirect") || data.redirectTo || "/");
  } else {
    throw new Error("Problem logging in.");
  }
}

/**
 * Send a login link to the provided email.
 * @param {String} email
 */
async function sendLoginLink(email) {
  try {
    const { data } = await axios.post(`${apiUrl}auth/link`, {
      email,
      tenantId: store.tenantId,
    });
    return data;
  } catch (err) {
    throw new Error("Problem sending link");
  }
}

/**
 * Send a password reset link to the provided email.
 * @param {String} email
 */
async function sendResetLink(email) {
  try {
    const { data } = await axios.post(`${apiUrl}auth/reset/link`, {
      email,
      tenantId: store.tenantId,
    });
    return data;
  } catch (err) {
    throw new Error("Problem sending link");
  }
}

async function resetPassword({ uuid, token, password }) {
  if (!token) token = getQueryAttr("token");
  if (!uuid) uuid = getQueryAttr("uuid");
  if (!token || !uuid) throw new Error("Missing token or uuid");
  const { data } = await axios.put(`${apiUrl}auth/reset`, {
    tenantId: store.tenantId,
    uuid,
    token,
    password,
  });
  if (data.tokens) {
    setCookiesAndTokens(data.tokens);
    redirectToPath(getQueryAttr("redirect") || data.redirectTo || "/");
  } else {
    throw new Error(
      "There was a problem resetting your password. Please try again."
    );
  }
}

// TODO replace with direct check of the access token.
/**
 * If the access token is valid, redirect the browser to the
 * tenant's login redirection path (path after login).
 */
async function redirectIfLoggedIn() {
  if (!store.accessToken) return removeAllCookies();
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
    window.location.href = path;
  }
}

/**
 * Log a user out and redirect to the logout path.
 */
async function logout() {
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
 * Set a cookie value based on the given options.
 * @param {String} value
 * @param {Object} options
 * @param {String} type
 */
function setCookie(value, options, type) {
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
function removeAllCookies() {
  removeCookie(store.accessTokenName);
  removeCookie(store.idTokenName);
  removeCookie(store.refreshTokenName);
  store.accessToken = undefined;
  store.idToken = undefined;
  store.refreshToken = undefined;
}

/**
 * Define the store token values from the cookie values.
 */
function setTokensFromCookies() {
  store.accessToken = Cookies.get(store.accessTokenName);
  store.idToken = Cookies.get(store.idTokenName);
  store.refreshToken = Cookies.get(store.refreshTokenName);
}

/**
 * Set the cookies from a tokens object, and add to the local store.
 * @param {Object} tokens
 */
function setCookiesAndTokens(tokens) {
  setCookie(tokens.access.value, tokens.access.cookieOptions, "access");
  setCookie(tokens.id.value, tokens.id.cookieOptions, "id");
  setCookie(tokens.refresh.value, tokens.refresh.cookieOptions, "refresh");
  setTokensFromCookies();
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
  setCookie,
  signup,
  store,
};
