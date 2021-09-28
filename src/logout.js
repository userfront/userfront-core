import axios from "axios";
import { apiUrl } from "./constants.js";

import { getIframe, postMessageAsPromise } from "./iframe.js";
import { store } from "./store.js";
import { removeAllCookies } from "./cookies.js";
import { setTokensFromCookies } from "./tokens.js";
import { redirectToPath } from "./url";

/**
 * Log a user out and redirect to the logout path.
 */
export async function logout({ redirect } = {}) {
  if (!store.tokens.accessToken) return removeAllCookies();
  try {
    const { data } = await axios.get(`${apiUrl}auth/logout`, {
      headers: {
        authorization: `Bearer ${store.tokens.accessToken}`,
      },
    });
    removeAllCookies();
    if (redirect === false) return;
    redirectToPath(redirect || data.redirectTo);
  } catch (err) {
    removeAllCookies();
  }
}

// TODO re-enable exchange method once new endpoints are stable [06/15/21]
// --------------------------
// const iframe = getIframe();
// if (!iframe) return;
// try {
//   const { data } = await postMessageAsPromise({
//     type: "logout",
//     tenantId: store.tenantId,
//   });
//   removeAllCookies();
//   setTokensFromCookies();
//   redirectToPath(data.redirectTo || "/");
// } catch (error) {
//   removeAllCookies();
//   redirectToPath("/");
// }
