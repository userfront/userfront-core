const axios = require("axios");
const Cookies = require("js-cookie");

const { apiUrl, privateIPRegex } = require("./constants");

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

module.exports = {
  init,
  isTestHostname,
  signup,
  getMode,
  setCookie,
};
