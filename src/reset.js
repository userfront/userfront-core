import axios from "axios";
import { setCookiesAndTokens } from "./cookies.js";
import { store } from "./store.js";
import { getQueryAttr, redirectToPath } from "./url.js";
import { throwFormattedError } from "./utils.js";

/**
 * Send a password reset link to the provided email.
 * @param {String} email
 */
export async function sendResetLink(email) {
  try {
    const { data } = await axios.post(`${store.baseUrl}auth/reset/link`, {
      email,
      tenantId: store.tenantId,
    });
    return data;
  } catch (error) {
    throwFormattedError(error);
  }
}

export async function resetPassword({ uuid, token, password, redirect }) {
  try {
    token = token || getQueryAttr("token");
    uuid = uuid || getQueryAttr("uuid");
    if (!token || !uuid) throw new Error("Missing token or uuid");
    const { data } = await axios.put(`${store.baseUrl}auth/reset`, {
      tenantId: store.tenantId,
      uuid,
      token,
      password,
    });
    if (data.tokens) {
      setCookiesAndTokens(data.tokens);

      // Return if redirect is explicitly false
      if (redirect === false) return data;

      redirectToPath(
        redirect || getQueryAttr("redirect") || data.redirectTo || "/"
      );

      return data;
    } else {
      throw new Error(
        "There was a problem resetting your password. Please try again."
      );
    }
  } catch (error) {
    throwFormattedError(error);
  }
}

export async function setPassword({ password, existingPassword }) {
  try {
    if (!store.tokens.accessToken) {
      throw new Error(
        "No access token found. You must be authenticated to use this function."
      );
    }

    const { data } = await axios.put(
      `${store.baseUrl}auth/basic`,
      {
        tenantId: store.tenantId,
        password,
        existingPassword,
      },
      {
        headers: {
          Authorization: `Bearer ${store.tokens.accessToken}`,
        },
      }
    );

    return data;
  } catch (error) {
    throwFormattedError(error);
  }
}
