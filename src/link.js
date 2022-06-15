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
export async function loginWithLink({ token, uuid, redirect } = {}) {
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
 * Send a login link to the provided email.
 * @param {String} email
 */
export async function sendLoginLink(email) {
  try {
    const { data } = await axios.post(`${store.baseUrl}auth/link`, {
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
    const { data } = await axios.post(`${store.baseUrl}auth/link`, {
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
