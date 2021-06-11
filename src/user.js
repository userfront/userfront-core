import axios from "axios";
import { apiUrl } from "./constants.js";
import { refresh } from "./refresh.js";
import { store } from "./store.js";
import { getJWTPayload } from "./utils.js";

/**
 * Define the store.user object based on the ID token
 */
export function setUser() {
  if (!store.idToken) {
    return console.warn("Cannot define user: missing ID token");
  }

  store.user = store.user || {};
  const idTokenPayload = getJWTPayload(store.idToken);

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
 * Update the user record on Userfront
 * @param {Object} payload User properties to update e.g. { name: 'John Doe' }
 */
export async function update(payload) {
  if (!payload || Object.keys(payload).length < 1) {
    return console.warn("Missing user properties to update");
  }

  // Make request to update the user
  await axios.put(`${apiUrl}self`, payload, {
    headers: {
      authorization: `Bearer ${store.accessToken}`,
    },
  });

  // Refresh the access and ID tokens
  await refresh();

  // Set the store.user object from the ID token
  setUser();

  return store.user;
}

/**
 * Export the store.user object with the update method added
 */
export const user = store.user;
user.update = update;
