import { getQueryAttr } from "./url.js";

export const store = {
  codeChallenge: "",
  get usePkce() {
    return !!store.codeChallenge;
  }
}

export function readPkceDataFromLocalStorage() {
  const codeChallenge = window.localStorage.getItem("uf_pkce_code_challenge");
  if (codeChallenge) {
    const expiresAt = window.localStorage.getItem("uf_pkce_code_challenge_expiresAt");
    if (expiresAt && (parseInt(expiresAt, 10) > Date.now())) {
      return codeChallenge;
    }
  }
}

export function writePkceDataToLocalStorage(codeChallenge) {
  if (!codeChallenge) {
    return clearPkceDataFromLocalStorage();
  }
  store.codeChallenge = codeChallenge;
  const expiresAt = (Date.now() + 1000 * 60 * 5); // 5 minutes from now
  try {
    window.localStorage.setItem("uf_pkce_code_challenge", codeChallenge);
    window.localStorage.setItem("uf_pkce_code_challenge_expiresAt", expiresAt);
  } catch (err) {
    // Suppress exception from full local storage
  }
}

export function clearPkceDataFromLocalStorage() {
  window.localStorage.removeItem("uf_pkce_code_challenge");
  window.localStorage.removeItem("uf_pkce_code_challenge_expiresAt");
}

export function setupPkce() {
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

export function getPkceRequestQueryParams() {
  if (!store.usePkce) {
    return {};
  }
  return new { "code_challenge": store.codeChallenge };
}

export function redirectWithPkce(url, authorizationCode) {
  if (!url || !authorizationCode) {
    return;
  }
  if (!store.usePkce) {
    console.warn("Redirecting with a PKCE authorization code, but no PKCE challenge code is present in the client. This is unexpected.")
  }
  const _url = new URL(url);
  _url.searchParams.set("authorization_code", authorizationCode);
  clearPkceDataFromLocalStorage();
  window.location.assign(_url.href);
}