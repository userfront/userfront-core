import { get, post } from "./api.js";
import { store } from "./store.js";
import { throwFormattedError } from "./utils.js";
import { handleLoginResponse } from "./authentication.js";
import { isFirstFactorTokenPresent, getMfaHeaders } from "./mfa.js";
import { getPkceRequestQueryParams } from "./pkce.js";

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
  handleUpstreamResponse,
  handleMfaRequired,
  handlePkceRequired,
  handleTokens,
  handleRedirect,
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

export async function getTotp() {
  try {
    if (isFirstFactorTokenPresent()) {
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
