import axios from "axios";
import Cookies from "js-cookie";

import constants from "./constants";
const { apiUrl, privateIPRegex } = constants;

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

function init(tenantId) {
  if (!tenantId) return console.warn("Userfront initialized without tenant ID");
  store.tenantId = tenantId;
  store.accessTokenName = `access.${tenantId}`;
  store.idTokenName = `id.${tenantId}`;
  store.refreshTokenName = `refresh.${tenantId}`;
}

async function setMode() {
  try {
    const { data } = await axios.get(`${apiUrl}tenants/${store.tenantId}/mode`);
    store.mode = data.mode || "test";
  } catch (err) {
    store.mode = "test";
  }
}

/**
 * Register a new user with username, name, email, and password.
 * Redirect the browser after successful signup based on the redirectTo value returned.
 * @param {*} param0
 */
async function signup({ username, name, email, password }) {
  const { data } = await axios.post(`${apiUrl}auth/create`, {
    tenantId: store.tenantId,
    username,
    name,
    email,
    password,
  });

  if (data.tokens) {
    setCookie(
      data.tokens.access.value,
      data.tokens.access.cookieOptions,
      "access"
    );
    setCookie(data.tokens.id.value, data.tokens.id.cookieOptions, "id");
    setCookie(
      data.tokens.refresh.value,
      data.tokens.refresh.cookieOptions,
      "refresh"
    );
    redirectToPath(getQueryAttr("redirect") || data.redirectTo || "/");
  } else {
    throw new Error("Please try again.");
  }
}

/**
 * Log a user in with email/username and password.
 * Redirect the browser after successful login based on the redirectTo value returned.
 * @param {*} param0
 */
async function login({ email, username, emailOrUsername, password }) {
  const { data } = await axios.post(`${apiUrl}auth/basic`, {
    tenantId: store.tenantId,
    emailOrUsername: email || username || emailOrUsername,
    password,
  });
  if (data.tokens) {
    setCookie(
      data.tokens.access.value,
      data.tokens.access.cookieOptions,
      "access"
    );
    setCookie(data.tokens.id.value, data.tokens.id.cookieOptions, "id");
    setCookie(
      data.tokens.refresh.value,
      data.tokens.refresh.cookieOptions,
      "refresh"
    );
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
async function loginWithTokenAndUuid({ token, uuid }) {
  if (!token) token = getQueryAttr("token");
  if (!uuid) uuid = getQueryAttr("uuid");
  if (!token || !uuid) return;

  const { data } = await axios.put(`${apiUrl}auth/link`, {
    token,
    uuid,
    tenantId: store.tenantId,
  });

  if (data.tokens) {
    setCookie(
      data.tokens.access.value,
      data.tokens.access.cookieOptions,
      "access"
    );
    setCookie(data.tokens.id.value, data.tokens.id.cookieOptions, "id");
    setCookie(
      data.tokens.refresh.value,
      data.tokens.refresh.cookieOptions,
      "refresh"
    );
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

/**
 * Redirect to path portion of a URL.
 */
function redirectToPath(pathOrUrl) {
  if (!pathOrUrl) return;
  const el = document.createElement("a");
  el.href = pathOrUrl;
  let path = `${el.pathname}${el.hash}${el.search}`;
  if (el.pathname !== window.location.pathname) {
    window.location.href = path;
  }
}

async function logout() {
  const token = Cookies.get(store.accessTokenName);
  if (!token) return;

  try {
    const { data } = await axios.get(`${apiUrl}auth/logout`, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    removeCookie(store.accessTokenName);
    removeCookie(store.idTokenName);
    removeCookie(store.refreshTokenName);
    window.location.href = data.redirectTo;
  } catch (err) {}
}

function setCookie(token, options, type) {
  const cookieName = `${type}.${store.tenantId}`;
  options = options || {
    secure: store.mode === "live",
    sameSite: "Lax",
  };
  if (type === "refresh") {
    options.sameSite = "Strict";
  }
  Cookies.set(cookieName, token, options);
}

function removeCookie(name) {
  Cookies.remove(name);
  Cookies.remove(name, { secure: true, sameSite: "Lax" });
  Cookies.remove(name, { secure: true, sameSite: "None" });
  Cookies.remove(name, { secure: false, sameSite: "Lax" });
  Cookies.remove(name, { secure: false, sameSite: "None" });
}

export default {
  setMode,
  init,
  isTestHostname,
  login,
  loginWithTokenAndUuid,
  logout,
  sendLoginLink,
  sendResetLink,
  setCookie,
  signup,
  store,
};
