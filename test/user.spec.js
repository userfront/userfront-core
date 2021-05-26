import jwt from "jsonwebtoken";
import axios from "axios";

import utils from "./utils";
import { apiUrl } from "../src/constants.js";
import Userfront from "../src/index.js";
import user from "../src/user.js";

jest.mock("axios");
const tenantId = "abcdefgh";

describe("User", () => {
  // Make non-exported functions available for testing
  Userfront.setCookiesAndTokens = Userfront.__get__("setCookiesAndTokens");
  Userfront.setUser = Userfront.__get__("setUser");

  beforeAll(() => {
    Userfront.init(tenantId);

    // Create and set access & ID tokens
    const accessToken = utils.createAccessToken();
    const idToken = utils.createIdToken();

    Userfront.setCookiesAndTokens({
      access: {
        value: accessToken,
      },
      id: {
        value: idToken,
      },
      refresh: {
        value: "",
      },
    });
  });

  describe("user constructor", () => {
    it("should set user's information based on ID token and return user object", () => {
      const parsedUser = {
        ...JSON.parse(JSON.stringify(utils.idTokenUserDefaults)),
      };

      const ufUser = user({ store: Userfront.store });

      // Assert ufUser values were set correctly in user() constructor
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
      const ufUser = Userfront.user;

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
    it("should call afterUpdate hook after updating", async () => {
      const updates = {
        name: "Jane Doe",
      };

      // Manually assign user object and pass in spy in place of `Userfront.refresh()`
      const refresh = jest.fn();
      Userfront.store.user = user({
        store: Userfront.store,
        afterUpdate: refresh,
      });

      // Update user via Userfront API
      await Userfront.user.update(updates);

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
      expect(refresh).toHaveBeenCalledTimes(1);

      // Revert Userfront.user without refresh spy
      Userfront.setUser();
    });

    it("should update user's information via API", async () => {
      const updates = {
        username: "john-doe-updated",
        data: {
          country: "Spain",
        },
      };

      // Create mock tokens & refresh response
      const accessToken = utils.createAccessToken();
      const idToken = jwt.sign(
        {
          ...utils.idTokenUserDefaults,
          ...utils.sharedTokenProperties.token,
          ...updates,
        },
        utils.randomString()
      );
      axios.post.mockImplementationOnce(() =>
        Promise.resolve({
          data: {
            tokens: {
              access: {
                value: accessToken,
              },
              id: {
                value: idToken,
              },
              refresh: {
                value: "",
              },
            },
          },
        })
      );
      const originalTokens = {
        idToken: Userfront.store.idToken,
        accessToken: Userfront.store.accessToken,
      };

      // Update user via Userfront API
      await Userfront.user.update(updates);

      // Should have made "update user" API request
      const { userId } = jwt.decode(Userfront.store.accessToken);
      expect(axios.put).toBeCalledWith({
        url: `${apiUrl}tenants/${tenantId}/users/${userId}`,
        headers: {
          authorization: `Bearer ${originalTokens.accessToken}`,
        },
        payload: updates,
      });

      // Assert user was updated
      expect(Userfront.user.username).toEqual(updates.username);
      expect(Userfront.user.data.country).toEqual(updates.data.country);
      expect(Userfront.user.data.age).toBeUndefined;
      expect(Userfront.user.data.color).toBeUndefined;
      expect(Userfront.user.data.birthdate).toBeUndefined;
      expect(Userfront.user.data.metadata).toBeUndefined;

      // Assert tokens were updated
      expect(originalTokens.idToken).not.toEqual(Userfront.store.idToken);
      expect(originalTokens.accessToken).not.toEqual(
        Userfront.store.accessToken
      );
    });
  });
});
