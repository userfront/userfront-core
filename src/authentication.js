import { store } from "./store.js";
import { setCookiesAndTokens } from "./cookies.js";
import { defaultHandleRedirect, getQueryAttr } from "./url.js";
import { exchange } from "./refresh.js";
import { redirectWithPkce } from "./pkce.js";

// Data specific to the MFA service
export const authenticationData = {
  firstFactors: [],
  secondFactors: [],
  firstFactorToken: null,
};

/**
 * Set authenticationData.firstFactors from the authentication object
 * @param {Object} authentication
 * {
 *   firstFactors,
 *   secondFactors
 * }
 * @returns
 */
export function setFirstFactors(authentication) {
  // If we're not initialized, there are no first factors.
  if (!store.tenantId) {
    console.warn(
      "setFirstFactors: tried to set factors without a tenantId set."
    );
    return;
  }
  // If we're passed an invalid argument, keep the authentication data as is.
  if (
    !authentication ||
    typeof authentication !== "object" ||
    !Array.isArray(authentication.firstFactors)
  ) {
    console.warn("setFirstFactors: invalid factors passed.");
    return;
  }
  authenticationData.firstFactors = authentication.firstFactors;
}

/**
 * Check if MFA is required for the ongoing signup or login flow.
 * @returns {Boolean} true if MFA is currently required
 */
export function isMfaRequired() {
  return !!authenticationData.firstFactorToken;
}

/**
 * Update the MFA service state given a response to a signup or login call.
 * Adds secondFactors and firstFactorToken if it is a MFA Required response,
 * removes them if it is a successful signup or login,
 * leaves the service unchanged otherwise.
 * @param {Object} response
 */
export function handleMfaRequired(response) {
  if (!response.isMfaRequired) {
    // If we've logged in or signed up successfully,
    // clear the MFA service state.
    if (response.message === "OK") {
      clearMfa();
    }
    return;
  }
  authenticationData.secondFactors = response.authentication.secondFactors;
  authenticationData.firstFactorToken = response.firstFactorToken;
}

/**
 * If MFA is required, returns a headers object with authorization set to the firstFactorToken.
 * Otherwise, returns an empty object.
 * @returns {Object} a headers object with MFA authorization header set, or empty if MFA is not required
 */
export function getMfaHeaders() {
  if (authenticationData.firstFactorToken) {
    return {
      authorization: `Bearer ${authenticationData.firstFactorToken}`,
    };
  }
  return {};
}

/**
 * Clears the current transient state of the MFA service,
 * leaving the tenant's persistent state in place.
 */
export function clearMfa() {
  authenticationData.secondFactors = [];
  authenticationData.firstFactorToken = null;
}

/**
 * Fully resets the MFA service, including the tenant's persistent state,
 * to it uninitialized state.
 */
export function resetMfa() {
  clearMfa();
  authenticationData.firstFactors = [];
}

/**
 * Handle the API response for an authentication request
 * @property {Object} data
 * @property {String|Boolean} redirect
 * @property {Function} handleUpstreamResponse
 * @property {Function} handleTokens
 * @property {Function} handleRedirect
 * @returns {Object} data (or redirection)
 */
export async function handleLoginResponse({
  data,
  redirect,
  handleUpstreamResponse,
  handleTokens,
  handleRedirect,
}) {
  const redirectValueIfNotFalse =
    redirect || getQueryAttr("redirect") || data.redirectTo || "/";

  const redirectValue = redirect === false ? false : redirectValueIfNotFalse;

  // Handle upstreamResponse
  if (typeof handleUpstreamResponse === "function") {
    await handleUpstreamResponse(data.upstreamResponse, data);
  }

  // Handle "MFA required" response
  if (data.hasOwnProperty("firstFactorToken")) {
    handleMfaRequired(data);
    return data;
  }

  // Handle tokens
  if (data.hasOwnProperty("tokens")) {
    if (typeof handleTokens === "function") {
      await handleTokens(data.tokens, data);
    } else {
      setCookiesAndTokens(data.tokens);
      await exchange(data);
    }
  }

  // Handle authorizationCode for PKCE
  if (data.hasOwnProperty("authorizationCode")) {
    if (redirectValueIfNotFalse) {
      redirectWithPkce(redirectValueIfNotFalse, data.authorizationCode);
      return data;
    } else {
      throw new Error("Missing PKCE redirect url");
    }
  }

  // Handle redirection
  if (typeof handleRedirect === "function") {
    await handleRedirect(data.redirectTo, data);
  } else {
    defaultHandleRedirect(redirectValue, data);
  }

  return data;
}
