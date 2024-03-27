import { vi } from "vitest";

import Cookies from "js-cookie";

import Userfront from "../src/index.js";
import api from "../src/api.js";
import { logout } from "../src/logout.js";
import { defaultHandleRedirect } from "../src/url.js";
import { createAccessToken, createIdToken } from "./config/utils.js";

vi.mock("../src/api.js");
vi.mock("../src/url.js");

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
    vi.resetAllMocks();
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

    it("should remove cookies even if there is no access token in the store", async () => {
      Userfront.store.tokens.accessToken = null;
      await logout();
      expect(Cookies.get(`access.${tenantId}`)).toBeFalsy();
      expect(Cookies.get(`id.${tenantId}`)).toBeFalsy();
      expect(Cookies.get(`refresh.${tenantId}`)).toBeFalsy();
    })
  });
});
