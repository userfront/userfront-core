import Cookies from "js-cookie";
import { store } from "./store.js";
import { setUser, unsetUser } from "./user.js";
import { refresh } from "./refresh.js";
import { isJwtLocallyValid } from "./utils.js";
import { setCookiesAndTokens } from "./authentication.js";
import { exchange } from "./refresh.js";

store.tokens = store.tokens || {};
store.tokens.refresh = refresh;

export function setTokenNames() {
  store.tokens = store.tokens || {};
  store.tokens.accessTokenName = `access.${store.tenantId}`;
  store.tokens.idTokenName = `id.${store.tenantId}`;
  store.tokens.refreshTokenName = `refresh.${store.tenantId}`;
}

/**
 * Set and then return the access token
 */
export function accessToken() {
  store.tokens.accessToken = Cookies.get(store.tokens.accessTokenName);
  return store.tokens.accessToken;
}

/**
 * Set and then return the ID token
 */
export function idToken() {
  store.tokens.idToken = Cookies.get(store.tokens.idTokenName);
  return store.tokens.idToken;
}

/**
 * Define the store token values from the cookie values.
 */
export function setTokensFromCookies() {
  const tokenNames = ["access", "id", "refresh"];
  tokenNames.map((tokenName) => {
    try {
      const token = Cookies.get(store.tokens[`${tokenName}TokenName`]);
      store.tokens[`${tokenName}Token`] = token;

      // Set the user object whenever the ID token is set
      if (tokenName === "id" && token) {
        setUser();
      }
    } catch (error) {
      console.warn(`Problem setting ${tokenName} token.`);
    }
  });
}

/**
 * Set the store token values to undefined
 */
export function unsetTokens() {
  store.tokens.accessToken = undefined;
  store.tokens.idToken = undefined;
  store.tokens.refreshToken = undefined;
  unsetUser();
}

/**
 * Client-side check:
 * Determine whether the access token is present and unexpired
 * @returns {Boolean}
 */
export function isAccessTokenLocallyValid() {
  return isJwtLocallyValid(store.tokens.accessToken);
}

/**
 * Client-side check:
 * Determine whether the refresh token is present and unexpired
 * @returns {Boolean}
 */
export function isRefreshTokenLocallyValid() {
  return isJwtLocallyValid(store.tokens.refreshToken);
}

/**
 * Set the cookies and store.tokens based on a tokens object
 * @property {Object} tokens An object containing JWT access, refresh, and ID tokens
 * @property {Object} data The response object from the API
 * @returns
 */
export async function defaultHandleTokens(tokens, data) {
  setCookiesAndTokens(tokens);
  await exchange(data);
}

/**
 * Export the store.tokens object
 */
export const tokens = store.tokens;

// NOTE Commenting this out 6/11/21 because the packages it relies on (jsonwebtoken & jwks-rsa)
// both cause a lot of bloat. If we want to verify tokens, this is a nice way to do it, but
// we need to find libraries designed for the browser instead of node.
/**
 * Verify the provided token
 * @param {String} token
 * @returns {Promise<void>} The provided token has been verified if `verifyToken` resolves without error
 */
// export async function verifyToken(token) {
//   if (!token) throw new Error("Missing token");

//   let publicKey;
//   try {
//     const decodedToken = jwt.decode(token, { complete: true });
//     if (!decodedToken.header || !decodedToken.header.kid) {
//       throw new Error("Token kid not defined");
//     }

//     const client = new JwksClient({
//       jwksUri: `${apiUrl}tenants/${store.tenantId}/jwks/${store.mode}`,
//       requestHeaders: { origin: window.location.origin },
//     });

//     const key = await client.getSigningKey(decodedToken.header.kid);
//     publicKey = key.getPublicKey();
//   } catch (error) {
//     throw error;
//   }

//   if (!publicKey) {
//     throw new Error("Public key not found");
//   }

//   try {
//     jwt.verify(token, publicKey);
//   } catch (error) {
//     throw new Error("Token verification failed");
//   }

//   return Promise.resolve();
// }
