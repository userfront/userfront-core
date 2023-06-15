import { resetStore } from "./config/utils.js";
import Userfront from "../src/index.js";

import { getIframe, triageEvent, resolvers } from "../src/iframe.js";
import { refresh } from "../src/refresh.js";
import { setCookiesAndTokens } from "../src/authentication.js";

jest.mock("../src/authentication.js", () => {
  return {
    __esModule: true,
    setCookiesAndTokens: jest.fn(),
  };
});

const tenantId = "abcd4321";

/**
 * This file tests the httpOnly refresh method, which uses an iframe with
 * an httpOnly cookie to perform token refreshes.
 *
 * The httpOnly refresh method is only available for tenants with configured
 * SSL certificates while in live mode.
 */

xdescribe("refresh with httpOnly method", () => {
  afterEach(() => {
    resetStore(Userfront);
    setCookiesAndTokens.mockClear();
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

    // Call refresh()
    await refresh();

    // Should have sent correct info into the iframe
    await expect(promise).resolves.toEqual({
      type: "refresh",
      tenantId,
      messageId,
    });
  });

  xit("should set tokens correctly based on iframe response", async () => {
    // Initialize the library
    Userfront.init(tenantId);

    // Mock fire an iframe refresh response
    const event = {
      data: {
        type: "refresh",
        status: 200,
        body: {
          tokens: {
            access: {
              value: "abcde",
              options: {},
            },
            id: {
              value: "abcde",
              options: {},
            },
          },
        },
      },
      origin: "https://auth.userfront.net",
    };
    triageEvent(event);

    // Assert that the tokens and cookies are properly set
    expect(setCookiesAndTokens).toHaveBeenCalled();
    expect(setCookiesAndTokens).toHaveBeenCalledWith(event.data.body.tokens);
  });

  it("should handle a non-200 response by logging an error", async () => {
    // Initialize the library
    Userfront.init(tenantId);

    // Mock console.warn
    console.warn = jest.fn();

    // Mock fire an iframe refresh response
    const event = {
      data: {
        type: "refresh",
        status: 404,
        body: {
          message: "Not Found",
        },
      },
      origin: "https://auth.userfront.net",
    };
    triageEvent(event);

    // Assert that the tokens and cookies are properly set
    expect(setCookiesAndTokens).not.toHaveBeenCalled();

    // Assert that the console warning was logged
    expect(console.warn).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      `Problem with ${event.data.type} request.`
    );
  });
});
