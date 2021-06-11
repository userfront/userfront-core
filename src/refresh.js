import { store } from "./store.js";
import { getIframe, postMessageAsPromise } from "./iframe.js";

/**
 * Refresh the access and ID tokens using the iframe's existing refresh token
 * @returns {Promise}
 */
export async function refresh() {
  const iframe = getIframe();
  if (!iframe) return;
  return postMessageAsPromise({
    type: "refresh",
    tenantId: store.tenantId,
  });
}

/**
 * Use a session and nonce to set the iframe refresh token
 * @param {String} session
 * @param {String} nonce
 * @returns {Promise}
 */
export async function exchange({ session, nonce }) {
  const iframe = getIframe();
  console.log("exchange", iframe);
  if (!iframe) return;
  return postMessageAsPromise({
    type: "exchange",
    tenantId: store.tenantId,
    payload: {
      session,
      nonce,
    },
  });
}
