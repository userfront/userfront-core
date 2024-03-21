import Cookies from "js-cookie";
import { get } from "./api.js";
import { setCookiesAndTokens } from "./authentication.js";
import { store } from "./store.js";
import { throwFormattedError } from "./utils.js";

/**
 * Refresh the access and ID tokens
 * - When in test mode, uses the basic refresh method
 * - For tenants without a custom SSL certificate, uses the basic refresh method
 * - For tenants with a custom SSL certificate and in live mode, uses the httpOnly refresh method
 * @returns {Promise}
 */
export async function refresh() {
  try {
    await basicRefresh();
  } catch (error) {
    console.warn(`Refresh failed: ${error.message}`);
  }
}

/**
 * Use a regular (non-httpOnly) cookie to refresh the access and ID tokens.
 *
 * The basic refresh method is used automatically in test mode and in live
 * mode whenever an SSL certificate has not been set up.
 */
async function basicRefresh() {
  const refreshToken = Cookies.get(store.tokens.refreshTokenName);
  try {
    const { data, status } = await get(`/auth/refresh`, {
      headers: {
        authorization: `Bearer ${refreshToken}`,
      },
    });
    if (status !== 200) {
      throw new Error(data.message || "Problem with request");
    }
    if (data.tokens) {
      setCookiesAndTokens(data.tokens);
      return data;
    } else {
      throw new Error("Problem setting cookies");
    }
  } catch (error) {
    throwFormattedError(error);
  }
}
