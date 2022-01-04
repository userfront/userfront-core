import axios from "axios";
import Cookies from "js-cookie";

import Userfront from "../src/index.js";
import {
  createAccessToken,
  createIdToken,
  createRefreshToken,
  idTokenUserDefaults,
} from "./config/utils.js";
import { login } from "../src/signon.js";
import { store } from "../src/store.js";
import { unsetTokens } from "../src/tokens.js";

const tenantId = "abcd9876";

jest.mock("../src/refresh.js", () => {
  return {
    __esModule: true,
    exchange: jest.fn(),
  };
});
jest.mock("axios");
// Mock API response
const mockResponse = {
  data: {
    tokens: {
      access: { value: createAccessToken() },
      id: { value: createIdToken() },
      refresh: { value: createRefreshToken() },
    },
    nonce: "nonce-value",
    redirectTo: "/dashboard",
  },
};

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

describe("signon#completeSamlLogin", () => {
  beforeAll(() => {
    // Clear any mock
    axios.get.mockReset();
    Userfront.init(tenantId);
  });

  beforeEach(() => {
    const mockAccessToken = "mockAccessToken";
    Cookies.set(`access.${tenantId}`, mockAccessToken, {});
    store.tokens.accessToken = mockAccessToken;
  });

  afterEach(() => {
    window.location.assign.mockClear();
  });

  it(`should return warning if store.tokens.accessToken isn't defined`, async () => {
    unsetTokens();
    console.warn = jest.fn();

    expect(console.warn).not.toHaveBeenCalled();
    await login({ method: "saml" });
    expect(console.warn).toHaveBeenCalledWith(
      "Cannot complete SAML login without access token"
    );
    console.warn.mockClear();

    // Should not have made request to /auth/saml/idp/token or redirected the user
    expect(axios.get).not.toHaveBeenCalled();
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it(`should make request to token endpoint then redirect browser to SAML login
      endpoint`, async () => {
    /*
     Steps for test:
       1. Log user in for access token to be set in store
       2. Call `login({ method: 'saml' })`
       3. Assert GET /auth/saml/idp/token request was made
       4. Assert client is redirect to /auth/saml/idp/login with token from step 3
     */
    expect(Userfront.tokens.accessToken).toBeUndefined;

    // 1. Log user in
    axios.post.mockImplementationOnce(() => mockResponse);
    const payload = {
      emailOrUsername: idTokenUserDefaults.email,
      password: "something",
    };
    const res = await login({
      method: "password",
      ...payload,
    });
    // Should have sent the proper API request
    expect(axios.post).toHaveBeenCalledWith(
      `https://api.userfront.com/v0/auth/basic`,
      {
        tenantId,
        ...payload,
      }
    );

    // Should have returned the proper value
    expect(res).toEqual(mockResponse.data);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(idTokenUserDefaults.email);
    expect(Userfront.tokens.accessToken).toEqual(
      mockResponse.data.tokens.access.value
    );

    // Create mock response for token request
    const mockTokenResponse = {
      data: { token: "foo-bar-1234" },
    };
    axios.get.mockImplementationOnce(() => mockTokenResponse);

    // 2. Call login
    await login({ method: "saml" });

    // 3. Assert GET /auth/saml/idp/token request was made
    expect(console.warn).not.toHaveBeenCalled();
    expect(axios.get).toHaveBeenCalledWith(
      `${Userfront.store.baseUrl}auth/saml/idp/token`,
      {
        headers: {
          authorization: `Bearer ${store.tokens.accessToken}`,
        },
      }
    );

    // 4. Assert client was redirected to /auth/saml/idp/login with token from step 3
    expect(window.location.assign).toHaveBeenCalledWith(
      `${Userfront.store.baseUrl}auth/saml/idp/login` +
        `?tenant_id=${tenantId}` +
        `&token=${mockTokenResponse.data.token}` +
        `&uuid=${Userfront.user.userUuid}`
    );
  });

  it(`error should respond with whatever the server sends`, async () => {
    // Mock the API response
    const mockResponse = {
      response: {
        data: {
          error: "Unauthorized",
          message: "Unauthorized",
          statusCode: 401,
        },
      },
    };
    axios.get.mockImplementationOnce(() => Promise.reject(mockResponse));
    expect(login({ method: "saml" })).rejects.toEqual(
      new Error(mockResponse.response.data.message)
    );
  });
});
