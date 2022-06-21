import Userfront from "../src/index.js";
import api from "../src/api";
import { setCookie } from "../src/cookies.js";
import { setUser } from "../src/user.js";
import { refresh } from "../src/refresh.js";
import { setTokensFromCookies } from "../src/tokens.js";
import { getTotp } from "../src/totp.js";
import { updatePassword } from "../src/password.js";
import {
  createAccessToken,
  createIdToken,
  idTokenUserDefaults,
  defaultIdTokenProperties,
} from "./config/utils.js";

jest.mock("../src/api.js");
jest.mock("../src/refresh.js");
console.warn = jest.fn();

const tenantId = "hijk9876";

describe("User", () => {
  beforeAll(async () => {
    // Set the factory access and ID tokens as cookies
    Userfront.store.tenantId = tenantId;
    setCookie(
      createAccessToken(),
      { secure: "true", sameSite: "Lax" },
      "access"
    );
    setCookie(createIdToken(), { secure: "true", sameSite: "Lax" }, "id");

    return Promise.resolve();
  });

  beforeEach(() => {
    Userfront.init(tenantId);
  });

  afterEach(jest.resetAllMocks);

  describe("user object", () => {
    it("should get user's information", () => {
      const defaultUserValues = idTokenUserDefaults;

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
      const newUserValues = JSON.parse(JSON.stringify(idTokenUserDefaults));

      // Change the ID token value
      newUserValues.name = "Johnny B. Good";
      newUserValues.data.color = "greenish";
      setCookie(
        createIdToken(newUserValues),
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
      expect(api.put).toBeCalledWith(`/self`, payload, {
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
      for (const prop of defaultIdTokenProperties) {
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

      api.put.mockImplementationOnce(() =>
        Promise.reject(new Error("Bad Request"))
      );

      // Attempt update without object
      expect(Userfront.user.update(payload)).rejects.toThrow("Bad Request");

      // Should have made "update user" API request
      expect(api.put).toBeCalledWith(`/self`, payload, {
        headers: {
          authorization: `Bearer ${originalTokens.accessToken}`,
        },
      });

      // Assert user was not modified
      for (const prop of defaultIdTokenProperties) {
        expect(Userfront.user[prop]).toEqual(originalUser[prop]);
      }

      // Token refresh should not have been issued
      expect(refresh).not.toHaveBeenCalled();

      // Assert tokens were not modified
      expect(originalTokens.idToken).toEqual(Userfront.tokens.idToken);
      expect(originalTokens.accessToken).toEqual(Userfront.tokens.accessToken);
    });
  });

  describe("user.hasRole()", () => {
    beforeAll(() => {
      const authorization = {
        [tenantId]: {
          roles: ["custom role", "admin"],
        },
        jklm9876: {
          roles: ["custom role", "member"],
        },
        qrst3456: {
          roles: [],
        },
      };
      setCookie(
        createAccessToken({
          authorization,
        }),
        { secure: "true", sameSite: "Lax" },
        "access"
      );
      Userfront.init(tenantId);
    });

    it("should determine whether the user has a given role in the primary tenant", async () => {
      expect(Userfront.user.hasRole("custom role")).toEqual(true);
      expect(Userfront.user.hasRole("admin")).toEqual(true);
      expect(Userfront.user.hasRole("member")).toEqual(false);
      expect(Userfront.user.hasRole("foobar")).toEqual(false);
      expect(Userfront.user.hasRole()).toEqual(false);
    });

    it("should accept the tenantId as an optional parameter", async () => {
      expect(
        Userfront.user.hasRole("custom role", { tenantId: "jklm9876" })
      ).toEqual(true);
      expect(
        Userfront.user.hasRole("member", { tenantId: "jklm9876" })
      ).toEqual(true);
      expect(Userfront.user.hasRole("admin", { tenantId: "jklm9876" })).toEqual(
        false
      );
      expect(Userfront.user.hasRole("admin", { tenantId: "qrst3456" })).toEqual(
        false
      );
      expect(Userfront.user.hasRole("admin", { tenantId: "foobar" })).toEqual(
        false
      );
    });
  });

  describe("user.updatePassword()", () => {
    it("should be the updatePassword() method", () => {
      expect(Userfront.user.updatePassword).toEqual(updatePassword);
    });
  });

  describe("user.getTotp()", () => {
    it("should be the getTotp() method", () => {
      expect(Userfront.user.getTotp).toEqual(getTotp);
    });
  });
});
