import { getQueryAttr } from "./url.js";
import { isBrowser } from "./utils.js";

export const store = {
  codeChallenge: "",
  get usePkce() {
    return !!store.codeChallenge;
  },
};

/**
 * Reads an unexpired challenge code from local storage
 * @returns {string?} the challenge code, if an unexpired one is in local storage
 */
export function readPkceDataFromLocalStorage() {
  if (!isBrowser()) {
    return;
  }
  const codeChallenge = window.localStorage.getItem("uf_pkce_code_challenge");
  if (codeChallenge) {
    const expiresAt = window.localStorage.getItem(
      "uf_pkce_code_challenge_expiresAt"
    );
    if (expiresAt && parseInt(expiresAt, 10) > Date.now()) {
      return codeChallenge;
    }
  }
}

/**
 * Write a challenge code to local storage, expiring in 5 minutes
 * @param {string} codeChallenge
 * @returns
 */
export function writePkceDataToLocalStorage(codeChallenge) {
  if (!isBrowser()) {
    return;
  }
  if (!codeChallenge) {
    return clearPkceDataFromLocalStorage();
  }
  store.codeChallenge = codeChallenge;
  const expiresAt = Date.now() + 1000 * 60 * 5; // 5 minutes from now
  try {
    window.localStorage.setItem("uf_pkce_code_challenge", codeChallenge);
    window.localStorage.setItem("uf_pkce_code_challenge_expiresAt", expiresAt);
  } catch (err) {
    // Suppress exception from full local storage
  }
}

/**
 * Clear the challenge code and expiration from local storage
 */
export function clearPkceDataFromLocalStorage() {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.removeItem("uf_pkce_code_challenge");
  window.localStorage.removeItem("uf_pkce_code_challenge_expiresAt");
}

/**
 * Set up the PKCE service: look for a PKCE challenge code in
 * query params or local storage. If both are present, the query
 * param is preferred.
 * @returns {Boolean} true if we should use PKCE in our auth requests
 */
export function setupPkce() {
  if (!isBrowser()) {
    return;
  }
  const codeChallengeFromQueryParams = getQueryAttr("code_challenge");
  if (codeChallengeFromQueryParams) {
    store.codeChallenge = codeChallengeFromQueryParams;
    writePkceDataToLocalStorage(codeChallengeFromQueryParams);
    return true;
  }
  const codeChallengeFromLocalStorage = readPkceDataFromLocalStorage();
  if (codeChallengeFromLocalStorage) {
    store.codeChallenge = codeChallengeFromLocalStorage;
    return true;
  }
  clearPkceDataFromLocalStorage();
  return false;
}

/**
 * Get (possibly empty) PKCE query params to attach to an auth request
 * @returns {object} an object to be used for an Axios request's params field
 */
export function getPkceRequestQueryParams() {
  if (!store.usePkce) {
    return {};
  }
  return { code_challenge: store.codeChallenge };
}

/**
 * Redirect to url with PKCE query params (authorization_code) set. Does not redirect
 * if url or authorizationCode are falsy.
 *
 * @param {string} url full URL to redirect to (may be a deep link for a mobile app)
 * @param {string} authorizationCode the authorization code received from the server
 * @returns
 */
export function defaultHandlePkceRequired(authorizationCode, url, data) {
  if (!url || !authorizationCode) {
    return;
  }
  if (!store.usePkce) {
    console.warn(
      "Redirecting with a PKCE authorization code, but no PKCE challenge code is present in the client. This is unexpected."
    );
  }
  const _url = new URL(url);
  _url.searchParams.set("authorization_code", authorizationCode);
  clearPkceDataFromLocalStorage();
  window.location.assign(_url.href);
}
