import axios from "axios";

import { apiUrl } from "./constants";
import { store } from "./store.js";
import { removeAllCookies } from "./cookies.js";
import { redirectToPath } from "./url";

/**
 * Log a user out and redirect to the logout path.
 */
export async function logout() {
  if (!store.accessToken) return removeAllCookies();
  try {
    const { data } = await axios.get(`${apiUrl}auth/logout`, {
      headers: {
        authorization: `Bearer ${store.accessToken}`,
      },
    });
    removeAllCookies();
    redirectToPath(data.redirectTo);
  } catch (err) {
    removeAllCookies();
  }
}
