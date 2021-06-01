import axios from "axios";
import jwt from "jsonwebtoken";
import { apiUrl } from "./constants.js";

/**
 * Create a user object based on ID token
 * @param {Object} options
 * @property {Object} options.store Userfront store
 * @property {Function} options.afterUpdate Function to call after update is finished
 * @returns {Object}
 */
export default ({ store, afterUpdate }) => {
  if (!store.idToken) {
    throw new Error("User: Missing ID token");
  }
  if (!store.accessToken) {
    throw new Error("User: Missing access token");
  }

  const user = {};
  const decodedIdToken = jwt.decode(store.idToken);

  // Set basic user information properties from ID token
  const idTokenProps = [
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
  for (const prop of idTokenProps) {
    user[prop] = decodedIdToken[prop];
  }

  return {
    ...user,
    /**
     * Update user information via Userfront API
     * @param {Object} updates User properties to update e.g. { name: 'John Doe' }
     * @returns {Promise<void>}
     */
    async update(updates) {
      if (!decodedIdToken.userId) {
        throw new Error("API resource update error: Missing ID");
      }
      if (!updates || Object.keys(updates).length < 1) {
        throw new Error("Missing user properties to update");
      }

      try {
        await axios.put({
          url: `${apiUrl}tenants/${store.tenantId}/users/${decodedIdToken.userId}`,
          headers: {
            authorization: `Bearer ${store.accessToken}`,
          },
          payload: updates,
        });
      } catch (error) {
        throw new Error(error.message);
      }

      if (afterUpdate && typeof afterUpdate === "function") {
        afterUpdate();
      }

      return Promise.resolve();
    },
  };
};
