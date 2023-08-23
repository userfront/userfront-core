import { store } from "./store.js";
import { getJwtPayload } from "./utils.js";

/**
 * Define the store.user object based on the ID token
 */
export function setUser() {
  if (!store.tokens.idToken) {
    return console.warn("Cannot define user: missing ID token");
  }

  store.user = store.user || {};
  const idTokenPayload = getJwtPayload(store.tokens.idToken);

  // Set basic user information properties from ID token
  const propsToDefine = [
    "email",
    "phoneNumber",
    "username",
    "name",
    "image",
    "data",
    "createdAt",
    "updatedAt",
    "mode",
    "userId",
    "userUuid",
    "tenantId",
    "isEmailConfirmed",
    "isPhoneNumberConfirmed",
    "confirmedEmailAt",
    "confirmedPhoneNumberAt",
    "isMfaRequired",
    "isConfirmed", // Deprecated
  ];
  for (const prop of propsToDefine) {
    if (prop === "update") return;
    store.user[prop] = idTokenPayload[prop];
  }
}

/**
 * Remove all user information
 */
export function unsetUser() {
  for (const attr in store.user) {
    if (typeof store.user[attr] !== "function") {
      delete store.user[attr];
    }
  }
}

/**
 * Export the store.user object with the update method added
 */
export const user = store.user;
