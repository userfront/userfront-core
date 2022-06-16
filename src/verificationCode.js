import axios from "axios";
import { setCookiesAndTokens } from "./cookies.js";
import { store } from "./store.js";
import { getQueryAttr, redirectToPath } from "./url.js";
import { exchange } from "./refresh.js";
import { throwFormattedError } from "./utils.js";

/**
 * Log a user in with a token/uuid combo passed into the function or
 * in the URL querystring. ?token=...&uuid=...
 * @param {String} token
 * @param {UUID} uuid
 * @param {String} redirect - do not redirect if false, or redirect to given path
 */
export async function loginWithVerificationCode({
  token,
  uuid,
  redirect,
} = {}) {
  try {
    token = token || getQueryAttr("token");
    uuid = uuid || getQueryAttr("uuid");
    if (!token || !uuid) return;

    const { data } = await axios.put(`${store.baseUrl}auth/link`, {
      token,
      uuid,
      tenantId: store.tenantId,
    });

    if (data.hasOwnProperty("tokens")) {
      setCookiesAndTokens(data.tokens);
      await exchange(data);
      if (redirect === false) return data;
      redirectToPath(
        redirect || getQueryAttr("redirect") || data.redirectTo || "/"
      );
      return data;
    }

    if (data.hasOwnProperty("firstFactorCode")) {
      return data;
    }

    throw new Error("Problem logging in.");
  } catch (error) {
    throwFormattedError(error);
  }
}

/**
 * Send a verification code to the provided email address or phone number.
 * @property {String} channel "sms" (default) or "email"
 * @property {String} phoneNumber
 * @property {String} email
 */
export async function sendVerificationCode({
  channel = "sms",
  phoneNumber,
  email,
}) {
  try {
    // Verify that channel matches identifier
    if (channel === "sms" && !phoneNumber) {
      throw new Error(`SMS verification code requires "phoneNumber"`);
    } else if (channel === "email" && !email) {
      throw new Error(`Email verification code requires "email"`);
    }

    const { data } = await axios.post(`${store.baseUrl}auth/code`, {
      channel,
      email,
      phoneNumber,
      tenantId: store.tenantId,
    });
    return data;
  } catch (error) {
    throwFormattedError(error);
  }
}
