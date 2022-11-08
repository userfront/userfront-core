import { store } from "./store.js";
import { get } from "./api.js";

// Data specific to the MFA service
export const mfaData = {
  firstFactors: [],
  secondFactors: [],
  firstFactorToken: null
}

/**
 * Convert a factor object to its corresponding string.
 * @param {Object} factor a factor as { strategy, channel } 
 * @returns {String} the factor as "strategy:channel"
 */
export function factorToString({ strategy, channel }) {
  return `${strategy}:${channel}`;
}

/**
 * If initialized with a tenant ID, try to fetch the allowed first factors from the server
 * and update the MFA service accordingly.
 * @returns {[String]} list of acceptable first factors
 */
export async function updateFirstFactors() {
  // If we're not initialized, there are no first factors.
  if (!store.tenantId) {
    return mfaData.firstFactors = [];
  }
  try {
    // Update the first factors from the tenant's default auth flow
    const authFlow = await get(`/tenants/${store.tenantId}/flows/default`);
    if (!authFlow || !authFlow.firstFactors) {
      // If the default auth flow is empty, there are no first factors.
      return mfaData.firstFactors = [];
    }
    return mfaData.firstFactors = authFlow.firstFactors.map(factor => factorToString(factor));
  } catch (err) {
    // If we get an error, leave the existing factors unchanged.
    // (This implies that if we get an Unauthorized error, the first factors
    //  would still be empty. The first factors will only have content if we
    //  previously got them for this tenant.)
    return mfaData.firstFactors;
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
  mfaData.secondFactors = response.authentication.secondFactors.map(factor => factorToString(factor));
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
