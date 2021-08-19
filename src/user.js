import { store } from "./store.js";
import { getJWTPayload } from "./utils.js";

/**
 * Define the store.user object based on the ID token
 */
export function setUser() {
  if (!store.tokens.idToken) {
    return console.warn("Cannot define user: missing ID token");
  }

  store.user = store.user || {};
  const idTokenPayload = getJWTPayload(store.tokens.idToken);

  // Set basic user information properties from ID token
  const propsToDefine = [
    "email",
    "username",
    "name",
    "image",
    "data",
    "confirmedAt",
    "createdAt",
    "updatedAt",
    "mode",
    "userId",
    "userUuid",
    "tenantId",
    "isConfirmed",
  ];
  for (const prop of propsToDefine) {
    if (prop === "update") return;
    store.user[prop] = idTokenPayload[prop];
  }
}

/**
 * Export the store.user object with the update method added
 */
export const user = store.user;
