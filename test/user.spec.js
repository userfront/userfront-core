import jwt from "jsonwebtoken";
import axios from "axios";

import { apiUrl } from "../src/constants.js";
import Userfront from "../src/index.js";
import user from "../src/user.js";

jest.mock("axios");

const tenantId = "abcdefg";
Userfront.init(tenantId);

describe("User", () => {
  const dummyUser = {
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

  Userfront.setCookiesAndTokens = Userfront.__get__("setCookiesAndTokens");

  beforeAll(() => {
    Userfront.init(tenantId);

    // Create and set access & ID tokens
    const accessToken = jwt.sign(
      {
        mode: "test",
        tenantId,
        userId: 3,
        userUuid: "aaaa-bbbb-cccc-dddd",
        isConfirmed: true,
        authorization: {
          [tenantId]: {
            roles: ["member"],
          },
        },
        sessionId: "bbbb-cccc-dddd-eeee",
      },
      "accessTokenSecret"
    );
    const idToken = jwt.sign(dummyUser, "idTokenSecret");

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
        ...JSON.parse(JSON.stringify(dummyUser)),
        ...JSON.parse(JSON.stringify(dummyUser.data)),
      };

      for (const prop in dummyUser) {
        expect(parsedUser[prop]).toEqual(ufUser[prop]);
      }
    });
  });

  it("should get user's information", () => {
    const parsedUser = {
      ...JSON.parse(JSON.stringify(dummyUser)),
      ...JSON.parse(JSON.stringify(dummyUser.data)),
    };

    for (const prop in dummyUser) {
      expect(parsedUser[prop]).toEqual(Userfront.store.user[prop]);
    }
  });

  it("should update user's information via API and call refresh()", async () => {
    const updates = {
      data: {
        nickname: "ace",
      },
    };

    axios.put.mockImplementationOnce(() => Promise.resolve(updates));

    const originalTokens = {
      idToken: JSON.parse(JSON.stringify(Userfront.store.idToken)),
      accessToken: JSON.parse(JSON.stringify(Userfront.store.accessToken)),
    };
    expect(Userfront.store.user.nickname).toBeUndefined;

    await Userfront.store.user.update(updates);

    const { userId } = Userfront.store.user;
    expect(axios.put).toBeCalledWith(
      `${apiUrl}tenants/${tenantId}/users/${userId}`,
      updates
    );
    expect(Userfront.store.user.nickname).toEqual(updates.data.nickname);

    expect(originalTokens.idToken).not.toEqual(Userfront.store.idToken);
    expect(originalTokens.accessToken).not.toEqual(Userfront.store.accessToken);
  });
});
