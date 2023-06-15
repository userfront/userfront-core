import { post, put } from "./api.js";
import { store } from "./store.js";
import { getQueryAttr } from "./url.js";
import { throwFormattedError } from "./utils.js";
import { handleLoginResponse } from "./authentication.js";
import { getMfaHeaders } from "./mfa.js";
import { getPkceRequestQueryParams } from "./pkce.js";

/**
 * Log a user in with a token/uuid combo passed into the function or
 * in the URL querystring. ?token=...&uuid=...
 * @property {String} token
 * @property {UUID} uuid
 * @property {String} redirect - do not redirect if false, or redirect to given path
 * @property {Function} handleUpstreamResponse
 * @property {Function} handleMfaRequired
 * @property {Function} handlePkceRequired
 * @property {Function} handleTokens
 * @property {Function} handleRedirect
 */
export async function loginWithLink({
  token,
  uuid,
  redirect,
  handleUpstreamResponse,
  handleMfaRequired,
  handlePkceRequired,
  handleTokens,
  handleRedirect,
} = {}) {
  try {
    token = token || getQueryAttr("token");
    uuid = uuid || getQueryAttr("uuid");
    if (!token || !uuid) return;

    const { data } = await put(
      "/auth/link",
      {
        token,
        uuid,
        tenantId: store.tenantId,
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
 * Send a login link to the provided email.
 * @param {String} email
 */
export async function sendLoginLink(email) {
  try {
    const { data } = await post(`/auth/link`, {
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
    const { data } = await post(`/auth/link`, {
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
