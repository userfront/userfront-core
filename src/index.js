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

const scope = {
  mode: isTestHostname() ? "test" : "live",
};

function init(tenantId, opts = {}) {
  if (!tenantId) return console.warn("Userfront initialized without tenant ID");
  scope.tenantId = tenantId;
  scope.signupModId = opts.signup;
  scope.loginModId = opts.login;
  scope.logoutModId = opts.logout;
  scope.resetModId = opts.reset;
  scope.accessTokenName = `access.${tenantId}`;
  scope.idTokenName = `id.${tenantId}`;
  scope.refreshTokenName = `refresh.${tenantId}`;
}

async function getMode() {
  try {
    const { data } = await axios.get(`${apiUrl}tenants/${scope.tenantId}/mode`);
    scope.mode = data.mode || "test";
  } catch (err) {
    scope.mode = "test";
  }
}

async function signup({ username, name, email, password }) {
  const { data } = await axios.post(`${apiUrl}auth/create`, {
    tenantId: scope.tenantId,
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
    window.location.href = data.redirectTo;
  } else {
    throw new Error("Please try again.");
  }
}

function redirectTo(url) {
  try {
  } catch (err) {}
}

async function logout() {
  const token = Cookies.get(scope.accessTokenName);
  if (!token) return;

  try {
    const { data } = await axios.get(`${apiUrl}/auth/logout`, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    removeCookie(scope.accessTokenName);
    removeCookie(scope.idTokenName);
    removeCookie(scope.refreshTokenName);
    window.location.href = data.redirectTo;
  } catch (err) {}
}

function setCookie(token, options, type) {
  const cookieName = `${type}.${scope.tenantId}`;
  options = options || {
    secure: scope.mode === "live",
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
  getMode,
  init,
  isTestHostname,
  logout,
  scope,
  setCookie,
  signup,
};
