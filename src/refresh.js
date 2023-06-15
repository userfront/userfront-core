import Cookies from "js-cookie";
import { get } from "./api.js";
import { setCookiesAndTokens } from "./authentication.js";
import { store } from "./store.js";
// import { getIframe, postMessageAsPromise } from "./iframe.js";
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

// TODO re-enable httpOnly refresh method once new endpoints are stable [06/15/21]
/**
 *
 * The httpOnly refresh method is only available for tenants with configured
 * SSL certificates while in live mode.
 */
// async function httpOnlyRefresh() {
//   const iframe = getIframe();
//   if (!iframe) return;
//   return postMessageAsPromise({
//     type: "refresh",
//     tenantId: store.tenantId,
//   });
// }

/**
 * Use a sessionId and nonce to set the iframe refresh token
 * @param {String} sessionId
 * @param {String} nonce
 * @returns {Promise}
 */
export async function exchange({ sessionId, nonce }) {
  return;

  // TODO re-enable httpOnly exchange method once new endpoints are stable [06/15/21]
  // --------------------------
  // const iframe = getIframe();
  // if (!iframe) return;
  // return postMessageAsPromise({
  //   type: "exchange",
  //   tenantId: store.tenantId,
  //   payload: {
  //     sessionId,
  //     nonce,
  //   },
  // });
}
