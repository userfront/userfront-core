import axios from "axios";
import { apiUrl } from "./constants.js";
import { store } from "./store.js";

/**
 * Define the mode of operation (live or test)
 */
export async function setMode() {
  try {
    const { data } = await axios.get(`${apiUrl}tenants/${store.tenantId}/mode`);
    store.mode = data.mode || "test";
  } catch (err) {
    store.mode = "test";
  }
}
