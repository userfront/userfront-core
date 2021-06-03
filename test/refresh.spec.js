import utils from "./config/utils.js";
import Userfront from "../src/index.js";

import { getIframe } from "../src/iframe.js";
import { refresh } from "../src/refresh.js";

const tenantId = "abcdefg";

/**
 * TODO
 * Get a test working whereby the iframe's response is received
 * by the parent window and used to set the access and ID tokens.
 */

describe("refresh method", () => {
  afterEach(() => {
    utils.resetStore(Userfront);
  });

  it("should send options into iframe to refresh and update based on response", async () => {
    window.postMessage = jest.fn();
    Userfront.init(tenantId);
    const iframe = getIframe();
    let resolver;
    const promise = new Promise((resolve) => {
      resolver = resolve;
    });
    iframe.contentWindow.addEventListener("message", async (e) => {
      await window.postMessage({ hi: "hello" }, "*");
      resolver(e.data);
    });

    // Refresh
    await refresh();

    // Should have sent correct info into the iframe
    await expect(promise).resolves.toEqual({ type: "refresh" });
    expect(window.postMessage).toHaveBeenCalledTimes(1);
    expect(window.postMessage).toHaveBeenCalledWith({}, "*");
    expect(iframe).toBeTruthy();
    expect(iframe.src).toMatch(/^https:\/\/auth.userfront.net/);
    expect(iframe.style.display).toEqual("none");
  });
});
