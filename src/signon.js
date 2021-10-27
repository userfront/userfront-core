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
 * @param {String} redirect - path to redirect to, or if false, do not redirect
 */
export async function signup({
  method,
  username,
  name,
  email,
  password,
  data,
  redirect,
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
      return signupWithSSO({ provider: method, redirect });
    case "password":
      return signupWithPassword({
        username,
        name,
        email,
        password,
        userData: data,
        redirect,
      });
    case "passwordless":
      return sendPasswordlessLink({ email, name, username, userData: data });
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
function signupWithSSO({ provider, redirect }) {
  if (!provider) throw new Error("Missing provider");
  const url = getProviderLink({ provider, redirect });
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
 * @param {String} redirect - do not redirect if false, or redirect to a specific path
 */
async function signupWithPassword({
  username,
  name,
  email,
  password,
  userData,
  redirect,
} = {}) {
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
      if (redirect === false) return data;
      redirectToPath(
        redirect || getQueryAttr("redirect") || data.redirectTo || "/"
      );
      return data;
    } else {
      throw new Error("Please try again.");
    }
  } catch (error) {
    throwFormattedError(error);
  }
}

/**
 * Log a user in via the provided method. This method serves to call other
 * methods, depending on the "method" parameter passed in.
 * @param {String} method
 * @param {String} email
 * @param {String} username
 * @param {String} emailOrUsername
 * @param {String} password
 * @param {String} token
 * @param {String} uuid
 * @param {String} redirect - do not redirect if false, or redirect to given path
 */
export async function login({
  method,
  email,
  username,
  emailOrUsername,
  password,
  token,
  uuid,
  redirect,
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
      return loginWithSSO({ provider: method, redirect });
    case "password":
      return loginWithPassword({
        email,
        username,
        emailOrUsername,
        password,
        redirect,
      });
    case "passwordless":
      return sendPasswordlessLink({ email });
    case "link":
      return loginWithLink({ token, uuid, redirect });
    default:
      throw new Error('Userfront.login called with invalid "method" property.');
  }
}

/**
 * Log a user in via SSO provider.
 * Redirect the browser after successful authentication and 302 redirect from server.
 * @param {String} provider Name of SSO provider
 * @param {String} redirect - do not redirect if false, or redirect to given path
 */
function loginWithSSO({ provider, redirect }) {
  if (!provider) throw new Error("Missing provider");
  const url = getProviderLink({ provider, redirect });
  window.location.assign(url);
}

export function getProviderLink({ provider, redirect }) {
  if (!provider) throw new Error("Missing provider");
  if (!store.tenantId) throw new Error("Missing tenant ID");

  let url = `https://api.userfront.com/v0/auth/${provider}/login?tenant_id=${store.tenantId}&origin=${window.location.origin}`;

  let redirectTo = redirect || getQueryAttr("redirect");
  if (redirect === false) {
    redirectTo = typeof document === "object" && document.location.pathname;
  }
  if (redirectTo) {
    url += `&redirect=${encodeURIComponent(redirectTo)}`;
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
  redirect,
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
      if (redirect === false) return data;
      redirectToPath(
        redirect || getQueryAttr("redirect") || data.redirectTo || "/"
      );
      return data;
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
 * @param {String} redirect - do not redirect if false, or redirect to given path
 */
export async function loginWithLink({ token, uuid, redirect } = {}) {
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
      await exchange(data);
      if (redirect === false) return data;
      redirectToPath(
        redirect || getQueryAttr("redirect") || data.redirectTo || "/"
      );
      return data;
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
  } catch (error) {
    throwFormattedError(error);
  }
}

/**
 * Create or update a user and send them a link to log in.
 * @param {Object} inputs
 */
export async function sendPasswordlessLink({
  email,
  name,
  username,
  userData,
  options,
}) {
  try {
    const { data } = await axios.post(`${apiUrl}auth/link`, {
      email,
      name,
      username,
      data: userData,
      options,
      tenantId: store.tenantId,
    });
    return data;
  } catch (error) {
    throwFormattedError(error);
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
  } catch (error) {
    throwFormattedError(error);
  }
}

export async function resetPassword({ uuid, token, password, redirect }) {
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

      // Return if redirect is explicitly false
      if (redirect === false) return data;

      redirectToPath(
        redirect || getQueryAttr("redirect") || data.redirectTo || "/"
      );

      return data;
    } else {
      throw new Error(
        "There was a problem resetting your password. Please try again."
      );
    }
  } catch (error) {
    throwFormattedError(error);
  }
}
