import jwt from "jsonwebtoken";
import axios from "axios";

import utils from "./utils.js";
import { apiUrl } from "../src/constants.js";
import createUser from "../src/user.js";

import Userfront from "../src/index.js";
const { user } = Userfront;

jest.mock("axios");
const tenantId = "abcdefgh";

describe("User", () => {
  beforeAll(async () => {
    // Set the factory access and ID tokens as cookies
    Userfront.store.tenantId = tenantId;
    Userfront.setCookie(
      utils.createAccessToken(),
      { secure: "true", sameSite: "Lax" },
      "access"
    );
    Userfront.setCookie(
      utils.createIdToken(),
      { secure: "true", sameSite: "Lax" },
      "id"
    );

    // Mock `Userfront.verifyToken` to prevent implementation
    Userfront.__set__("verifyToken", () => jest.fn(() => Promise.resolve()));

    // Mock `Userfront.refresh` to assert calls later
    Userfront.__set__("refresh", jest.fn());
    Userfront.refresh = Userfront.__get__("refresh");

    // Initialize the library
    Userfront.init(tenantId);
    return Promise.resolve();
  });

  describe("user constructor", () => {
    it("should set user's information based on ID token and return user object", () => {
      const parsedUser = {
        ...JSON.parse(JSON.stringify(utils.idTokenUserDefaults)),
      };

      const ufUser = createUser({ store: Userfront.store });

      // Assert ufUser values were set correctly in user constructor
      for (const prop in utils.defaultIdTokenProperties) {
        expect(parsedUser[prop]).toEqual(ufUser[prop]);
      }

      // Assert ufUser.data values were set correctly
      for (const prop in parsedUser.data) {
        expect(parsedUser.data[prop]).toEqual(ufUser.data[prop]);
      }
    });
  });

  describe("user object", () => {
    it("should get user's information", () => {
      const parsedUser = {
        ...JSON.parse(JSON.stringify(utils.idTokenUserDefaults)),
      };

      // ufUser has been updated via ID token in beforeAll
      const ufUser = user;

      // ufUser values from ID token should match the defaults given
      for (const prop in utils.defaultIdTokenProperties) {
        expect(parsedUser[prop]).toEqual(ufUser[prop]);
      }

      // Assert ufUser.data values were set correctly
      for (const prop in parsedUser.data) {
        expect(parsedUser.data[prop]).toEqual(ufUser.data[prop]);
      }
    });
  });

  describe("user.update()", () => {
    it("should update user's information via API then call afterUpdate hook", async () => {
      const updates = {
        username: "john-doe-updated",
        data: {
          country: "Spain",
        },
      };

      // Update user via Userfront API
      await user.update(updates);

      // Should have made "update user" API request
      const { userId } = jwt.decode(Userfront.store.accessToken);
      expect(axios.put).toBeCalledWith({
        url: `${apiUrl}tenants/${tenantId}/users/${userId}`,
        headers: {
          authorization: `Bearer ${Userfront.store.accessToken}`,
        },
        payload: updates,
      });

      // Should have called `afterUpdate` function
      expect(Userfront.refresh).toHaveBeenCalledTimes(1);
      Userfront.refresh.mockClear();
    });

    it("should throw if `updates` object not provided", async () => {
      const originalUser = { ...user };
      const originalTokens = {
        idToken: Userfront.store.idToken,
        accessToken: Userfront.store.accessToken,
      };

      // Attempt update without object
      expect(user.update()).rejects.toThrow(
        "Missing user properties to update"
      );
      // Attempt update with empty object
      expect(user.update({})).rejects.toThrow(
        "Missing user properties to update"
      );

      // Assert user was not modified
      for (const prop of utils.defaultIdTokenProperties) {
        expect(user[prop]).toEqual(originalUser[prop]);
      }

      // Token refresh should not have been issued
      expect(Userfront.refresh).not.toHaveBeenCalled();
      Userfront.refresh.mockClear();

      // Assert tokens were not modified
      expect(originalTokens.idToken).toEqual(Userfront.store.idToken);
      expect(originalTokens.accessToken).toEqual(Userfront.store.accessToken);
    });

    it("should throw if Userfront API throws error", async () => {
      const originalUser = { ...user };
      const originalTokens = {
        idToken: Userfront.store.idToken,
        accessToken: Userfront.store.accessToken,
      };

      const updates = { name: "Jane Doe" };

      axios.put.mockImplementationOnce(() =>
        Promise.reject(new Error("Bad Request"))
      );

      // Attempt update without object
      expect(user.update(updates)).rejects.toThrow("Bad Request");

      // Should have made "update user" API request
      const { userId } = jwt.decode(Userfront.store.accessToken);
      expect(axios.put).toBeCalledWith({
        url: `${apiUrl}tenants/${tenantId}/users/${userId}`,
        headers: {
          authorization: `Bearer ${originalTokens.accessToken}`,
        },
        payload: updates,
      });

      // Assert user was not modified
      for (const prop of utils.defaultIdTokenProperties) {
        expect(user[prop]).toEqual(originalUser[prop]);
      }

      // Token refresh should not have been issued
      expect(Userfront.refresh).not.toHaveBeenCalled();
      Userfront.refresh.mockClear();

      // Assert tokens were not modified
      expect(originalTokens.idToken).toEqual(Userfront.store.idToken);
      expect(originalTokens.accessToken).toEqual(Userfront.store.accessToken);
    });
  });
});
