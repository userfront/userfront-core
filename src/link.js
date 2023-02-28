import { post, put } from "./api.js";
import { setCookiesAndTokens } from "./cookies.js";
import { store } from "./store.js";
import { getQueryAttr, handleRedirect } from "./url.js";
import { exchange } from "./refresh.js";
import { throwFormattedError } from "./utils.js";
import {
  getMfaHeaders,
  handleMfaRequired,
  clearMfa,
} from "./authentication.js";
import { getPkceRequestQueryParams, redirectWithPkce } from "./pkce.js";

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

    const { data } = await put(
      "/auth/link",
      {
        token,
        uuid,
        tenantId: store.tenantId,
      },
      {
        headers: getMfaHeaders(),
        params: getPkceRequestQueryParams()
      }
    );

    if (data.hasOwnProperty("tokens")) {
      clearMfa();
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
        // We can't exchange the authorizationCode for tokens, because we don't have the verifier code
        // that matches our challenge code.
        throw new Error("Received a PKCE (mobile auth) response from the server, but no redirect was provided. Please set the redirect to the app that initiated the request.")
      }
    }

    throw new Error("Problem logging in.");
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
