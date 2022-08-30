import Cookies from "js-cookie";
import Userfront from "../src/index.js";
import {
  createAccessToken,
  createIdToken,
  createRefreshToken,
  addMinutes,
} from "./config/utils.js";
import * as Refresh from "../src/refresh.js";
import { store } from "../src/store.js";

jest.mock("../src/refresh.js");

const tenantId = "abcd4321";
const mockAccessToken = createAccessToken();
const mockIdToken = createIdToken();

describe("Userfront.tokens helpers", () => {
  beforeAll(() => {
    // Set mock cookies
    Cookies.set(`id.${tenantId}`, mockIdToken, {});
    Cookies.set(`access.${tenantId}`, mockAccessToken, {});
    // Initialize Userfront
    Userfront.init(tenantId);
  });

  it("tokens.accessToken should give JWT access token", () => {
    expect(Userfront.tokens.accessToken).toEqual(mockAccessToken);
  });

  it("tokens.idToken should give JWT ID token", () => {
    expect(Userfront.tokens.idToken).toEqual(mockIdToken);
  });

  it("tokens.accessTokenName should give name of access token", () => {
    expect(Userfront.tokens.accessTokenName).toEqual(`access.${tenantId}`);
  });

  it("tokens.idTokenName should give name of ID token", () => {
    expect(Userfront.tokens.idTokenName).toEqual(`id.${tenantId}`);
  });

  it("tokens.refresh should equal the refresh method", () => {
    expect(Userfront.tokens.refresh).toEqual(Refresh.refresh);
  });

  describe("isLoggedIn()", () => {
    afterEach(() => {
      jest.resetAllMocks();
    });

    it("should return true when access token is present and not expired", async () => {
      expect(store.tokens.accessToken).toBeTruthy();
      const isLoggedIn = await Userfront.isLoggedIn();
      expect(isLoggedIn).toEqual(true);
    });

    it("should return true (after refresh) if the access token is expired but the refresh token is valid", async () => {
      // Set unexpired refresh token
      store.tokens.refreshToken = createRefreshToken({
        exp: addMinutes(new Date(), 60).getTime(),
      });

      // Set expired access token
      store.tokens.accessToken = createAccessToken({
        exp: new Date() - 1000,
      });

      // Mock the refresh method to update the access token
      Refresh.refresh.mockImplementationOnce(() => {
        return new Promise((resolve) => {
          store.tokens.accessToken = createAccessToken({
            exp: addMinutes(new Date(), 60).getTime(),
          });
          resolve({});
        });
      });

      // Call isLoggedIn
      const isLoggedIn = await Userfront.isLoggedIn();

      // Assert that refresh was called
      expect(Refresh.refresh).toHaveBeenCalled();

      // Assert that the result is true
      expect(isLoggedIn).toEqual(true);
    });

    it("should return true (after refresh) if the access token is missing but the refresh token is valid", async () => {
      // Set unexpired refresh token
      store.tokens.refreshToken = createRefreshToken({
        exp: addMinutes(new Date(), 60).getTime(),
      });

      // Delete the access token
      store.tokens.accessToken = null;

      // Mock the refresh method to update the access token
      Refresh.refresh.mockImplementationOnce(() => {
        return new Promise((resolve) => {
          store.tokens.accessToken = createAccessToken({
            exp: addMinutes(new Date(), 60).getTime(),
          });
          resolve({});
        });
      });

      // Call isLoggedIn
      const isLoggedIn = await Userfront.isLoggedIn();

      // Assert that refresh was called
      expect(Refresh.refresh).toHaveBeenCalled();

      // Assert that the result is true
      expect(isLoggedIn).toEqual(true);
    });

    it("should return false if both the access token and refresh token are missing", async () => {
      // Delete the access token and refresh token
      store.tokens.accessToken = null;
      store.tokens.refreshToken = null;

      // Call isLoggedIn
      const isLoggedIn = await Userfront.isLoggedIn();

      // Assert that the result is false
      expect(isLoggedIn).toEqual(false);
    });

    it("should return false if both the access token and refresh token are expired", async () => {
      // Set access token and refresh token to be expired
      store.tokens.accessToken = createAccessToken({
        exp: new Date() - 1000,
      });
      store.tokens.refreshToken = createRefreshToken({
        exp: new Date() - 1000,
      });

      // Call isLoggedIn
      const isLoggedIn = await Userfront.isLoggedIn();

      // Assert that the result is false
      expect(isLoggedIn).toEqual(false);
    });

    it("should return false if there is no access token, and the refresh token is expired", async () => {
      // Remove access token and set refresh token to be expired
      store.tokens.accessToken = null;
      store.tokens.refreshToken = createRefreshToken({
        exp: new Date() - 1000,
      });

      // Call isLoggedIn
      const isLoggedIn = await Userfront.isLoggedIn();

      // Assert that the result is false
      expect(isLoggedIn).toEqual(false);
    });

    it("should return false if the access token is missing, and the refresh fails", async () => {
      // Remove access token and set refresh token to be unexpired
      store.tokens.accessToken = null;
      store.tokens.refreshToken = createRefreshToken({
        exp: addMinutes(new Date(), 60).getTime(),
      });

      // Mock the refresh method to update the access token
      Refresh.refresh.mockImplementationOnce(() => {
        return Promise.reject({ message: "Unauthorized" });
      });

      // Call isLoggedIn
      const isLoggedIn = await Userfront.isLoggedIn();

      // Assert that refresh was called
      expect(Refresh.refresh).toHaveBeenCalled();

      // Assert that the result is false
      expect(isLoggedIn).toEqual(false);
    });

    it("should return false if the access token is expired, and the refresh fails", async () => {
      // Remove access token and set refresh token to be expired
      store.tokens.accessToken = null;
      store.tokens.refreshToken = createRefreshToken({
        exp: addMinutes(new Date(), 60).getTime(),
      });

      // Mock the refresh method to fail
      Refresh.refresh.mockImplementationOnce(() => {
        return Promise.reject({ message: "Unauthorized" });
      });

      // Call isLoggedIn
      const isLoggedIn = await Userfront.isLoggedIn();

      // Assert that refresh was called
      expect(Refresh.refresh).toHaveBeenCalled();

      // Assert that the result is false
      expect(isLoggedIn).toEqual(false);
    });
  });
});
