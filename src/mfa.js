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
    case "securityCode":
      if (!to || !firstFactorCode) {
        throw new Error(
          'Userfront.sendSms type "securityCode" requires "to" and "firstFactorCode".'
        );
      }

      return sendSecurityCode({
        firstFactorCode,
        to,
        strategy: "securityCode",
        channel: "sms",
      });
    default:
      throw new Error('Userfront.sendSms called with invalid "type" property.');
  }
}

/**
 * Send an MFA security code
 * @param {String} firstFactorCode Identifier obtained from login() response
 * @param {String} strategy Type of MFA strategy
 * @param {String} channel Method of sending the security code
 * @param {String} to Phone number in E.164 format
 * @returns {Object}
 */
export async function sendSecurityCode({
  firstFactorCode,
  strategy,
  channel,
  to,
} = {}) {
  if (!firstFactorCode || !strategy || !channel || !to) {
    throw new Error("Userfront.sendSecurityCode missing parameters.");
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
 * Log in using firstFactorCode and MFA security code
 * @param {String} firstFactorCode Identifier obtained from login() response
 * @param {String} securityCode Code provided by the user
 * @param {String|Boolean} redirect Redirect to given path unless specified as `false`
 * @returns {Object}
 */
export async function loginWithSecurityCode({
  firstFactorCode,
  securityCode,
  redirect,
} = {}) {
  if (!firstFactorCode || !securityCode) {
    throw new Error("Userfront.loginWithSecurityCode missing parameters.");
  }

  try {
    const { data } = await axios.put(`${store.baseUrl}auth/mfa`, {
      tenantId: store.tenantId,
      firstFactorCode,
      securityCode,
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
