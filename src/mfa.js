import { store } from "./store.js";
import { get } from "./api.js";

// Data specific to the MFA service
export const mfaData = {
  firstFactors: [],
  secondFactors: [],
  firstFactorToken: null
}

export function setAuthFlow(authFlow) {
  // If we're not initialized, there are no first factors.
  if (!store.tenantId) {
    console.warn("mfa/setAuthFlow: tried to set auth flow without a tenantId set.")
    return;
  }
  // If we're passed an invalid argument, keep the auth flow as is.
  if (!authFlow || !typeof authFlow === "object" || !authFlow.firstFactors) {
    console.warn("mfa/setAuthFlow: invalid auth flow passed.")
    return;
  }
  try {
    mfaData.firstFactors = authFlow.firstFactors;
    return;
  } catch (err) {
    console.warn(`mfa/setAuthFlow: error when building factors list - ${err.message}`)
  }
}

/**
 * Check if MFA is required for the ongoing signup or login flow.
 * @returns {Boolean} true if MFA is currently required
 */
export function isMfaRequired() {
  return !!mfaData.firstFactorToken;
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
  mfaData.secondFactors = response.authentication.secondFactors;
  mfaData.firstFactorToken = response.firstFactorToken;
}

/**
 * If MFA is required, returns a headers object with authorization set to the firstFactorToken.
 * Otherwise, returns an empty object.
 * @returns {Object} a headers object with MFA authorization header set, or empty if MFA is not required
 */
export function getMfaHeaders() {
  if (mfaData.firstFactorToken) {
    return {
      authorization: `Bearer ${mfaData.firstFactorToken}`
    }
  }
  return {}
}

/**
 * Clears the current transient state of the MFA service,
 * leaving the tenant's persistent state in place.
 */
export function clearMfa() {
  mfaData.secondFactors = [];
  mfaData.firstFactorToken = null;
}

/**
 * Fully resets the MFA service, including the tenant's persistent state,
 * to it uninitialized state.
 */
export function resetMfa() {
  clearMfa();
  mfaData.firstFactors = [];
}
