import axios from "axios";
import { store } from "./store.js";
import { throwFormattedError } from "./utils.js";

export async function completeSamlLogin() {
  try {
    if (!store.tokens.accessToken) {
      return console.warn("Cannot complete SAML login without access token");
    }

    const { data } = await axios.get(`${store.baseUrl}auth/saml/idp/token`, {
      headers: {
        authorization: `Bearer ${store.tokens.accessToken}`,
      },
    });

    window.location.assign(
      `${store.baseUrl}auth/saml/idp/login?tenant_id=${store.tenantId}&token=${data.token}&uuid=${store.user.userUuid}`
    );
  } catch (error) {
    throwFormattedError(error);
  }
}
