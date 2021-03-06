import axios from "axios";
import { apiUrl } from "./constants.js";
import { setCookiesAndTokens } from "./cookies.js";
import { store } from "./store.js";
import { getQueryAttr, redirectToPath } from "./url.js";
import { exchange } from "./refresh.js";
import { throwFormattedError } from "./utils.js";

/**
 * This file has methods for signing up and logging in
 */

/**
 * Register a user via the provided method. This method serves to call other
 * methods, depending on the "method" parameter passed in.
 * @param {String} method
 * @param {String} username
 * @param {String} name
 * @param {String} email
 * @param {String} password
 * @param {Object} data - Object for custom user fields
 */
export async function signup({
  method,
  username,
  name,
  email,
  password,
  data,
} = {}) {
  if (!method) {
    throw new Error('Userfront.signup called without "method" property.');
  }
  switch (method) {
    case "azure":
    case "facebook":
    case "github":
    case "google":
    case "linkedin":
      return signupWithSSO(method);
    case "password":
      return signupWithPassword({
        username,
        name,
        email,
        password,
        userData: data,
      });
    default:
      throw new Error(
        'Userfront.signup called with invalid "method" property.'
      );
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
 * @param {String} username
 * @param {String} name
 * @param {String} email
 * @param {String} password
 * @param {Object} userData - alias for the user.data object, since "data" is used in the response
 */
async function signupWithPassword({
  username,
  name,
  email,
  password,
  userData,
}) {
  try {
    const { data } = await axios.post(`${apiUrl}auth/create`, {
      tenantId: store.tenantId,
      username,
      name,
      email,
      password,
      data: userData,
    });
    if (data.tokens) {
      setCookiesAndTokens(data.tokens);
      await exchange(data);
      redirectToPath(getQueryAttr("redirect") || data.redirectTo || "/");
    } else {
      throw new Error("Please try again.");
    }
  } catch (error) {
    if (error?.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
}

/**
 * Log a user in via the provided method. This method serves to call other
 * methods, depending on the "method" parameter passed in.
 * @param {Object} options
 */
export async function login({
  method,
  email,
  username,
  emailOrUsername,
  password,
  token,
  uuid,
} = {}) {
  if (!method) {
    throw new Error('Userfront.login called without "method" property.');
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
      throw new Error('Userfront.login called with invalid "method" property.');
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

export function getProviderLink(provider) {
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
  try {
    const { data } = await axios.post(`${apiUrl}auth/basic`, {
      tenantId: store.tenantId,
      emailOrUsername: email || username || emailOrUsername,
      password,
    });
    if (data.tokens) {
      setCookiesAndTokens(data.tokens);
      await exchange(data);
      redirectToPath(getQueryAttr("redirect") || data.redirectTo || "/");
    } else {
      throw new Error("Please try again.");
    }
  } catch (error) {
    throwFormattedError(error);
  }
}

/**
 * Log a user in with a token/uuid combo passed into the function or
 * in the URL querystring. ?token=...&uuid=...
 * @param {String} token
 * @param {UUID} uuid
 */
async function loginWithLink(token, uuid) {
  try {
    token = token || getQueryAttr("token");
    uuid = uuid || getQueryAttr("uuid");
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
  } catch (error) {
    throwFormattedError(error);
  }
}

/**
 * Send a login link to the provided email.
 * @param {String} email
 */
export async function sendLoginLink(email) {
  try {
    const { data } = await axios.post(`${apiUrl}auth/link`, {
      email,
      tenantId: store.tenantId,
    });
    return data;
  } catch (err) {
    throw new Error("Problem sending link.");
  }
}

/**
 * Send a password reset link to the provided email.
 * @param {String} email
 */
export async function sendResetLink(email) {
  try {
    const { data } = await axios.post(`${apiUrl}auth/reset/link`, {
      email,
      tenantId: store.tenantId,
    });
    return data;
  } catch (err) {
    throw new Error("Problem sending link.");
  }
}

export async function resetPassword({ uuid, token, password }) {
  try {
    token = token || getQueryAttr("token");
    uuid = uuid || getQueryAttr("uuid");
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
  } catch (error) {
    throwFormattedError(error);
  }
}
