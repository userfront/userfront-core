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

function init(tenantId, opts = {}) {
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
  logout,
  setCookie,
  signup,
  store,
};
