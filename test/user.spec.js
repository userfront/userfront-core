import jwt from "jsonwebtoken";
import axios from "axios";

import { apiUrl } from "../src/constants.js";
import Userfront from "../src/index.js";
import user from "../src/user.js";

jest.mock("axios");

const tenantId = "abcdefgh";

describe("User", () => {
  // Make available for testing
  Userfront.setCookiesAndTokens = Userfront.__get__("setCookiesAndTokens");

  const accessTokenUserDefaults = {
    userId: 3,
    userUuid: "aaaa-bbbb-cccc-dddd",
    isConfirmed: true,
    authorization: {
      [tenantId]: {
        roles: ["member"],
      },
    },
    sessionId: "bbbb-cccc-dddd-eeee",
  };

  const idTokenUserDefaults = {
    name: "John Doe",
    email: "johndoe@example.com",
    username: "johndoe",
    image: "https://example.com/profile-image.png",
    data: {
      age: 22,
      color: "blue",
      birthdate: new Date(),
      data: {
        country: "Monoco",
      },
      metadata: {
        lastLogin: new Date(),
      },
    },
    confirmedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(() => {
    Userfront.init(tenantId);

    // Create and set access & ID tokens
    const accessToken = jwt.sign(
      {
        mode: "test",
        tenantId,
        ...accessTokenUserDefaults,
      },
      "accessTokenSecret"
    );
    const idToken = jwt.sign(idTokenUserDefaults, "idTokenSecret");

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

  describe("constructor", () => {
    it("should set user's information", () => {
      const ufUser = user({
        idToken: jwt.decode(Userfront.store.idToken),
        accessToken: jwt.decode(Userfront.store.accessToken),
      });

      const parsedUser = {
        ...JSON.parse(JSON.stringify(idTokenUserDefaults)),
        ...JSON.parse(JSON.stringify(idTokenUserDefaults.data)),
      };

      for (const prop in idTokenUserDefaults) {
        expect(parsedUser[prop]).toEqual(ufUser[prop]);
      }
    });
  });

  it("should get user's information", () => {
    const parsedUser = {
      ...JSON.parse(JSON.stringify(idTokenUserDefaults)),
      ...JSON.parse(JSON.stringify(idTokenUserDefaults.data)),
    };

    for (const prop in idTokenUserDefaults) {
      expect(parsedUser[prop]).toEqual(Userfront.store.user[prop]);
    }
  });

  it("should update user's information via API and call refresh()", async () => {
    const updates = {
      username: "john-doe-updated",
      data: {
        country: "Spain",
      },
    };

    // Create mock tokens & refresh response
    const accessToken = jwt.sign(
      {
        mode: "test",
        tenantId,
        ...accessTokenUserDefaults,
      },
      "updatedAccessTokenSecret"
    );
    const idToken = jwt.sign(
      {
        ...idTokenUserDefaults,
        ...updates,
      },
      "updatedIdTokenSecret"
    );
    axios.get.mockImplementationOnce(() =>
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
    await Userfront.store.user.update(updates);

    const { userId } = Userfront.store.user;
    expect(axios.put).toBeCalledWith({
      url: `${apiUrl}tenants/${tenantId}/users/${userId}`,
      headers: {
        authorization: `Bearer ${originalTokens.accessToken}`,
      },
      payload: updates,
    });
    expect(axios.get).toBeCalledWith({
      url: `${apiUrl}tenants/${tenantId}/refresh`,
      headers: {
        authorization: `Bearer ${originalTokens.accessToken}`,
      },
    });

    expect(Userfront.store.user.username).toEqual(updates.username);
    expect(Userfront.store.user.country).toEqual(updates.data.country);

    expect(originalTokens.idToken).not.toEqual(Userfront.store.idToken);
    expect(originalTokens.accessToken).not.toEqual(Userfront.store.accessToken);
  });
});
