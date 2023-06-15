import { get } from "./api.js";
import { store } from "./store.js";
import { removeAllCookies } from "./cookies.js";
import { getSession } from "./session.js";
import { store as pkceStore } from "./pkce.js";

/**
 * Get the value of a query attribute, e.g. ?attr=value
 * @param {String} attrName
 */
export function getQueryAttr(attrName) {
  if (
    typeof window !== "object" ||
    typeof window.location !== "object" ||
    !window.location.href ||
    window.location.href.indexOf(`${attrName}=`) < 0
  ) {
    return;
  }
  return decodeURIComponent(
    window.location.href.split(`${attrName}=`)[1].split("&")[0]
  );
}

/**
 * Redirect the browser based on explicit redirect input path, or the API response
 * @property {String|Boolean} redirect A path to redirect to, or false to not redirect
 * @property {Object} data The response object from the API
 * @returns
 */
export const defaultHandleRedirect = (redirect, data) => {
  if (redirect === false) return;
  // If redirect is the boolean true, redirect to the default redirect path, not to "/true"
  if (redirect === true) {
    const path = getQueryAttr("redirect") || data.redirectTo || "/";
    redirectToPath(path);
    return;
  }
  const path = redirect || getQueryAttr("redirect") || data.redirectTo || "/";
  redirectToPath(path);
};

/**
 * If the access token is valid, redirect the browser to the
 * tenant's After-login path.
 */
export async function redirectIfLoggedIn({ redirect } = {}) {
  const { isLoggedIn } = await getSession();
  if (!isLoggedIn) {
    return removeAllCookies();
  }

  // TODO see #130: can handle this more elegantly once we have an exchange tokens -> authorizationCode
  // endpoint on the server.
  // If this is a PKCE auth session, don't redirect with this function ever.
  // The only way to get an authorizationCode currently is to go through an auth flow.
  // The PKCE module handles redirect after a PKCE Required response is received.
  if (pkceStore.usePkce) {
    return;
  }

  // Redirect to a provided path (check options first, then url querystring)
  if (redirect) {
    return redirectToPath(redirect);
  } else if (getQueryAttr("redirect")) {
    return redirectToPath(getQueryAttr("redirect"));
  }

  // If no path was provided, look up the path and then redirect there
  try {
    const { data } = await get(`/self`, {
      headers: {
        authorization: `Bearer ${store.tokens.accessToken}`,
      },
    });
    if (data.tenant && data.tenant.loginRedirectPath) {
      redirectToPath(data.tenant.loginRedirectPath);
    }
  } catch (err) {
    removeAllCookies();
  }
}

/**
 * If the access token is invalid, redirect the browser to the
 * provided path.
 */
export async function redirectIfLoggedOut({ redirect } = {}) {
  // If the user is logged in, return without doing anything
  const { isLoggedIn } = await getSession();
  if (isLoggedIn) {
    return;
  }

  // Remove all cookies
  removeAllCookies();

  // Redirect to a provided path (check options first, then url querystring)
  if (redirect) {
    return redirectToPath(redirect);
  } else if (getQueryAttr("redirect")) {
    return redirectToPath(getQueryAttr("redirect"));
  }

  // If no redirect path was provided, do not redirect
  return;
}

/**
 * Redirect to path portion of a URL.
 */
export function redirectToPath(pathOrUrl) {
  // Return if no pathOrUrl, or if SSR or mobile
  if (
    !pathOrUrl ||
    typeof document !== "object" ||
    typeof window !== "object"
  ) {
    return;
  }
  try {
    document && window;
  } catch (error) {
    return;
  }

  // Perform hard redirect
  const el = document.createElement("a");
  el.href = pathOrUrl;
  let path = `${el.pathname}${el.hash}${el.search}`;
  if (el.pathname !== window.location.pathname) {
    window.location.assign(path);
  }
}
