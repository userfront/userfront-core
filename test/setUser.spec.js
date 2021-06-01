import utils from "./utils.js";
import Userfront from "../src/index.js";
import createUser from "../src/user.js";

// Mock user factory to skip implementation and return object with mock update method
jest.mock("../src/user.js", () => {
  return jest.fn().mockImplementation(() => {
    return {
      mockUpdate: jest.fn(),
    };
  });
});

// Expose non-exported functions
Userfront.setCookiesAndTokens = Userfront.__get__("setCookiesAndTokens");
Userfront.setUser = Userfront.__get__("setUser");

// Mock `Userfront.verifyToken` to assert calls later
Userfront.__set__("verifyToken", jest.fn());
Userfront.verifyToken = Userfront.__get__("verifyToken");

const { user } = Userfront;
const tenantId = "abcdefg";

describe("setUser", () => {
  beforeAll(() => {
    Userfront.init(tenantId);
    Userfront.setCookiesAndTokens({
      access: {
        value: utils.createAccessToken(),
      },
      id: {
        value: utils.createIdToken(),
      },
      refresh: {
        value: "",
      },
    });
  });

  it("should set user after verifying ID token", async () => {
    Object.assign(Userfront.store.user, {});

    await Userfront.setUser();

    expect(Userfront.verifyToken).toHaveBeenCalledTimes(1);
    expect(Userfront.verifyToken).toHaveBeenCalledWith(Userfront.store.idToken);

    expect(createUser).toHaveBeenCalledTimes(1);
    expect(createUser).toHaveBeenCalledWith({
      store: Userfront.store,
      afterUpdate: Userfront.refresh,
    });

    // Should have assigned mocked user object to Userfront.store.user
    expect(user).toBeDefined;
    expect(user).toHaveProperty("mockUpdate");
  });
});
