import { resetStore } from "./config/utils.js";
import Userfront from "../src/index.js";

import { getIframe, resolvers } from "../src/iframe.js";
import { exchange } from "../src/refresh.js";

const tenantId = "abcd4321";

describe("exchange method", () => {
  afterEach(() => {
    resetStore(Userfront);
  });

  // TODO re-enable tests below once iframe is re-established

  xit("should send correct options into iframe", async () => {
    // Initialize the library
    Userfront.init(tenantId);

    // Mock the iframe response to input
    const iframe = getIframe();
    let resolver;
    const promise = new Promise((resolve) => {
      resolver = resolve;
    });
    let messageId;
    iframe.contentWindow.addEventListener("message", async (e) => {
      messageId = e.data.messageId;
      resolvers[messageId].resolve();
      resolver(e.data);
    });

    // Call exchange()
    const payload = {
      sessionId: "aaa96052-4136-4897-9863-046a4bb918ca",
      nonce: "bbb96052-4136-4897-9863-046a4bb918ca",
    };

    await exchange(payload);

    // Should have sent correct info into the iframe
    await expect(promise).resolves.toEqual({
      messageId,
      type: "exchange",
      tenantId,
      payload,
    });
  });
});
