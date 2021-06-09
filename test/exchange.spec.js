import utils from "./config/utils.js";
import Userfront from "../src/index.js";

import { getIframe, triageEvent } from "../src/iframe.js";
import { exchange } from "../src/refresh.js";
import { setCookiesAndTokens } from "../src/cookies.js";

const tenantId = "abcd4321";

describe("exchange method", () => {
  afterEach(() => {
    utils.resetStore(Userfront);
  });

  it("should send correct options into iframe", async () => {
    // Initialize the library
    Userfront.init(tenantId);

    // Mock the iframe response to input
    const iframe = getIframe();
    let resolver;
    const promise = new Promise((resolve) => {
      resolver = resolve;
    });
    iframe.contentWindow.addEventListener("message", async (e) => {
      resolver(e.data);
    });

    // Call exchange()
    const payload = {
      session: "aaa96052-4136-4897-9863-046a4bb918ca",
      nonce: "bbb96052-4136-4897-9863-046a4bb918ca",
    };
    await exchange(payload);

    // Should have sent correct info into the iframe
    await expect(promise).resolves.toEqual({
      type: "exchange",
      tenantId,
      payload,
    });
  });
});
