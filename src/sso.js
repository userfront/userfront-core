import { store } from "./store.js";
import { getQueryAttr } from "./url.js";

export function getProviderLink({ provider, redirect, providerId }) {
  if (!provider) {
    throw new Error("Missing provider");
  }
  if (!store.tenantId) {
    throw new Error("Missing tenantId");
  }
  if (provider === "custom" && !providerId) {
    throw new Error("Missing providerId");
  }

  const url = new URL(`${store.baseUrl}auth/${provider}/login`);
  url.searchParams.append("origin", window.location.origin);
  url.searchParams.append("tenant_id", store.tenantId);

  if (provider === "custom") {
    url.searchParams.append("provider_id", providerId);
  }

  let redirectTo = redirect || getQueryAttr("redirect");
  if (redirect === false) {
    redirectTo = typeof document === "object" && document.location.pathname;
  }
  if (redirectTo) {
    url.searchParams.append("redirect", redirectTo);
  }

  // https://api.userfront.com/v0/auth/linkedin/login?tenant_id=abcdefg&origin=https%3A%2F%2Fexample.com&redirect=%2Fdashboard
  return url.toString();
}

/**
 * Log in or register a user via SSO provider.
 * Redirect the browser after successful authentication and 302 redirect from server.
 * @param {String} provider Name of SSO provider
 * @param {String} [redirect] - do not redirect if false, or redirect to given path
 * @param {String} [providerId] Provider ID of custom provider (only required for `{ provider: 'custom sso' }`)
 */
export function signonWithSso({ provider, redirect, providerId }) {
  const url = getProviderLink({ provider, redirect, providerId });
  window.location.assign(url);
}
