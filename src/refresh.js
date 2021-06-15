import { store } from "./store.js";
import { getIframe, postMessageAsPromise } from "./iframe.js";

/**
 * Refresh the access and ID tokens using the iframe's existing refresh token
 * @returns {Promise}
 */
export async function refresh() {
  return;

  // TODO re-enable refresh method once new endpoints are stable [06/15/21]
  // --------------------------
  // const iframe = getIframe();
  // if (!iframe) return;
  // return postMessageAsPromise({
  //   type: "refresh",
  //   tenantId: store.tenantId,
  // });
}

/**
 * Use a sessionId and nonce to set the iframe refresh token
 * @param {String} sessionId
 * @param {String} nonce
 * @returns {Promise}
 */
export async function exchange({ sessionId, nonce }) {
  return;

  // TODO re-enable exchange method once new endpoints are stable [06/15/21]
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
