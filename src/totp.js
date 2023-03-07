import { get, post } from "./api.js";
import { setCookiesAndTokens } from "./cookies.js";
import { store } from "./store.js";
import { handleRedirect } from "./url.js";
import { exchange } from "./refresh.js";
import { throwFormattedError } from "./utils.js";
import {
  isMfaRequired,
  getMfaHeaders,
  handleMfaRequired,
  clearMfa,
} from "./authentication.js";
import { getPkceRequestQueryParams, redirectWithPkce } from "./pkce.js";

/**
 * Log a user in with a TOTP authenticator code or a TOTP backup code,
 * plus an identifier for the user (e.g. userId, userUuid, or email)
 *
 * @property {String} totpCode "123456"
 * @property {String} backupCode "aaaaa-bbbbb"
 * @property {Integer} userId
 * @property {String} userUuid
 * @property {String} emailOrUsername
 * @property {String} email
 * @property {String} username
 * @property {String} phoneNumber
 * @property {String|Boolean} redirect - do not redirect if false, or redirect to given path
 */
export async function loginWithTotp({
  totpCode,
  backupCode,
  userId,
  userUuid,
  emailOrUsername,
  email,
  username,
  phoneNumber,
  redirect,
} = {}) {
  try {

    const { data } = await post(
      `/auth/totp`,
      {
        totpCode,
        backupCode,
        userId,
        userUuid,
        emailOrUsername,
        email,
        username,
        phoneNumber,
        tenantId: store.tenantId,
      },
      {
        headers: getMfaHeaders(),
        params: getPkceRequestQueryParams(),
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

export async function getTotp() {
  try {
    if (isMfaRequired()) {
      const { data } = await get(`/auth/totp`, {
        headers: getMfaHeaders(),
      });
      return data;
    }
    if (!store.tokens.accessToken) {
      throw new Error(`getTotp() was called without a JWT access token.`);
    }

    const { data } = await get(`/auth/totp`, {
      headers: {
        Authorization: `Bearer ${store.tokens.accessToken}`,
      },
    });

    return data;
  } catch (error) {
    throwFormattedError(error);
  }
}
