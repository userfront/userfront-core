import { post, put } from "./api.js";
import { setCookiesAndTokens } from "./authentication.js";
import { store } from "./store.js";
import { getQueryAttr, defaultHandleRedirect } from "./url.js";
import { throwFormattedError } from "./utils.js";
import { handleLoginResponse } from "./authentication.js";
import { getMfaHeaders } from "./mfa.js";
import { getPkceRequestQueryParams } from "./pkce.js";

/**
 * Register a new user with username, name, email, and password.
 * Redirect the browser after successful signup based on the redirectTo value returned.
 * @property {String} username
 * @property {String} name
 * @property {String} email
 * @property {String} password
 * @property {Object} userData - alias for the user.data object, since "data" is used in the response
 * @property {String} redirect - do not redirect if false, or redirect to a specific path
 * @property {Function} handleUpstreamResponse
 * @property {Function} handleMfaRequired
 * @property {Function} handlePkceRequired
 * @property {Function} handleTokens
 * @property {Function} handleRedirect
 */
export async function signupWithPassword({
  username,
  name,
  email,
  password,
  userData,
  redirect,
  handleUpstreamResponse,
  handleMfaRequired,
  handlePkceRequired,
  handleTokens,
  handleRedirect,
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

    // Handle the API response to the login request
    return handleLoginResponse({
      data,
      redirect,
      handleUpstreamResponse,
      handleMfaRequired,
      handlePkceRequired,
      handleTokens,
      handleRedirect,
    });
  } catch (error) {
    throwFormattedError(error);
  }
}

/**
 * Log a user in with email/username and password.
 * Redirect the browser after successful login based on the redirectTo value returned.
 * @property {String} email The user's email. One of email/username/emailOrUsername should be present.
 * @property {String} username The user's username. One of email/username/emailOrUsername should be present.
 * @property {String} emailOrUsername Either the user's email or username. One of email/username/emailOrUsername should be present.
 * @property {String} password
 * @property {String|Boolean} redirect
 *  URL to redirect to after login, or false to suppress redirect. Otherwise, redirects to the after-login path set on the server.
 * @property {Function} handleUpstreamResponse
 * @property {Function} handleMfaRequired
 * @property {Function} handlePkceRequired
 * @property {Function} handleTokens
 * @property {Function} handleRedirect
 * @property {Object} options
 * @property {Boolean} options.noResetEmail
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
  handleUpstreamResponse,
  handleMfaRequired,
  handlePkceRequired,
  handleTokens,
  handleRedirect,
  options,
}) {
  try {
    const body = {
      tenantId: store.tenantId,
      emailOrUsername: email || username || emailOrUsername,
      password,
    };
    if (options && options.noResetEmail) {
      body.options = {
        noResetEmail: true,
      };
    }
    const { data } = await post(`/auth/basic`, body, {
      headers: getMfaHeaders(),
      params: getPkceRequestQueryParams(),
    });

    // Handle the API response to the login request
    return handleLoginResponse({
      data,
      redirect,
      handleUpstreamResponse,
      handleMfaRequired,
      handlePkceRequired,
      handleTokens,
      handleRedirect,
    });
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
 * @property {Function} handleUpstreamResponse - 
 * @property {Function} handleMfaRequired
 * @property {Function} handlePkceRequired
 * @property {Function} handleTokens
 * @property {Function} handleRedirect
 * @returns
 */
export async function updatePassword({
  method,
  password,
  existingPassword,
  uuid,
  token,
  redirect,
  handleUpstreamResponse,
  handleMfaRequired,
  handlePkceRequired,
  handleTokens,
  handleRedirect,
}) {
  switch (method) {
    // Allow for explicit setting of method
    case "link":
      return updatePasswordWithLink({
        uuid,
        token,
        password,
        redirect,
        handleUpstreamResponse,
        handleMfaRequired,
        handlePkceRequired,
        handleTokens,
        handleRedirect,
      });
    case "jwt":
      return updatePasswordWithJwt({ password, existingPassword });
    default:
      // Default (no method provided) is to look for link credentials first, then JWT access token
      token = token || getQueryAttr("token");
      uuid = uuid || getQueryAttr("uuid");
      if (uuid && token) {
        return updatePasswordWithLink({
          uuid,
          token,
          password,
          redirect,
          handleUpstreamResponse,
          handleMfaRequired,
          handlePkceRequired,
          handleTokens,
          handleRedirect,
        });
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
  handleUpstreamResponse,
  handleMfaRequired,
  handlePkceRequired,
  handleTokens,
  handleRedirect,
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
    return handleLoginResponse({
      data,
      redirect,
      handleUpstreamResponse,
      handleMfaRequired,
      handlePkceRequired,
      handleTokens,
      handleRedirect,
    });
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
