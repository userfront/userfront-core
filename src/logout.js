import { get } from "./api.js";
import { getIframe, postMessageAsPromise } from "./iframe.js";
import { store } from "./store.js";
import { removeAllCookies } from "./cookies.js";
import { setTokensFromCookies } from "./tokens.js";
import { defaultHandleRedirect } from "./url";
import { throwFormattedError } from "./utils.js";

/**
 * Log a user out and redirect to the logout path.
 */
export async function logout({ method, redirect } = {}) {
  if (method === "saml") {
    return completeSamlLogout();
  }
  if (!store.tokens.accessToken) {
    return removeAllCookies();
  }

  try {
    const { data } = await get(`/auth/logout`, {
      headers: {
        authorization: `Bearer ${store.tokens.accessToken}`,
      },
    });
    removeAllCookies();
    defaultHandleRedirect(redirect, data);
  } catch (err) {
    removeAllCookies();
  }
}

async function completeSamlLogout() {
  if (!store.tokens.accessToken) {
    throw new Error("Please log in to authorize your logout request.");
  }

  try {
    const { data } = await get(`/auth/saml/idp/token`, {
      headers: {
        authorization: `Bearer ${store.tokens.accessToken}`,
      },
    });

    window.location.assign(
      `${store.baseUrl}auth/saml/idp/logout?tenant_id=${store.tenantId}&token=${data.token}&uuid=${store.user.userUuid}`
    );
  } catch (error) {
    throwFormattedError(error);
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
//   defaultHandleRedirect(redirect, data);
// } catch (error) {
//   removeAllCookies();
//   redirectToPath("/");
// }
