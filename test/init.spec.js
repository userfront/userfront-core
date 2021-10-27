import axios from "axios";
import {
  createAccessToken,
  createIdToken,
  resetStore,
} from "./config/utils.js";
import Userfront from "../src/index.js";
import { setMode } from "../src/mode.js";
import { store } from "../src/store.js";

const tenantId = "abcd5432";
const domain = "com.example.myapp";

jest.mock("axios");

describe("init() method with domain option", () => {
  beforeEach(() => {
    // Mock the axios POST response (used for signup & login)
    const mockAccessToken = createAccessToken();
    const mockIdToken = createIdToken();
    axios.post.mockResolvedValue({
      status: 200,
      data: {
        tokens: {
          access: {
            value: mockAccessToken,
            secure: true,
            sameSite: "Lax",
            expires: 30,
          },
          id: {
            value: mockIdToken,
            secure: true,
            sameSite: "Lax",
            expires: 30,
          },
        },
      },
    });
  });

  afterEach(() => {
    resetStore(Userfront);
    jest.resetAllMocks();
  });

  it("should include the x-application-id header for mode", async () => {
    store.mode = "test";
    Userfront.init(tenantId, { domain });

    axios.get.mockResolvedValue({
      status: 200,
      data: {
        mode: "live",
      },
    });
    await setMode();

    expect(axios.defaults.headers.common["x-application-id"]).toEqual(
      `https://${domain}`
    );
    expect(axios.get).toHaveBeenCalledWith(
      `https://api.userfront.com/v0/tenants/${tenantId}/mode`
    );
    expect(store.mode).toEqual("live");
  });

  it("should include the x-application-id header for signup", async () => {
    Userfront.init(tenantId, { domain });

    const email = "user@example.com";
    const password = "foobar";

    await Userfront.signup({ method: "password", email, password });

    expect(axios.defaults.headers.common["x-application-id"]).toEqual(
      `https://${domain}`
    );
    expect(axios.post).toHaveBeenCalledWith(
      "https://api.userfront.com/v0/auth/create",
      {
        email,
        password,
        username: undefined,
        name: undefined,
        data: undefined,
        tenantId,
      }
    );
  });

  it("should include the x-application-id header for login", async () => {
    Userfront.init(tenantId, { domain });

    const email = "user@example.com";
    const password = "foobar";

    await Userfront.login({ method: "password", email, password });

    expect(axios.defaults.headers.common["x-application-id"]).toEqual(
      `https://${domain}`
    );
    expect(axios.post).toHaveBeenCalledWith(
      "https://api.userfront.com/v0/auth/basic",
      {
        emailOrUsername: email,
        password,
        tenantId,
      }
    );
  });

  it("should include the x-application-id header for logout", async () => {
    Userfront.init(tenantId, { domain });

    axios.get.mockResolvedValue({
      status: 200,
      data: {
        message: "ok",
      },
    });

    const accessTokenBeforeLogout = Userfront.tokens.accessToken;

    await Userfront.logout();

    expect(axios.defaults.headers.common["x-application-id"]).toEqual(
      `https://${domain}`
    );
    expect(axios.get).toHaveBeenCalledWith(
      "https://api.userfront.com/v0/auth/logout",
      {
        headers: {
          authorization: `Bearer ${accessTokenBeforeLogout}`,
        },
      }
    );
    expect(Userfront.tokens.accessToken).toEqual(undefined);
  });
});

describe("addInitCallback() method", () => {
  beforeAll(() => {
    // Using `window.location.assign` rather than `window.location.href =` because
    // JSDOM throws an error "Error: Not implemented: navigation (except hash changes)"
    // JSDOM complains about this is because JSDOM does not implement methods like window.alert, window.location.assign, etc.
    // https://stackoverflow.com/a/54477957
    delete window.location;
    window.location = {
      assign: jest.fn(),
      origin: "https://example.com",
      href: "https://example.com/login",
    };
  });

  it("should add callbacks that are fired when Userfront.init(tenantId) is called", () => {
    const tenantId = "a9b8c7d6";
    const callbackA = jest.fn();
    const callbackB = jest.fn();

    // Add callbacks
    Userfront.addInitCallback(callbackA);
    Userfront.addInitCallback(callbackB);

    // Call Userfront.init()
    Userfront.init(tenantId);

    // Assert that callbacks were called
    expect(callbackA).toHaveBeenCalled();
    expect(callbackA).toHaveBeenCalledWith({ tenantId });
    expect(callbackB).toHaveBeenCalled();
    expect(callbackB).toHaveBeenCalledWith({ tenantId });

    // Calling Userfront.init() again should not call the callbacks again
    jest.clearAllMocks();
    Userfront.init(tenantId);

    expect(callbackA).not.toHaveBeenCalled();
    expect(callbackB).not.toHaveBeenCalled();
  });
});
