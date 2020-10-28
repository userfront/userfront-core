const axios = require("axios");
const Cookies = require("js-cookie");

const apiUrl = `https://api.userfront.com/v0/`;
const privateIPRegex = /((^127\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^192\.168\.))\d{1,3}\.\d{1,3}/g;
const isDevHostname = () => {
  try {
    const hostname = window.location.hostname;
    return (
      hostname.match(/localhost/g) ||
      hostname.match(/file/g) ||
      hostname.match(privateIPRegex)
    );
  } catch (err) {
    return true;
  }
};

const scope = {
  mode: isDevHostname() ? "test" : "live",
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
  signup,
  getMode,
  setCookie,
};
