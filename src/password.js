import { post, put } from "./api.js";
import { setCookiesAndTokens } from "./cookies.js";
import { store } from "./store.js";
import { getQueryAttr, handleRedirect } from "./url.js";
import { throwFormattedError } from "./utils.js";
import { exchange } from "./refresh.js";
import {
  getMfaHeaders,
  handleMfaRequired,
  clearMfa,
} from "./authentication.js";
import { getPkceRequestQueryParams, redirectWithPkce } from "./pkce.js";

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
export async function signupWithPassword({
  username,
  name,
  email,
  password,
  userData,
  redirect,
} = {}) {
  try {
    const { data } = await post(
      `/auth/create`,
      {
        tenantId: store.tenantId,
        username,
        name,
        email,
        password,
        data: userData,
      },
      {
        headers: getMfaHeaders(),
        params: getPkceRequestQueryParams(),
      }
    );
    if (data.tokens) {
      clearMfa();
      setCookiesAndTokens(data.tokens);
      await exchange(data);
      handleRedirect({ redirect, data });
      return data;
    } else if (data.firstFactorToken) {
      handleMfaRequired(data);
      return data;
    } else if (data.authorizationCode) {
      const url = redirect || data.redirectTo;
      if (url) {
        redirectWithPkce(url, data.authorizationCode);
      } else {
        // We can't exchange the authorizationCode for tokens, because we don't have the verifier code
        // that matches our challenge code.
        throw new Error("Received a PKCE (mobile auth) response from the server, but no redirect was provided. Please set the redirect to the app that initiated the request.")
      }
    } else {
      throw new Error("Please try again.");
    }
  } catch (error) {
    throwFormattedError(error);
  }
}

/**
 * Log a user in with email/username and password.
 * Redirect the browser after successful login based on the redirectTo value returned.
 * @param {Object} params
 * @param {string} params.email The user's email. One of email/username/emailOrUsername should be present.
 * @param {string} params.username The user's username. One of email/username/emailOrUsername should be present.
 * @param {string} params.emailOrUsername Either the user's email or username. One of email/username/emailOrUsername should be present.
 * @param {string} params.password
 * @param {string | boolean} params.redirect 
 *  URL to redirect to after login, or false to suppress redirect. Otherwise, redirects to the after-login path set on the server.
 * @param {object} params.options
 * @param {boolean} params.options.noResetEmail
 *  By default, Userfront sends a password reset email if a user without a password tries to log in with a password.
 *  Set options.noResetEmail = true to override this behavior and return an error instead.
 * 
 */
export async function loginWithPassword({
  email,
  username,
  emailOrUsername,
  password,
  redirect,
  options
}) {
  try {
    const body = {
      tenantId: store.tenantId,
      emailOrUsername: email || username || emailOrUsername,
      password,
    };
    if (options && options.noResetEmail) {
      body.options = {
        noResetEmail: true
      }
    }
    const { data } = await post(
      `/auth/basic`,
      body,
      {
        headers: getMfaHeaders(),
        params: getPkceRequestQueryParams(),
      }
    );

    if (data.hasOwnProperty("tokens")) {
      setCookiesAndTokens(data.tokens);
      await exchange(data);
      handleRedirect({ redirect, data });
      return data;
    }

    if (data.hasOwnProperty("firstFactorToken")) {
      handleMfaRequired(data);
      return data;
    }

    if (data.authorizationCode) {
      const url = redirect || data.redirectTo;
      if (url) {
        redirectWithPkce(url, data.authorizationCode);
        return;
      } else {
        // TODO this is neither valid nor invalid
      }
    }

    throw new Error("Please try again.");
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
    const { data } = await post(`/auth/reset/link`, {
      email,
      tenantId: store.tenantId,
    });
    return data;
  } catch (error) {
    throwFormattedError(error);
  }
}

/**
 * Set a user's password with their link credentials or JWT access token.
 *
 * If no method is provided, the order is:
 * - Check for link credentials; then
 * - Check for a JWT access token first
 *
 * @property {String} method (optional) "link" or "jwt"
 * @property {String} password
 * @property {String} existingPassword
 * @property {String} uuid
 * @property {String} token
 * @property {String} redirect
 * @returns
 */
export async function updatePassword({
  method,
  password,
  existingPassword,
  uuid,
  token,
  redirect,
}) {
  switch (method) {
    // Allow for explicit setting of method
    case "link":
      return updatePasswordWithLink({ uuid, token, password, redirect });
    case "jwt":
      return updatePasswordWithJwt({ password, existingPassword });
    default:
      // Default (no method provided) is to look for link credentials first, then JWT access token
      token = token || getQueryAttr("token");
      uuid = uuid || getQueryAttr("uuid");
      if (uuid && token) {
        return updatePasswordWithLink({ uuid, token, password, redirect });
      } else if (store.tokens.accessToken) {
        return updatePasswordWithJwt({ password, existingPassword });
      } else {
        throw new Error(
          "updatePassword() was called without link credentials (token & uuid) or a JWT access token."
        );
      }
  }
}

export const resetPassword = updatePassword;

export async function updatePasswordWithLink({
  uuid,
  token,
  password,
  redirect,
}) {
  try {
    token = token || getQueryAttr("token");
    uuid = uuid || getQueryAttr("uuid");
    if (!token || !uuid) throw new Error("Missing token or uuid");
    const { data } = await put(`/auth/reset`, {
      tenantId: store.tenantId,
      uuid,
      token,
      password,
    });
    if (data.tokens) {
      setCookiesAndTokens(data.tokens);
      handleRedirect({ redirect, data });
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

export async function updatePasswordWithJwt({ password, existingPassword }) {
  try {
    if (!store.tokens.accessToken) {
      throw new Error(
        `updatePassword({ method: "jwt" }) was called without a JWT access token.`
      );
    }

    const { data } = await put(
      `/auth/basic`,
      {
        tenantId: store.tenantId,
        password,
        existingPassword,
      },
      {
        headers: {
          Authorization: `Bearer ${store.tokens.accessToken}`,
        },
      }
    );

    return data;
  } catch (error) {
    throwFormattedError(error);
  }
}
