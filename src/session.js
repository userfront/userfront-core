import {
  isAccessTokenLocallyValid,
  isRefreshTokenLocallyValid,
} from "./tokens.js";
import { authenticationData } from "./authentication.js";
import { isFirstFactorTokenPresent, clearMfa } from "./mfa.js";
import { refresh } from "./refresh.js";

/**
 * Determine whether a user is logged in by checking their
 * JWT access token and, if invalid, refreshing it and checking
 * again.
 * @returns {Promise<Boolean>}
 */
async function getIsLoggedIn() {
  try {
    // If the access token is locally valid, return true
    if (isAccessTokenLocallyValid()) {
      return true;
    }

    // If the refresh token is locally invalid, return false
    if (!isRefreshTokenLocallyValid()) {
      return false;
    }

    // Attempt to refresh the access token
    await refresh();

    // The access token should now be valid
    return isAccessTokenLocallyValid();
  } catch (error) {
    return false;
  }
}

/**
 * Return detailed information about the current session.
 * @returns {Promise<Object>}
 */
export async function getSession() {
  const isLoggedIn = await getIsLoggedIn();
  return {
    isLoggedIn,
    needsSecondFactor: isFirstFactorTokenPresent(),
    firstFactors: authenticationData.firstFactors,
    secondFactors: authenticationData.secondFactors,
    resetMfaState: clearMfa,
  };
}
