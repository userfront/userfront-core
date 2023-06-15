import Userfront from "../src/index.js";
import api from "../src/api.js";
import { unsetUser } from "../src/user.js";
import {
  createAccessToken,
  createIdToken,
  createRefreshToken,
  idTokenUserDefaults,
  createMfaRequiredResponse,
  setMfaRequired,
} from "./config/utils.js";
import {
  assertAuthenticationDataMatches,
  mfaHeaders,
  noMfaHeaders,
  pkceParams,
} from "./config/assertions.js";
import { loginWithPasswordMigrate } from "../src/password.migrate.js";
import { defaultHandleRedirect } from "../src/url.js";
import { defaultHandleTokens } from "../src/tokens.js";
import * as Pkce from "../src/pkce.js";

jest.mock("../src/api.js");
jest.mock("../src/refresh.js");
jest.mock("../src/url.js");
jest.mock("../src/tokens.js");
jest.mock("../src/pkce.js");

const tenantId = "abcd9876";

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
    upstreamResponse: {
      arbitrary: "response",
    },
  },
};

// Mock "MFA required" response
const mockMfaRequiredResponse = createMfaRequiredResponse({
  firstFactor: {
    strategy: "password",
    channel: "email",
  },
  secondFactors: [
    {
      strategy: "totp",
      channel: "authenticator",
      isConfiguredByUser: false,
    },
  ],
});

// Mock "PKCE required" response
const mockPkceRequiredResponse = {
  data: {
    message: "PKCE required",
    authorizationCode: "auth-code",
    redirectTo: "my-app:/login",
  },
};

describe("loginWithPasswordMigrate()", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
    jest.resetAllMocks();
    unsetUser();
  });

  describe("with username & password", () => {
    it("should send a request, set access and ID cookies, and initiate nonce exchange", async () => {
      // Mock the API response
      api.post.mockImplementationOnce(() => mockResponse);

      // Call loginWithPasswordMigrate()
      const payload = {
        emailOrUsername: idTokenUserDefaults.email,
        password: "something",
      };
      const data = await loginWithPasswordMigrate(payload);

      // Should have sent the proper API request
      expect(api.post).toHaveBeenCalledWith(
        `/auth/password/migrate`,
        {
          tenantId,
          ...payload,
        },
        noMfaHeaders
      );

      // Should have returned the proper value
      expect(data).toEqual(mockResponse.data);

      // Should call defaultHandleTokens correctly
      expect(defaultHandleTokens).toHaveBeenCalledWith(data.tokens, data);

      // Should call defaultHandleRedirect correctly
      expect(defaultHandleRedirect).toHaveBeenCalledWith(data.redirectTo, data);
    });

    it("should call handleUpstreamResponse before redirecting", async () => {
      // Mock the API response
      api.post.mockImplementationOnce(() => mockResponse);

      // Add a handleUpstreamResponse method
      const handleUpstreamResponse = jest.fn();

      // Call loginWithPasswordMigrate()
      const payload = {
        emailOrUsername: idTokenUserDefaults.email,
        password: "something",
        handleUpstreamResponse,
      };
      const data = await loginWithPasswordMigrate(payload);

      // Should have sent the proper API request
      expect(api.post).toHaveBeenCalledWith(
        `/auth/password/migrate`,
        {
          tenantId,
          emailOrUsername: payload.emailOrUsername,
          password: payload.password,
        },
        noMfaHeaders
      );

      // Should have returned the proper value
      expect(data).toEqual(mockResponse.data);

      // Should call defaultHandleTokens correctly
      expect(defaultHandleTokens).toHaveBeenCalledWith(data.tokens, data);

      // Should call defaultHandleRedirect correctly
      expect(defaultHandleRedirect).toHaveBeenCalledWith(data.redirectTo, data);

      // Should have called handleUpstreamResponse with the upstreamResponse
      expect(handleUpstreamResponse).toHaveBeenCalledWith(
        mockResponse.data.upstreamResponse,
        mockResponse.data
      );
    });

    it("should login and not redirect if redirect = false", async () => {
      // Update the userId to ensure it is overwritten
      const newAttrs = {
        userId: 1009,
        email: "someone-else@example.com",
      };
      const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
      mockResponseCopy.data.tokens.id.value = createIdToken(newAttrs);

      // Mock the API response
      api.post.mockImplementationOnce(() => mockResponseCopy);

      // Call loginWithPasswordMigrate() with redirect = false
      const payload = {
        email: newAttrs.email,
        password: "something",
      };
      const data = await loginWithPasswordMigrate({
        redirect: false,
        ...payload,
      });

      // Should have sent the proper API request
      expect(api.post).toHaveBeenCalledWith(
        `/auth/password/migrate`,
        {
          tenantId,
          emailOrUsername: payload.email,
          password: payload.password,
        },
        noMfaHeaders
      );

      // Should have returned the proper value
      expect(data).toEqual(mockResponseCopy.data);

      // Should call defaultHandleTokens correctly
      expect(defaultHandleTokens).toHaveBeenCalledWith(data.tokens, data);

      // Should not call defaultHandleRedirect
      expect(defaultHandleRedirect).not.toHaveBeenCalled();
    });

    it("should login and redirect to a provided path", async () => {
      api.post.mockImplementationOnce(() => mockResponse);

      // Call loginWithPasswordMigrate() with redirect = false
      const payload = {
        emailOrUsername: idTokenUserDefaults.email,
        password: "something",
      };
      const redirect = "/path";
      const data = await loginWithPasswordMigrate({
        redirect,
        ...payload,
      });

      // Should have sent the proper API request
      expect(api.post).toHaveBeenCalledWith(
        `/auth/password/migrate`,
        {
          tenantId,
          ...payload,
        },
        noMfaHeaders
      );

      // Should have returned the proper value
      expect(data).toEqual(mockResponse.data);

      // Should call defaultHandleTokens correctly
      expect(defaultHandleTokens).toHaveBeenCalledWith(data.tokens, data);

      // Should call defaultHandleRedirect correctly
      expect(defaultHandleRedirect).toHaveBeenCalledWith(redirect, data);
    });

    it("should set the noResetEmail option if provided", async () => {
      // Mock the API response
      api.post.mockImplementationOnce(() => mockResponse);

      // Call loginWithPasswordMigrate()
      const payload = {
        emailOrUsername: idTokenUserDefaults.email,
        password: "something",
        options: {
          noResetEmail: true,
        },
      };
      await loginWithPasswordMigrate(payload);

      // Should have sent the proper API request
      expect(api.post).toHaveBeenCalledWith(
        `/auth/password/migrate`,
        {
          tenantId,
          ...payload,
          options: {
            noResetEmail: true,
          },
        },
        noMfaHeaders
      );
    });

    it("should respond with whatever error the server sends", async () => {
      // Mock the API response
      const mockResponse = {
        response: {
          data: {
            error: "Bad Request",
            message: `That's a dumb email address.`,
            statusCode: 400,
          },
        },
      };
      api.post.mockImplementationOnce(() => Promise.reject(mockResponse));
      expect(
        loginWithPasswordMigrate({
          email: "valid@example.com",
          password: "somevalidpassword",
        })
      ).rejects.toEqual(new Error(mockResponse.response.data.message));
    });

    it("should handle an MFA Required response", async () => {
      // Return an MFA Required response
      api.post.mockImplementationOnce(() => mockMfaRequiredResponse);

      const payload = {
        email: "email@example.com",
        password: "something",
      };
      const data = await loginWithPasswordMigrate(payload);

      // Should have sent the correct API request
      expect(api.post).toHaveBeenCalledWith(
        `/auth/password/migrate`,
        {
          tenantId,
          emailOrUsername: payload.email,
          password: payload.password,
        },
        noMfaHeaders
      );

      // Should have updated the MFA service state
      assertAuthenticationDataMatches(mockMfaRequiredResponse);

      // Should not have set the user object or redirected
      expect(defaultHandleTokens).not.toHaveBeenCalled();
      expect(defaultHandleRedirect).not.toHaveBeenCalled();

      // Should have returned MFA options & firstFactorToken
      expect(data).toEqual(mockMfaRequiredResponse.data);
    });

    it("should include the firstFactorToken if this is the second factor", async () => {
      // Set up the MFA service
      setMfaRequired();
      api.post.mockImplementationOnce(() => mockResponse);
      const payload = {
        email: "email@example.com",
        password: "something",
      };
      await loginWithPasswordMigrate(payload);

      // Should have sent the correct API request, with MFA headers
      expect(api.post).toHaveBeenCalledWith(
        `/auth/password/migrate`,
        {
          tenantId,
          emailOrUsername: payload.email,
          password: payload.password,
        },
        mfaHeaders
      );
    });

    describe("with PKCE", () => {
      it("login: should send a PKCE request if PKCE is required", async () => {
        Pkce.getPkceRequestQueryParams.mockImplementationOnce(() => ({
          code_challenge: "code",
        }));
        // Mock the API response
        api.post.mockImplementationOnce(() => mockResponse);

        // Call loginWithPasswordMigrate()
        const payload = {
          emailOrUsername: idTokenUserDefaults.email,
          password: "something",
        };
        await loginWithPasswordMigrate(payload);

        // Should have sent the proper API request
        expect(api.post).toHaveBeenCalledWith(
          `/auth/password/migrate`,
          {
            tenantId,
            ...payload,
          },
          pkceParams("code")
        );
      });

      it("login: should handle a PKCE Required response", async () => {
        Pkce.getPkceRequestQueryParams.mockImplementationOnce(() => ({
          code_challenge: "code",
        }));
        api.post.mockImplementationOnce(() => mockPkceRequiredResponse);
        // Call loginWithPasswordMigrate()
        const payload = {
          emailOrUsername: idTokenUserDefaults.email,
          password: "something",
        };
        const data = await loginWithPasswordMigrate(payload);

        // Should have sent the proper API request
        expect(api.post).toHaveBeenCalledWith(
          `/auth/password/migrate`,
          {
            tenantId,
            ...payload,
          },
          pkceParams("code")
        );

        // Should have requested PKCE redirect with the correct params
        expect(Pkce.defaultHandlePkceRequired).toHaveBeenCalledWith(
          data.authorizationCode,
          data.redirectTo,
          data
        );
      });
    });
  });
});
