import axios from "axios";
import { setCookiesAndTokens } from "./cookies.js";
import { store } from "./store.js";
import { getQueryAttr, redirectToPath } from "./url.js";
import { exchange } from "./refresh.js";
import { throwFormattedError } from "./utils.js";
import { loginWithVerificationCode } from "./mfa.js";
import { loginWithLink, sendPasswordlessLink } from "./link.js";
import { signonWithSso } from "./sso.js";

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
    case "apple":
    case "azure":
    case "facebook":
    case "github":
    case "google":
    case "linkedin":
      return signonWithSso({ provider: method, redirect });
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
    const { data } = await axios.post(`${store.baseUrl}auth/create`, {
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
  firstFactorCode,
  verificationCode,
  redirect,
} = {}) {
  if (!method) {
    throw new Error('Userfront.login called without "method" property.');
  }
  switch (method) {
    case "apple":
    case "azure":
    case "facebook":
    case "github":
    case "google":
    case "linkedin":
      return signonWithSso({ provider: method, redirect });
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
    case "mfa":
      return loginWithVerificationCode({
        firstFactorCode,
        verificationCode,
        redirect,
      });
    case "saml":
      return completeSamlLogin();
    default:
      throw new Error('Userfront.login called with invalid "method" property.');
  }
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
    const { data } = await axios.post(`${store.baseUrl}auth/basic`, {
      tenantId: store.tenantId,
      emailOrUsername: email || username || emailOrUsername,
      password,
    });

    if (data.hasOwnProperty("tokens")) {
      setCookiesAndTokens(data.tokens);
      await exchange(data);
      if (redirect === false) return data;
      redirectToPath(
        redirect || getQueryAttr("redirect") || data.redirectTo || "/"
      );
      return data;
    }

    if (data.hasOwnProperty("firstFactorCode")) {
      return data;
    }

    throw new Error("Please try again.");
  } catch (error) {
    throwFormattedError(error);
  }
}

async function completeSamlLogin() {
  try {
    if (!store.tokens.accessToken) {
      return console.warn("Cannot complete SAML login without access token");
    }

    const { data } = await axios.get(`${store.baseUrl}auth/saml/idp/token`, {
      headers: {
        authorization: `Bearer ${store.tokens.accessToken}`,
      },
    });

    window.location.assign(
      `${store.baseUrl}auth/saml/idp/login?tenant_id=${store.tenantId}&token=${data.token}&uuid=${store.user.userUuid}`
    );
  } catch (error) {
    throwFormattedError(error);
  }
}
