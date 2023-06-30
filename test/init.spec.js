import axios from "axios";
import {
  createAccessToken,
  createIdToken,
  resetStore,
  mockWindow,
} from "./config/utils.js";
import { noMfaHeaders } from "./config/assertions.js";
import Userfront from "../src/index.js";
import { setMode } from "../src/mode.js";
import { store } from "../src/store.js";
import { apiUrl } from "../src/constants.js";

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

  it("should include the x-application-id and x-origin headers for mode", async () => {
    store.mode = "test";
    Userfront.init(tenantId, { domain });

    axios.get.mockResolvedValue({
      status: 200,
      data: {
        mode: "live",
        authentication: {
          firstFactors: [],
          secondFactors: [],
        },
      },
    });
    await setMode();

    const url = `https://${domain}`;

    expect(axios.defaults.headers.common["x-application-id"]).toEqual(url);
    expect(axios.defaults.headers.common["x-origin"]).toEqual(url);
    expect(axios.get).toHaveBeenCalledWith(
      `https://api.userfront.com/v0/tenants/${tenantId}/mode`,
      undefined
    );
    expect(store.mode).toEqual("live");
  });

  it("should include the x-application-id and x-origin headers for signup", async () => {
    Userfront.init(tenantId, { domain });

    const email = "user@example.com";
    const password = "foobar";

    await Userfront.signup({ method: "password", email, password });

    const url = `https://${domain}`;

    expect(axios.defaults.headers.common["x-application-id"]).toEqual(url);
    expect(axios.defaults.headers.common["x-origin"]).toEqual(url);
    expect(axios.post).toHaveBeenCalledWith(
      "https://api.userfront.com/v0/auth/create",
      {
        email,
        password,
        username: undefined,
        name: undefined,
        data: undefined,
        tenantId,
      },
      noMfaHeaders
    );
  });

  it("should include the x-application-id and x-origin headers for login", async () => {
    Userfront.init(tenantId, { domain });

    const email = "user@example.com";
    const password = "foobar";

    await Userfront.login({ method: "password", email, password });

    const url = `https://${domain}`;

    expect(axios.defaults.headers.common["x-application-id"]).toEqual(url);
    expect(axios.defaults.headers.common["x-origin"]).toEqual(url);

    expect(axios.post).toHaveBeenCalledWith(
      "https://api.userfront.com/v0/auth/basic",
      {
        emailOrUsername: email,
        password,
        tenantId,
      },
      noMfaHeaders
    );
  });

  it("should include the x-application-id and x-origin headers for logout", async () => {
    Userfront.init(tenantId, { domain });

    axios.get.mockResolvedValue({
      status: 200,
      data: {
        message: "ok",
      },
    });

    const accessTokenBeforeLogout = Userfront.tokens.accessToken;

    await Userfront.logout();

    const url = `https://${domain}`;

    expect(axios.defaults.headers.common["x-application-id"]).toEqual(url);
    expect(axios.defaults.headers.common["x-origin"]).toEqual(url);
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

describe("init() method with baseUrl option", () => {
  it("should add baseUrl to store when provided", async () => {
    const baseUrl = "https://custom.example.com/api/v1/";

    Userfront.init(tenantId, { baseUrl });

    expect(store.baseUrl).toEqual(baseUrl);
  });

  it("should default baseUrl to 'https://api.userfront.com/v0' if empty or not provided", async () => {
    // Modify baseUrl to be sure it's changed again in `init`
    store.baseUrl = "https://example.com";
    Userfront.init(tenantId, { baseUrl: "" });
    expect(store.baseUrl).toEqual(apiUrl);

    store.baseUrl = "https://example.com";
    Userfront.init(tenantId);
    expect(store.baseUrl).toEqual(apiUrl);
  });

  it("should support a baseUrl with trailing slash", async () => {
    const customBaseUrl = "https://custom.example.com/";

    Userfront.init(tenantId, {
      baseUrl: customBaseUrl,
    });
    expect(store.baseUrl).toEqual(customBaseUrl);

    store.tokens.accessToken = "foobar";
    await Userfront.logout();

    expect(axios.get).toHaveBeenCalledWith(`${customBaseUrl}auth/logout`, {
      headers: {
        authorization: `Bearer foobar`,
      },
    });
  });

  it("should support a baseUrl without trailing slash", async () => {
    const customBaseUrl = "https://custom.example.com";

    Userfront.init(tenantId, {
      baseUrl: customBaseUrl,
    });
    // Check trailing slash was appended
    expect(store.baseUrl).toEqual(customBaseUrl + "/");

    store.tokens.accessToken = "foobar";
    await Userfront.logout();

    // Check trailing slash is included when used in request
    expect(axios.get).toHaveBeenCalledWith(`${customBaseUrl}/auth/logout`, {
      headers: {
        authorization: `Bearer foobar`,
      },
    });
  });
});

describe("addInitCallback() method", () => {
  beforeAll(() => {
    mockWindow({
      origin: "https://example.com",
      href: "https://example.com/login",
    });
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
