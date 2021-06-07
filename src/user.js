import axios from "axios";
import jwt from "jsonwebtoken";

import { apiUrl } from "./constants.js";
import { refresh } from "./refresh.js";
import { store } from "./store.js";

/**
 * Define the store.user object based on the ID token
 */
export function setUser() {
  if (!store.idToken) {
    return console.warn("Cannot define user: missing ID token");
  }

  const decodedIdToken = jwt.decode(store.idToken);

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
    store.user[prop] = decodedIdToken[prop];
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
  await axios.put({
    url: `${apiUrl}self`,
    headers: {
      authorization: `Bearer ${store.accessToken}`,
    },
    payload,
  });

  // Refresh the access and ID tokens
  await refresh();

  // Set the store.user object from the ID token
  setUser();

  return store.user;
}
