import axios from "axios";
import { setCookiesAndTokens } from "./cookies.js";
import { store } from "./store.js";
import { getQueryAttr, redirectToPath } from "./url.js";
import { exchange } from "./refresh.js";
import { throwFormattedError } from "./utils.js";

/**
 * Send an SMS to a phone number
 * @param {String} type Type of SMS to send
 * @param {String} to Phone number in E.164 format
 * @param {String} firstFactorCode Identifier obtained from login() response
 * @returns {Object}
 */
export async function sendSms({ type, to, firstFactorCode } = {}) {
  if (!type) {
    throw new Error('Userfront.sendSms called without "type" property.');
  }

  switch (type) {
    case "verificationCode":
      if (!to || !firstFactorCode) {
        throw new Error(
          'Userfront.sendSms type "verificationCode" requires "to" and "firstFactorCode".'
        );
      }

      return sendVerificationCode({
        firstFactorCode,
        to,
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
 * @param {String} to Phone number in E.164 format
 * @returns {Object}
 */
export async function sendVerificationCode({
  firstFactorCode,
  strategy,
  channel,
  to,
} = {}) {
  if (!firstFactorCode || !strategy || !channel || !to) {
    throw new Error("Userfront.sendVerificationCode missing parameters.");
  }

  try {
    const { data } = await axios.post(`${store.baseUrl}auth/mfa`, {
      tenantId: store.tenantId,
      firstFactorCode,
      strategy,
      channel,
      to,
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
export async function loginWithVerificationCode({
  firstFactorCode,
  verificationCode,
  redirect,
} = {}) {
  if (!firstFactorCode || !verificationCode) {
    throw new Error("Userfront.loginWithVerificationCode missing parameters.");
  }

  try {
    const { data } = await axios.put(`${store.baseUrl}auth/mfa`, {
      tenantId: store.tenantId,
      firstFactorCode,
      verificationCode,
    });

    setCookiesAndTokens(data.tokens);
    await exchange(data);
    if (redirect === false) {
      return data;
    }

    redirectToPath(
      redirect || getQueryAttr("redirect") || data.redirectTo || "/"
    );
    return data;
  } catch (error) {
    throwFormattedError(error);
  }
}
