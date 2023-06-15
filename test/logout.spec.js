import Cookies from "js-cookie";

import Userfront from "../src/index.js";
import api from "../src/api.js";
import { getIframe, resolvers } from "../src/iframe.js";
import { logout } from "../src/logout.js";
import { defaultHandleRedirect } from "../src/url.js";
import { createAccessToken, createIdToken } from "./config/utils.js";

jest.mock("../src/api.js");
jest.mock("../src/url.js");

const tenantId = "abcd9876";
const mockAccessToken = createAccessToken();
const mockIdToken = createIdToken();

// Mock API response
const mockResponse = {
  data: {
    message: "ok",
    redirectTo: "/login",
  },
};

describe("logout", () => {
  beforeEach(() => {
    Cookies.set(`id.${tenantId}`, mockIdToken, {});
    Cookies.set(`access.${tenantId}`, mockAccessToken, {});
    Userfront.init(tenantId);
    jest.resetAllMocks();
  });

  describe("basic logout (non-httpOnly)", () => {
    it("should send a request to logout for basic refresh", async () => {
      // Mock the API response
      api.get.mockImplementationOnce(() => mockResponse);

      // Access and ID token cookies should both exist before logout
      expect(Cookies.get(`access.${tenantId}`)).toBeTruthy();
      expect(Cookies.get(`id.${tenantId}`)).toBeTruthy();
      expect(Userfront.tokens.accessToken).toBeTruthy();
      expect(Userfront.tokens.idToken).toBeTruthy();

      // Call logout()
      await logout();

      // Should have made a request to /auth/logout
      expect(api.get).toHaveBeenCalledWith(`/auth/logout`, {
        headers: {
          authorization: `Bearer ${mockAccessToken}`,
        },
      });

      // Should have cleared the access and ID tokens
      expect(Cookies.get(`access.${tenantId}`)).toBeFalsy();
      expect(Cookies.get(`id.${tenantId}`)).toBeFalsy();
      expect(Userfront.tokens.accessToken).toBeFalsy();
      expect(Userfront.tokens.idToken).toBeFalsy();

      // Should have cleared the user object
      expect(Userfront.user.email).toBeFalsy();
      expect(Userfront.user.userId).toBeFalsy();
      expect(Userfront.user.update).toBeTruthy();

      // Should redirect correctly
      expect(defaultHandleRedirect).toHaveBeenCalledWith(
        undefined,
        mockResponse.data
      );
    });

    it("should send a request to logout, then redirect to custom path", async () => {
      // Mock the API response
      api.get.mockImplementationOnce(() => mockResponse);

      // Access and ID token cookies should both exist before logout
      expect(Cookies.get(`access.${tenantId}`)).toBeTruthy();
      expect(Cookies.get(`id.${tenantId}`)).toBeTruthy();
      expect(Userfront.tokens.accessToken).toBeTruthy();
      expect(Userfront.tokens.idToken).toBeTruthy();

      // Call logout() with custom redirect
      await logout({ redirect: "/custom" });

      // Should have made a request to /auth/logout
      expect(api.get).toHaveBeenCalledWith(`/auth/logout`, {
        headers: {
          authorization: `Bearer ${mockAccessToken}`,
        },
      });

      // Should have cleared the access and ID tokens
      expect(Cookies.get(`access.${tenantId}`)).toBeFalsy();
      expect(Cookies.get(`id.${tenantId}`)).toBeFalsy();
      expect(Userfront.tokens.accessToken).toBeFalsy();
      expect(Userfront.tokens.idToken).toBeFalsy();

      // Should have cleared the user object
      expect(Userfront.user.email).toBeFalsy();
      expect(Userfront.user.userId).toBeFalsy();
      expect(Userfront.user.update).toBeTruthy();

      // Should redirect correctly
      expect(defaultHandleRedirect).toHaveBeenCalledWith(
        "/custom",
        mockResponse.data
      );
    });

    it("should send a request to logout, then not redirect if redirect is false", async () => {
      // Mock the API response
      api.get.mockImplementationOnce(() => mockResponse);

      // Access and ID token cookies should both exist before logout
      expect(Cookies.get(`access.${tenantId}`)).toBeTruthy();
      expect(Cookies.get(`id.${tenantId}`)).toBeTruthy();
      expect(Userfront.tokens.accessToken).toBeTruthy();
      expect(Userfront.tokens.idToken).toBeTruthy();

      // Call logout() with custom redirect
      await logout({ redirect: false });

      // Should have made a request to /auth/logout
      expect(api.get).toHaveBeenCalledWith(`/auth/logout`, {
        headers: {
          authorization: `Bearer ${mockAccessToken}`,
        },
      });

      // Should have cleared the access and ID tokens
      expect(Cookies.get(`access.${tenantId}`)).toBeFalsy();
      expect(Cookies.get(`id.${tenantId}`)).toBeFalsy();
      expect(Userfront.tokens.accessToken).toBeFalsy();
      expect(Userfront.tokens.idToken).toBeFalsy();

      // Should have cleared the user object
      expect(Userfront.user.email).toBeFalsy();
      expect(Userfront.user.userId).toBeFalsy();
      expect(Userfront.user.update).toBeTruthy();

      // Should redirect correctly
      expect(defaultHandleRedirect).toHaveBeenCalledWith(
        false,
        mockResponse.data
      );
    });
  });

  // TODO re-enable tests below once iframe is re-established
  xdescribe("httpOnly token logout", () => {
    xit("should send a request to the iframe (which clears its own refresh cookie), then clear the access and ID token cookies, then redirect", async () => {
      const redirectPath = "/login";
      const redirectTo = `https://example.com${redirectPath}`;

      // Mock the iframe response to input with an event listener
      const iframe = getIframe();
      let resolver;
      const promise = new Promise((resolve) => {
        resolver = resolve;
      });
      let messageId;
      const mockEventListener = async (e) => {
        messageId = e.data.messageId;
        e.data.redirectTo = redirectTo;
        resolvers[messageId].resolve(e);
        resolver(e.data);
      };
      iframe.contentWindow.addEventListener("message", mockEventListener);

      // Access and ID token cookies should both exist before logout
      expect(Cookies.get(`access.${tenantId}`)).toBeTruthy();
      expect(Cookies.get(`id.${tenantId}`)).toBeTruthy();
      expect(Userfront.accessToken()).toBeTruthy();
      expect(Userfront.idToken()).toBeTruthy();

      // Call logout()
      await logout();

      // Should have sent correct info into the iframe
      await expect(promise).resolves.toEqual({
        type: "logout",
        redirectTo,
        tenantId,
        messageId,
      });

      // Should have cleared the access and ID tokens
      expect(Cookies.get(`access.${tenantId}`)).toBeFalsy();
      expect(Cookies.get(`id.${tenantId}`)).toBeFalsy();
      expect(Userfront.accessToken()).toBeFalsy();
      expect(Userfront.idToken()).toBeFalsy();

      // Should have redirected correctly
      expect(window.location.assign).toHaveBeenCalledWith(redirectPath);

      // Remove the event listener
      iframe.contentWindow.removeEventListener("message", mockEventListener);
    });

    xit("should remove cookies and redirect to root if iframe fails", async () => {
      // Mock the iframe response to input
      const iframe = getIframe();
      let messageId;
      iframe.contentWindow.addEventListener("message", async (e) => {
        messageId = e.data.messageId;
        resolvers[messageId].reject(e);
      });

      // Access and ID token cookies should both exist before logout
      expect(Cookies.get(`access.${tenantId}`)).toBeTruthy();
      expect(Cookies.get(`id.${tenantId}`)).toBeTruthy();
      expect(Userfront.accessToken()).toBeTruthy();
      expect(Userfront.idToken()).toBeTruthy();

      // Call logout()
      await logout();

      // Should have cleared the access and ID tokens
      expect(Cookies.get(`access.${tenantId}`)).toBeFalsy();
      expect(Cookies.get(`id.${tenantId}`)).toBeFalsy();
      expect(Userfront.accessToken()).toBeFalsy();
      expect(Userfront.idToken()).toBeFalsy();

      // Should redirect to root
      expect(window.location.assign).toHaveBeenCalledWith("/");
    });
  });
});
