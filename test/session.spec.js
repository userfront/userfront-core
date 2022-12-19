import Cookies from "js-cookie";
import Userfront from "../src/index.js";
import api from "../src/api.js";
import {
  createAccessToken,
  createIdToken,
  createRefreshToken,
  addMinutes,
} from "./config/utils.js";
import * as Refresh from "../src/refresh.js";
import { store } from "../src/store.js";

jest.mock("../src/refresh.js");
jest.mock("../src/api.js");

const tenantId = "abcd4321";
const mockAccessToken = createAccessToken();
const mockIdToken = createIdToken();

const mockAuthenticationObject = {
  firstFactors: [
    {
      channel: "email",
      strategy: "password",
    },
    {
      channel: "email",
      strategy: "link",
    },
  ],
  secondFactors: [
    {
      channel: "authenticator",
      strategy: "totp",
    },
    {
      channel: "sms",
      strategy: "verificationCode",
    },
  ],
};

describe("Userfront session helpers", () => {
  beforeAll(() => {
    // Set mock cookies
    Cookies.set(`id.${tenantId}`, mockIdToken, {});
    Cookies.set(`access.${tenantId}`, mockAccessToken, {});
    // Initialize Userfront
    Userfront.init(tenantId);
  });

  beforeEach(() => {
    api.get.mockImplementationOnce(() => mockAuthenticationObject);
  });

  describe("getSession()", () => {
    afterEach(() => {
      jest.resetAllMocks();
    });

    it("should return true when access token is present and not expired", async () => {
      expect(store.tokens.accessToken).toBeTruthy();
      const { isLoggedIn } = await Userfront.getSession();
      expect(isLoggedIn).toEqual(true);
    });

    it("should return true (after refresh) if the access token is expired but the refresh token is valid", async () => {
      // Set unexpired refresh token
      store.tokens.refreshToken = createRefreshToken({
        exp: parseInt(addMinutes(new Date(), 60).getTime() / 1000),
      });

      // Set expired access token
      store.tokens.accessToken = createAccessToken({
        exp: parseInt(new Date() / 1000) - 1,
      });

      // Mock the refresh method to update the access token
      Refresh.refresh.mockImplementationOnce(() => {
        return new Promise((resolve) => {
          store.tokens.accessToken = createAccessToken({
            exp: parseInt(addMinutes(new Date(), 60).getTime() / 1000),
          });
          resolve({});
        });
      });

      // Call getSession
      const { isLoggedIn } = await Userfront.getSession();

      // Assert that refresh was called
      expect(Refresh.refresh).toHaveBeenCalled();

      // Assert that the result is true
      expect(isLoggedIn).toEqual(true);
    });

    it("should return true (after refresh) if the access token is missing but the refresh token is valid", async () => {
      // Set unexpired refresh token
      store.tokens.refreshToken = createRefreshToken({
        exp: parseInt(addMinutes(new Date(), 60).getTime() / 1000),
      });

      // Delete the access token
      store.tokens.accessToken = null;

      // Mock the refresh method to update the access token
      Refresh.refresh.mockImplementationOnce(() => {
        return new Promise((resolve) => {
          store.tokens.accessToken = createAccessToken({
            exp: parseInt(addMinutes(new Date(), 60).getTime() / 1000),
          });
          resolve({});
        });
      });

      // Call getSession
      const { isLoggedIn } = await Userfront.getSession();

      // Assert that refresh was called
      expect(Refresh.refresh).toHaveBeenCalled();

      // Assert that the result is true
      expect(isLoggedIn).toEqual(true);
    });

    it("should return false if both the access token and refresh token are missing", async () => {
      // Delete the access token and refresh token
      store.tokens.accessToken = null;
      store.tokens.refreshToken = null;

      // Call getSession
      const { isLoggedIn } = await Userfront.getSession();

      // Assert that the result is false
      expect(isLoggedIn).toEqual(false);
    });

    it("should return false if both the access token and refresh token are expired", async () => {
      // Set access token and refresh token to be expired
      store.tokens.accessToken = createAccessToken({
        exp: parseInt(new Date() / 1000) - 1,
      });
      store.tokens.refreshToken = createRefreshToken({
        exp: parseInt(new Date() / 1000) - 1,
      });

      // Call getSession
      const { isLoggedIn } = await Userfront.getSession();

      // Assert that the result is false
      expect(isLoggedIn).toEqual(false);
    });

    it("should return false if there is no access token, and the refresh token is expired", async () => {
      // Remove access token and set refresh token to be expired
      store.tokens.accessToken = null;
      store.tokens.refreshToken = createRefreshToken({
        exp: parseInt(new Date() - 1000) / 1000,
      });

      // Call getSession
      const { isLoggedIn } = await Userfront.getSession();

      // Assert that the result is false
      expect(isLoggedIn).toEqual(false);
    });

    it("should return false if the access token is missing, and the refresh fails", async () => {
      // Remove access token and set refresh token to be unexpired
      store.tokens.accessToken = null;
      store.tokens.refreshToken = createRefreshToken({
        exp: parseInt(addMinutes(new Date(), 60).getTime() / 1000),
      });

      // Mock the refresh method to update the access token
      Refresh.refresh.mockImplementationOnce(() => {
        return Promise.reject({ message: "Unauthorized" });
      });

      // Call getSession
      const { isLoggedIn } = await Userfront.getSession();

      // Assert that refresh was called
      expect(Refresh.refresh).toHaveBeenCalled();

      // Assert that the result is false
      expect(isLoggedIn).toEqual(false);
    });

    it("should return false if the access token is expired, and the refresh fails", async () => {
      // Remove access token and set refresh token to be expired
      store.tokens.accessToken = null;
      store.tokens.refreshToken = createRefreshToken({
        exp: parseInt(addMinutes(new Date(), 60).getTime() / 1000),
      });

      // Mock the refresh method to fail
      Refresh.refresh.mockImplementationOnce(() => {
        return Promise.reject({ message: "Unauthorized" });
      });

      // Call getSession
      const { isLoggedIn } = await Userfront.getSession();

      // Assert that refresh was called
      expect(Refresh.refresh).toHaveBeenCalled();

      // Assert that the result is false
      expect(isLoggedIn).toEqual(false);
    });
  });
});
