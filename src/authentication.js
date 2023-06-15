import { defaultHandleTokens, setTokensFromCookies } from "./tokens.js";
import { setCookie } from "./cookies.js";
import { defaultHandleRedirect, getQueryAttr } from "./url.js";
import { defaultHandlePkceRequired } from "./pkce.js";
import { defaultHandleMfaRequired } from "./mfa.js";

// Data specific to the MFA service
export const authenticationData = {
  firstFactors: [],
  secondFactors: [],
  firstFactorToken: null,
};

/**
 * Set the cookies from a tokens object, and add to the local store.
 * @param {Object} tokens
 */
export function setCookiesAndTokens(tokens) {
  setCookie(tokens.access.value, tokens.access.cookieOptions, "access");
  setCookie(tokens.id.value, tokens.id.cookieOptions, "id");
  if (tokens.refresh && tokens.refresh.value) {
    setCookie(tokens.refresh.value, tokens.refresh.cookieOptions, "refresh");
  }
  setTokensFromCookies();
}

/**
 * Handle the API response for an authentication request
 * @property {Object} data
 * @property {String|Boolean} redirect
 * @property {Function} handleUpstreamResponse
 * @property {Function} handleMfaRequired
 * @property {Function} handlePkceRequired
 * @property {Function} handleTokens
 * @property {Function} handleRedirect
 * @returns {Object} data (or redirection)
 */
export async function handleLoginResponse({
  data,
  redirect,
  handleUpstreamResponse,
  handleMfaRequired,
  handlePkceRequired,
  handleTokens,
  handleRedirect,
}) {
  let redirectValue =
    redirect || getQueryAttr("redirect") || data.redirectTo || "/";

  // Handle upstreamResponse
  if (typeof handleUpstreamResponse === "function") {
    await handleUpstreamResponse(data.upstreamResponse, data);
  }

  // Handle "MFA required" response
  if (data.hasOwnProperty("firstFactorToken")) {
    if (typeof handleMfaRequired === "function") {
      await handleMfaRequired(data.firstFactorToken, data);
    } else {
      defaultHandleMfaRequired(data.firstFactorToken, data);
    }
    return data;
  }

  // Handle tokens
  if (data.hasOwnProperty("tokens")) {
    if (typeof handleTokens === "function") {
      await handleTokens(data.tokens, data);
    } else {
      await defaultHandleTokens(data.tokens, data);
    }
  }

  // Handle "PKCE required" response
  if (data.hasOwnProperty("authorizationCode")) {
    if (!redirectValue) {
      throw new Error("Missing PKCE redirect url");
    }
    if (typeof handlePkceRequired === "function") {
      await handlePkceRequired(data.authorizationCode, redirectValue, data);
    } else {
      defaultHandlePkceRequired(data.authorizationCode, redirectValue, data);
      return data;
    }
  }

  // Handle redirection
  if (data.hasOwnProperty("redirectTo") && redirect !== false) {
    if (typeof handleRedirect === "function") {
      await handleRedirect(redirectValue, data);
    } else {
      defaultHandleRedirect(redirectValue, data);
    }
  }

  return data;
}
