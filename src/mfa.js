import axios from "axios";
import { setCookiesAndTokens } from "./cookies.js";
import { store } from "./store.js";
import { getQueryAttr, redirectToPath } from "./url.js";
import { exchange } from "./refresh.js";
import { throwFormattedError } from "./utils.js";

/**
 * Request a security code for MFA
 * @param {String} firstFactorCode
 * @param {String} strategy
 * @param {String} channel
 * @param {String} to
 * @returns {Object}
 */
export async function requestCode({
  firstFactorCode,
  strategy,
  channel,
  to,
} = {}) {
  if (!firstFactorCode || !strategy || !channel || !to) {
    throw new Error("Userfront.requestCode missing parameters.");
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
 * Submit a security code for MFA
 * @param {String} firstFactorCode
 * @param {String} strategy
 * @param {String} to
 * @param {String} securityCode
 * @param {String|Boolean} redirect Redirect to given path unless specified as `false`
 * @returns {Object}
 */
export async function submitCode({
  firstFactorCode,
  strategy,
  to,
  securityCode,
  redirect,
} = {}) {
  if (!firstFactorCode || !strategy || !to || !securityCode) {
    throw new Error("Userfront.submitCode missing parameters.");
  }

  try {
    const { data } = await axios.put(`${store.baseUrl}auth/mfa`, {
      tenantId: store.tenantId,
      firstFactorCode,
      strategy,
      to,
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
