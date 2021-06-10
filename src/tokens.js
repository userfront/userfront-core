import Cookies from "js-cookie";

import { store } from "./store.js";

/**
 * Set and then return the access token
 */
export function accessToken() {
  store.accessToken = Cookies.get(store.accessTokenName);
  return store.accessToken;
}

/**
 * Set and then return the ID token
 */
export function idToken() {
  store.idToken = Cookies.get(store.idTokenName);
  return store.idToken;
}

/**
 * Define the store token values from the cookie values.
 */
export function setTokensFromCookies() {
  const tokenNames = ["access", "id", "refresh"];
  tokenNames.map((tokenName) => {
    try {
      const token = Cookies.get(store[`${tokenName}TokenName`]);
      store[`${tokenName}Token`] = token;
    } catch (error) {
      console.warn(`Problem setting ${tokenName} token.`);
    }
  });
}

/**
 * Verify the provided token
 * @param {String} token
 * @returns {Promise<void>} The provided token has been verified if `verifyToken` resolves without error
 */
export async function verifyToken(token) {
  if (!token) throw new Error("Missing token");

  let publicKey;
  try {
    const decodedToken = jwt.decode(token, { complete: true });
    if (!decodedToken.header || !decodedToken.header.kid) {
      throw new Error("Token kid not defined");
    }

    const client = new JwksClient({
      jwksUri: `${apiUrl}tenants/${store.tenantId}/jwks/${store.mode}`,
      requestHeaders: { origin: window.location.origin },
    });

    const key = await client.getSigningKey(decodedToken.header.kid);
    publicKey = key.getPublicKey();
  } catch (error) {
    throw error;
  }

  if (!publicKey) {
    throw new Error("Public key not found");
  }

  try {
    jwt.verify(token, publicKey);
  } catch (error) {
    throw new Error("Token verification failed");
  }

  return Promise.resolve();
}
