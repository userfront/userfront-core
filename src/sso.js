import { store } from "./store.js";
import { getQueryAttr } from "./url.js";

export function getProviderLink({ provider, redirect }) {
  if (!provider) throw new Error("Missing provider");
  if (!store.tenantId) throw new Error("Missing tenantId");

  let url = `${store.baseUrl}auth/${provider}/login?tenant_id=${store.tenantId}&origin=${window.location.origin}`;

  let redirectTo = redirect || getQueryAttr("redirect");
  if (redirect === false) {
    redirectTo = typeof document === "object" && document.location.pathname;
  }
  if (redirectTo) {
    url += `&redirect=${encodeURIComponent(redirectTo)}`;
  }

  return url;
}

/**
 * Log in or register a user via SSO provider.
 * Redirect the browser after successful authentication and 302 redirect from server.
 * @param {String} provider Name of SSO provider
 * @param {String} redirect - do not redirect if false, or redirect to given path
 */
export function signonWithSso({ provider, redirect }) {
  if (!provider) throw new Error("Missing provider");
  const url = getProviderLink({ provider, redirect });
  window.location.assign(url);
}
