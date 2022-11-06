import { get, post } from "./api.js";
import { setCookiesAndTokens } from "./cookies.js";
import { store } from "./store.js";
import { handleRedirect } from "./url.js";
import { exchange } from "./refresh.js";
import { throwFormattedError } from "./utils.js";
import { isMfaRequired, getMfaHeaders, handleMfaRequired, clearMfa } from "./mfa.js";

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
    if (!totpCode && !backupCode) return;

    const { data } = await post(`/auth/totp`, {
      totpCode,
      backupCode,
      userId,
      userUuid,
      emailOrUsername,
      email,
      username,
      phoneNumber,
      tenantId: store.tenantId,
    }, {
      headers: getMfaHeaders()
    });

    if (data.hasOwnProperty("tokens")) {
      clearMfa();
      setCookiesAndTokens(data.tokens);
      await exchange(data);
      handleRedirect({ redirect, data });
      return data;
    }

    if (data.hasOwnProperty("firstFactorCode")) {
      handleMfaRequired(data);
      return data;
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
