import { store } from "./store.js";
import { authenticationData } from "./authentication.js";

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
export function isFirstFactorTokenPresent() {
  return !!authenticationData.firstFactorToken;
}

/**
 * Update the MFA service state given a response to a signup or login call.
 * Adds secondFactors and firstFactorToken if it is a MFA Required response,
 * removes them if it is a successful signup or login,
 * leaves the service unchanged otherwise.
 * @param {Object} data
 */
export function defaultHandleMfaRequired(firstFactorToken, data) {
  if (!data.isMfaRequired) {
    // If we've logged in or signed up successfully,
    // clear the MFA service state.
    if (data.message === "OK") {
      clearMfa();
    }
    return;
  }
  authenticationData.firstFactorToken = firstFactorToken;
  authenticationData.secondFactors = data.authentication.secondFactors;
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
