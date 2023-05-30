import { post } from "./api.js";
import { setCookiesAndTokens } from "./cookies.js";
import { store } from "./store.js";
import { defaultHandleRedirect } from "./url.js";
import { throwFormattedError } from "./utils.js";
import { exchange } from "./refresh.js";
import { getMfaHeaders, handleMfaRequired } from "./authentication.js";
import { getPkceRequestQueryParams, redirectWithPkce } from "./pkce.js";

/**
 * Log a user in with email/username and password using the password/migrate endpoint.
 * Redirect the browser after successful login based on the redirectTo value returned.
 * @param {Object} params
 * @param {string} params.email The user's email. One of email/username/emailOrUsername should be present.
 * @param {string} params.username The user's username. One of email/username/emailOrUsername should be present.
 * @param {string} params.emailOrUsername Either the user's email or username. One of email/username/emailOrUsername should be present.
 * @param {string} params.password
 * @param {string | boolean} params.redirect
 *  URL to redirect to after login, or false to suppress redirect. Otherwise, redirects to the after-login path set on the server.
 * @param {function} params.handleUpstreamResponse Function to run after receiving response, but before handling tokens
 * @param {function} params.handleTokens Function to run after handling upstream response, but before redirection
 * @param {function} params.handleRedirect Function to run after handling tokens
 * @param {object} params.options
 * @param {boolean} params.options.noResetEmail
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

    // Handle upstreamResponse
    if (typeof handleUpstreamResponse === "function") {
      await handleUpstreamResponse(data.upstreamResponse, data);
    }

    // Handle tokens
    if (data.hasOwnProperty("tokens")) {
      if (typeof handleTokens === "function") {
        await handleTokens(data.tokens, data);
      } else {
        setCookiesAndTokens(data.tokens);
        await exchange(data);
      }
    }

    // Handle redirectTo
    if (typeof handleRedirect === "function") {
      await handleRedirect(data.redirectTo, data);
    } else {
      defaultHandleRedirect(redirect, data);
    }

    // Handle authorizationCode for PKCE
    if (data.hasOwnProperty("authorizationCode")) {
      const url = redirect || data.redirectTo;
      if (url) {
        redirectWithPkce(url, data.authorizationCode);
        return;
      } else {
        throw new Error("Missing PKCE redirect url");
      }
    }

    return data;
  } catch (error) {
    throwFormattedError(error);
  }
}
