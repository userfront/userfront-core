import axios from "axios";

import { apiUrl } from "../src/constants.js";
import { setCookie } from "../src/cookies.js";
import { setUser } from "../src/user.js";
import { refresh } from "../src/refresh.js";
import { setTokensFromCookies } from "../src/tokens.js";
import utils from "./config/utils.js";
import Userfront from "../src/index.js";

jest.mock("axios");
jest.mock("../src/refresh.js", () => {
  return {
    __esModule: true,
    refresh: jest.fn(),
  };
});
console.warn = jest.fn();

const tenantId = "abcdefgh";

describe("User", () => {
  beforeAll(async () => {
    // Set the factory access and ID tokens as cookies
    Userfront.store.tenantId = tenantId;
    setCookie(
      utils.createAccessToken(),
      { secure: "true", sameSite: "Lax" },
      "access"
    );
    setCookie(utils.createIdToken(), { secure: "true", sameSite: "Lax" }, "id");

    // Initialize the library
    Userfront.init(tenantId);
    return Promise.resolve();
  });

  afterEach(jest.resetAllMocks);

  describe("user object", () => {
    it("should get user's information", () => {
      const defaultUserValues = utils.idTokenUserDefaults;

      // Assert primary values were set correctly
      for (const prop in defaultUserValues) {
        expect(Userfront.user[prop]).toEqual(defaultUserValues[prop]);
      }

      // Assert data values were set correctly
      for (const prop in defaultUserValues.data) {
        expect(Userfront.user.data[prop]).toEqual(defaultUserValues.data[prop]);
      }
    });
  });

  describe("setUser", () => {
    it("should set store.user object based on ID token", () => {
      const newUserValues = JSON.parse(
        JSON.stringify(utils.idTokenUserDefaults)
      );

      // Change the ID token value
      newUserValues.name = "Johnny B. Good";
      newUserValues.data.color = "greenish";
      setCookie(
        utils.createIdToken(newUserValues),
        { secure: "true", sameSite: "Lax" },
        "id"
      );
      setTokensFromCookies();

      // Call setUser
      setUser();

      // Assert primary values were set correctly
      for (const prop in newUserValues) {
        expect(Userfront.user[prop]).toEqual(newUserValues[prop]);
      }

      // Assert data values were set correctly
      for (const prop in newUserValues.data) {
        expect(Userfront.user.data[prop]).toEqual(newUserValues.data[prop]);
      }
    });
  });

  describe("user.update()", () => {
    it("should update user's information via API", async () => {
      const payload = {
        username: "john-doe-updated",
        data: {
          country: "Spain",
        },
      };

      // Call the update method
      await Userfront.user.update(payload);

      // Should have made API request
      expect(axios.put).toBeCalledWith(`${apiUrl}self`, payload, {
        headers: {
          authorization: `Bearer ${Userfront.tokens.accessToken}`,
        },
      });

      // Should have called `refresh` function
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(refresh).toHaveBeenCalledWith();
      refresh.mockClear();
    });

    it("should throw if `updates` object not provided", async () => {
      const originalUser = { ...Userfront.user };
      const originalTokens = {
        idToken: Userfront.tokens.idToken,
        accessToken: Userfront.tokens.accessToken,
      };

      // Attempt update without object, should log a warning
      expect(console.warn).not.toHaveBeenCalled();
      await Userfront.user.update();
      expect(console.warn).toHaveBeenCalledWith(
        "Missing user properties to update"
      );

      console.warn.mockClear();

      // Attempt update with empty object, should log a warning
      expect(console.warn).not.toHaveBeenCalled();
      await Userfront.user.update({});
      expect(console.warn).toHaveBeenCalledWith(
        "Missing user properties to update"
      );

      // Assert user was not modified
      for (const prop of utils.defaultIdTokenProperties) {
        expect(Userfront.user[prop]).toEqual(originalUser[prop]);
      }

      // Token refresh should not have been issued
      expect(refresh).not.toHaveBeenCalled();

      // Assert tokens were not modified
      expect(originalTokens.idToken).toEqual(Userfront.tokens.idToken);
      expect(originalTokens.accessToken).toEqual(Userfront.tokens.accessToken);
    });

    it("should throw if Userfront API throws error", async () => {
      const originalUser = { ...Userfront.user };
      const originalTokens = {
        idToken: Userfront.tokens.idToken,
        accessToken: Userfront.tokens.accessToken,
      };

      const payload = { name: "Jane Doe" };

      axios.put.mockImplementationOnce(() =>
        Promise.reject(new Error("Bad Request"))
      );

      // Attempt update without object
      expect(Userfront.user.update(payload)).rejects.toThrow("Bad Request");

      // Should have made "update user" API request
      expect(axios.put).toBeCalledWith(`${apiUrl}self`, payload, {
        headers: {
          authorization: `Bearer ${originalTokens.accessToken}`,
        },
      });

      // Assert user was not modified
      for (const prop of utils.defaultIdTokenProperties) {
        expect(Userfront.user[prop]).toEqual(originalUser[prop]);
      }

      // Token refresh should not have been issued
      expect(refresh).not.toHaveBeenCalled();

      // Assert tokens were not modified
      expect(originalTokens.idToken).toEqual(Userfront.tokens.idToken);
      expect(originalTokens.accessToken).toEqual(Userfront.tokens.accessToken);
    });
  });
});
