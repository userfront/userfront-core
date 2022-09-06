import { setCookiesAndTokens } from "../src/cookies.js";
import { store } from "../src/store.js";
import { handleRedirect } from "../src/url.js";
import { exchange } from "../src/refresh.js";
import { throwFormattedError } from "../src/utils.js";
import { post, put } from "../src/api.js";

/**
 * Send an SMS to a phone number
 * @param {String} type Type of SMS to send
 * @param {String} phoneNumber Phone number in E.164 format
 * @param {String} firstFactorCode Identifier obtained from login() response
 * @returns {Object}
 */
export async function sendSms({ type, phoneNumber, firstFactorCode } = {}) {
  if (!type) {
    throw new Error('Userfront.sendSms called without "type" property.');
  }

  switch (type) {
    case "verificationCode":
      if (!phoneNumber || !firstFactorCode) {
        throw new Error(
          'Userfront.sendSms type "verificationCode" requires "phoneNumber" and "firstFactorCode".'
        );
      }

      return sendMfaCode({
        firstFactorCode,
        phoneNumber,
        strategy: "verificationCode",
        channel: "sms",
      });
    default:
      throw new Error('Userfront.sendSms called with invalid "type" property.');
  }
}

/**
 * Send an MFA verification code
 * @param {String} firstFactorCode Identifier obtained from login() response
 * @param {String} strategy Type of MFA strategy
 * @param {String} channel Method of sending the verification code
 * @param {String} phoneNumber Phone number in E.164 format
 * @returns {Object}
 */
export async function sendMfaCode({
  firstFactorCode,
  strategy,
  channel,
  phoneNumber,
} = {}) {
  if (!firstFactorCode || !strategy || !channel || !phoneNumber) {
    throw new Error("Userfront.sendMfaCode missing parameters.");
  }

  try {
    const { data } = await post(`/auth/mfa`, {
      tenantId: store.tenantId,
      firstFactorCode,
      strategy,
      channel,
      phoneNumber,
    });

    return data;
  } catch (error) {
    throwFormattedError(error);
  }
}

/**
 * Log in using firstFactorCode and MFA verification code
 * @param {String} firstFactorCode Identifier obtained from login() response
 * @param {String} verificationCode Code provided by the user
 * @param {String|Boolean} redirect Redirect to given path unless specified as `false`
 * @returns {Object}
 */
export async function loginWithMfa({
  firstFactorCode,
  verificationCode,
  redirect,
} = {}) {
  if (!firstFactorCode || !verificationCode) {
    throw new Error("Userfront.loginWithMfa missing parameters.");
  }

  try {
    const { data } = await put(`/auth/mfa`, {
      tenantId: store.tenantId,
      firstFactorCode,
      verificationCode,
    });

    setCookiesAndTokens(data.tokens);
    await exchange(data);
    handleRedirect({ redirect, data });
    return data;
  } catch (error) {
    throwFormattedError(error);
  }
}
