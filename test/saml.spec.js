import Cookies from "js-cookie";
import Userfront from "../src/index.js";
import api from "../src/api.js";
import {
  createAccessToken,
  createIdToken,
  createRefreshToken,
  idTokenUserDefaults,
  mockWindow,
} from "./config/utils.js";
import {
  noMfaHeaders
} from "./config/assertions.js";
import { login } from "../src/login.js";
import { logout } from "../src/logout.js";
import { unsetTokens } from "../src/tokens.js";

jest.mock("../src/api.js");

const tenantId = "abcd9876";
const mockAccessToken = createAccessToken();
const mockIdToken = createIdToken();

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

mockWindow({
  origin: "https://example.com",
  href: "https://example.com/login",
});

describe("completeSamlLogin()", () => {
  beforeAll(() => {
    // Clear any mock
    api.get.mockReset();
  });

  beforeEach(() => {
    Cookies.set(`id.${tenantId}`, mockIdToken, {});
    Cookies.set(`access.${tenantId}`, mockAccessToken, {});
    Userfront.init(tenantId);
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
    expect(api.get).not.toHaveBeenCalled();
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
    api.post.mockImplementationOnce(() => mockResponse);
    const payload = {
      emailOrUsername: idTokenUserDefaults.email,
      password: "something",
    };
    const data = await login({
      method: "password",
      ...payload,
    });
    // Should have sent the proper API request
    expect(api.post).toHaveBeenCalledWith(`/auth/basic`, {
      tenantId,
      ...payload,
    }, noMfaHeaders);

    // Should have returned the proper value
    expect(data).toEqual(mockResponse.data);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(idTokenUserDefaults.email);
    expect(Userfront.tokens.accessToken).toEqual(
      mockResponse.data.tokens.access.value
    );

    // Create mock response for token request
    const mockTokenResponse = {
      data: { token: "foo-bar-1234" },
    };
    api.get.mockImplementationOnce(() => mockTokenResponse);

    // 2. Call login
    await login({ method: "saml" });

    // 3. Assert GET /auth/saml/idp/token request was made
    expect(console.warn).not.toHaveBeenCalled();
    expect(api.get).toHaveBeenCalledWith(`/auth/saml/idp/token`, {
      headers: {
        authorization: `Bearer ${Userfront.tokens.accessToken}`,
      },
    });

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
    api.get.mockImplementationOnce(() => Promise.reject(mockResponse));
    expect(login({ method: "saml" })).rejects.toEqual(
      new Error(mockResponse.response.data.message)
    );
  });
});

describe("logout({ method: 'saml' })", () => {
  beforeEach(() => {
    api.get.mockReset();
    Cookies.set(`id.${tenantId}`, mockIdToken, {});
    Cookies.set(`access.${tenantId}`, mockAccessToken, {});
    Userfront.init(tenantId);
  });

  afterEach(() => {
    window.location.assign.mockClear();
  });

  it(`should make request to token endpoint then redirect browser to SAML logout
      endpoint`, async () => {
    // Create mock response for token request
    const mockTokenResponse = {
      data: { token: "foo-bar-1234" },
    };
    api.get.mockImplementationOnce(() => mockTokenResponse);

    // Access token, ID token, and user should all exist before and after logging
    // out of service provider (should not log user out of tenant application, only
    // the service provider)
    expect(Cookies.get(`access.${tenantId}`)).toBeTruthy();
    expect(Cookies.get(`id.${tenantId}`)).toBeTruthy();
    expect(Userfront.tokens.accessToken).toBeTruthy();
    expect(Userfront.tokens.idToken).toBeTruthy();
    expect(Userfront.user.userId).toEqual(33);
    expect(Userfront.user.email).toEqual("johndoe@example.com");

    const accessToken = Userfront.tokens.accessToken;
    await logout({ method: "saml" });

    // Assert GET /auth/saml/idp/token request was made
    expect(api.get).toHaveBeenCalledWith(`/auth/saml/idp/token`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    // Assert client was redirected to /auth/saml/idp/logout with token
    expect(window.location.assign).toHaveBeenCalledWith(
      `${Userfront.store.baseUrl}auth/saml/idp/logout` +
        `?tenant_id=${tenantId}` +
        `&token=${mockTokenResponse.data.token}` +
        `&uuid=${Userfront.user.userUuid}`
    );

    // Should not have cleared the access and ID tokens
    expect(Cookies.get(`access.${tenantId}`)).toBeTruthy();
    expect(Cookies.get(`id.${tenantId}`)).toBeTruthy();
    expect(Userfront.tokens.accessToken).toBeTruthy();
    expect(Userfront.tokens.idToken).toBeTruthy();

    // Should not have cleared the user object
    expect(Userfront.user.userId).toBeTruthy();
    expect(Userfront.user.email).toBeTruthy();
    expect(Userfront.user.update).toBeTruthy();
  });

  it(`should return error to log in if store.tokens.accessToken isn't defined`, async () => {
    // Init without access token
    Cookies.set(`access.${tenantId}`, "", {});
    Cookies.set(`id.${tenantId}`, mockIdToken, {});
    Userfront.init(tenantId);
    expect(Userfront.tokens.idToken).toBeTruthy();
    expect(Userfront.user.userId).toEqual(33);
    expect(Userfront.user.email).toEqual("johndoe@example.com");

    // logout() should throw error
    try {
      await logout({ method: "saml" });
      expect("non-error").not.toBeDefined();
    } catch (error) {
      expect(error).toEqual(
        new Error("Please log in to authorize your logout request.")
      );
    }

    // Should not have made request to /auth/saml/idp/token or redirected the user
    expect(api.get).not.toHaveBeenCalled();
    expect(window.location.assign).not.toHaveBeenCalled();

    // Should not have modified ID token or user
    expect(Cookies.get(`id.${tenantId}`)).toBeTruthy();
    expect(Userfront.tokens.idToken).toBeTruthy();
    expect(Userfront.user.userId).toBeTruthy();
    expect(Userfront.user.email).toBeTruthy();
    expect(Userfront.user.update).toBeTruthy();
  });

  it(`error should respond with any error server sends`, async () => {
    // Mock the API response
    const mockResponse = {
      response: {
        status: 400,
        data: {
          error: "Bad Request",
          message: "Bad Request",
          statusCode: 400,
        },
      },
    };
    api.get.mockImplementationOnce(() => Promise.reject(mockResponse));

    // logout() should throw error
    try {
      await logout({ method: "saml" });
      expect("non-error").not.toBeDefined();
    } catch (error) {
      expect(error).toEqual(new Error(mockResponse.response.data.message));
    }

    // Access and ID tokens should not have been modified
    expect(Cookies.get(`access.${tenantId}`)).toBeTruthy();
    expect(Cookies.get(`id.${tenantId}`)).toBeTruthy();
    expect(Userfront.tokens.accessToken).toBeTruthy();
    expect(Userfront.tokens.idToken).toBeTruthy();

    // User should have not been modified
    expect(Userfront.user.userId).toBeTruthy();
    expect(Userfront.user.email).toBeTruthy();
  });
});
