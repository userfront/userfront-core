import { post } from "./api.js";
import { store } from "./store.js";
import { throwFormattedError } from "./utils.js";
import { handleLoginResponse } from "./authentication.js";
import { getMfaHeaders } from "./mfa.js";
import { getPkceRequestQueryParams } from "./pkce.js";

/**
 * Log a user in with email/username and password using the password/migrate endpoint.
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
export async function loginWithPasswordMigrate({
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

    // Make the request to password/migrate
    const { data } = await post(`/auth/password/migrate`, body, {
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
