import axios from "axios";

import Userfront from "../src/index.js";
import {
  createAccessToken,
  createIdToken,
  createRefreshToken,
  idTokenUserDefaults,
} from "./config/utils.js";
import { login } from "../src/login.js";
import { exchange } from "../src/refresh.js";

jest.mock("../src/refresh.js", () => {
  return {
    __esModule: true,
    exchange: jest.fn(),
  };
});
jest.mock("axios");

const tenantId = "abcd9876";
const customBaseUrl = "https://custom.example.com/api/v1/";
const firstFactorCode = "204a8def-651c-4ab2-9ca0-1e3fca9e280a";
const verificationCode = "123456";

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

describe("login", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
  });

  afterEach(() => {
    window.location.assign.mockClear();
  });

  describe("with username & password", () => {
    it("should send a request, set access and ID cookies, and initiate nonce exchange", async () => {
      // Mock the API response
      axios.post.mockImplementationOnce(() => mockResponse);

      // Call login()
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

      // Should have called exchange() with the API's response
      expect(exchange).toHaveBeenCalledWith(mockResponse.data);

      // Should have set the user object
      expect(Userfront.user.email).toEqual(payload.emailOrUsername);
      expect(Userfront.user.userId).toEqual(idTokenUserDefaults.userId);

      // Should have redirected correctly
      expect(window.location.assign).toHaveBeenCalledWith(
        mockResponse.data.redirectTo
      );
    });

    it("should send a login request using custom baseUrl if defined", async () => {
      Userfront.init(tenantId, {
        baseUrl: customBaseUrl,
      });

      // Mock the API response
      axios.post.mockImplementationOnce(() => mockResponse);

      // Call login()
      const payload = {
        emailOrUsername: idTokenUserDefaults.email,
        password: "something",
      };
      const res = await login({
        method: "password",
        ...payload,
      });

      // Should have sent the proper API request
      expect(axios.post).toHaveBeenCalledWith(`${customBaseUrl}auth/basic`, {
        tenantId,
        ...payload,
      });

      // Should have returned the proper value
      expect(res).toEqual(mockResponse.data);
    });

    it("should login and not redirect if redirect = false", async () => {
      // Update the userId to ensure it is overwritten
      const newUserAttrs = {
        userId: 1009,
        email: "someone-else@example.com",
      };
      const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
      mockResponseCopy.data.tokens.id.value = createIdToken(newUserAttrs);

      // Mock the API response
      axios.post.mockImplementationOnce(() => mockResponseCopy);

      // Call login() with redirect = false
      const payload = {
        email: newUserAttrs.email,
        password: "something",
      };
      const res = await login({
        method: "password",
        redirect: false,
        ...payload,
      });

      // Should have sent the proper API request
      expect(axios.post).toHaveBeenCalledWith(
        `https://api.userfront.com/v0/auth/basic`,
        {
          tenantId,
          emailOrUsername: payload.email,
          password: payload.password,
        }
      );

      // Should have called exchange() with the API's response
      expect(exchange).toHaveBeenCalledWith(mockResponseCopy.data);

      // Should have returned the proper value
      expect(res).toEqual(mockResponseCopy.data);

      // Should have set the user object
      expect(Userfront.user.email).toEqual(payload.email);
      expect(Userfront.user.userId).toEqual(newUserAttrs.userId);

      // Should have redirected correctly
      expect(window.location.assign).not.toHaveBeenCalled();
    });

    it("should login and redirect to a provided path", async () => {
      axios.post.mockImplementationOnce(() => mockResponse);

      // Call login() with redirect = false
      const payload = {
        emailOrUsername: idTokenUserDefaults.email,
        password: "something",
      };
      await login({
        method: "password",
        redirect: false,
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

      // Should have called exchange() with the API's response
      expect(exchange).toHaveBeenCalledWith(mockResponse.data);

      // Should have set the user object
      expect(Userfront.user.email).toEqual(payload.emailOrUsername);
      expect(Userfront.user.userId).toEqual(idTokenUserDefaults.userId);

      // Should have redirected correctly
      expect(window.location.assign).not.toHaveBeenCalled();
    });

    it("should return MFA options if tenant requires MFA", async () => {
      exchange.mockClear();

      const mockMfaOptionsResponse = {
        data: {
          mode: "live",
          allowedStrategies: ["verificationCode"],
          allowedChannels: ["sms"],
          firstFactorCode: "204a8def-651c-4ab2-9ca0-1e3fca9e280a",
        },
      };

      axios.post.mockImplementationOnce(() => mockMfaOptionsResponse);

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

      // Should not have set the user object, called exchange, or redirected
      expect(Userfront.user).toBeUndefined;
      expect(exchange).not.toHaveBeenCalled();
      expect(window.location.assign).not.toHaveBeenCalled();

      // Should have returned MFA options & firstFactorCode
      expect(res).toEqual(mockMfaOptionsResponse.data);
    });

    it("password method error should respond with whatever error the server sends", async () => {
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
      axios.post.mockImplementationOnce(() => Promise.reject(mockResponse));
      expect(
        login({
          method: "password",
          email: "valid@example.com",
          password: "somevalidpassword",
        })
      ).rejects.toEqual(new Error(mockResponse.response.data.message));
    });

    it("link method error should respond with whatever error the server sends", async () => {
      // Mock the API response
      const mockResponse = {
        response: {
          data: {
            error: "Bad Request",
            message: `That's a silly uuid.`,
            statusCode: 400,
          },
        },
      };
      axios.put.mockImplementationOnce(() => Promise.reject(mockResponse));
      expect(
        login({
          method: "link",
          uuid: "uuid",
          token: "token",
        })
      ).rejects.toEqual(new Error(mockResponse.response.data.message));
    });
  });

  describe("with an SSO provider", () => {
    const provider = "google";
    const loginUrl = `https://api.userfront.com/v0/auth/${provider}/login?tenant_id=${tenantId}&origin=${window.location.origin}`;

    it("should throw if missing `method`", () => {
      expect(login()).rejects.toEqual(
        new Error(`Userfront.login called without "method" property.`)
      );
      expect(window.location.assign).not.toHaveBeenCalled();
    });

    it("should get provider link and redirect", () => {
      login({ method: provider });

      // Assert getProviderLink was called and user is redirected
      expect(window.location.assign).toHaveBeenCalledTimes(1);
      expect(window.location.assign).toHaveBeenCalledWith(loginUrl);
    });

    it("should get provider link and redirect using custom baseUrl", () => {
      Userfront.init(tenantId, {
        baseUrl: customBaseUrl,
      });

      const loginUrl = `${customBaseUrl}auth/${provider}/login?tenant_id=${tenantId}&origin=${window.location.origin}`;

      login({ method: provider });

      // Assert getProviderLink was called and user is redirected
      expect(window.location.assign).toHaveBeenCalledTimes(1);
      expect(window.location.assign).toHaveBeenCalledWith(loginUrl);
    });
  });

  describe("with passwordless", () => {
    it("should send a request and respond with OK", async () => {
      // Mock the API response
      const mockResponse = {
        data: {
          message: "OK",
          result: {
            to: "link-registered@example.com",
            whatever: "else",
          },
        },
      };
      axios.post.mockImplementationOnce(() => mockResponse);

      // Call login()
      const payload = {
        email: mockResponse.data.result.to,
      };
      const res = await login({
        method: "passwordless",
        ...payload,
      });

      // Should have sent the proper API request
      expect(axios.post).toHaveBeenCalledWith(
        `https://api.userfront.com/v0/auth/link`,
        {
          tenantId,
          ...payload,
        }
      );

      // Should have returned the response exactly
      expect(res).toEqual(mockResponse.data);
    });

    it("should send a request and respond with OK using custom baseUrl", async () => {
      Userfront.init(tenantId, {
        baseUrl: customBaseUrl,
      });

      // Mock the API response
      const mockResponse = {
        data: {
          message: "OK",
          result: {
            to: "link-registered@example.com",
            whatever: "else",
          },
        },
      };
      axios.post.mockImplementationOnce(() => mockResponse);

      // Call login()
      const payload = {
        email: mockResponse.data.result.to,
      };
      const res = await login({
        method: "passwordless",
        ...payload,
      });

      // Should have sent the proper API request
      expect(axios.post).toHaveBeenCalledWith(`${customBaseUrl}auth/link`, {
        tenantId,
        ...payload,
      });

      // Should have returned the response exactly
      expect(res).toEqual(mockResponse.data);
    });

    it("should respond with whatever error the server sends", async () => {
      // Mock the API response
      const mockResponseErr = {
        response: {
          data: {
            error: "Bad Request",
            message: `That's a dumb email address.`,
            statusCode: 400,
          },
        },
      };
      axios.post.mockImplementationOnce(() => Promise.reject(mockResponseErr));
      expect(
        login({
          method: "passwordless",
          email: "valid@example.com",
        })
      ).rejects.toEqual(new Error(mockResponseErr.response.data.message));
    });
  });

  describe("with MFA verification code", () => {
    it("should respond with tokens", async () => {
      // Mock the API response
      axios.put.mockImplementationOnce(() => mockResponse);

      const payload = {
        firstFactorCode,
        verificationCode,
      };

      const res = await login({
        method: "mfa",
        redirect: false,
        ...payload,
      });

      // Should have sent the proper API request
      expect(axios.put).toHaveBeenCalledWith(
        `https://api.userfront.com/v0/auth/mfa`,
        {
          tenantId,
          ...payload,
        }
      );

      // Should have returned expected response
      expect(res).toEqual(mockResponse.data);
    });

    it("should redirect to correct path", async () => {
      // Mock the API response
      axios.put.mockImplementationOnce(() => mockResponse);

      await login({
        method: "mfa",
        firstFactorCode,
        verificationCode,
        redirect: "/custom",
      });

      // Client should be redirected
      expect(window.location.assign).toHaveBeenCalledTimes(1);
      expect(window.location.assign).toHaveBeenCalledWith("/custom");
    });

    it("should respond with whatever error the server sends", async () => {
      // Mock the API response
      const mockResponseErr = {
        response: {
          data: {
            error: "Bad Request",
            message: "Phone number must be in E.164 format.",
            statusCode: 400,
          },
        },
      };

      axios.put.mockImplementationOnce(() => Promise.reject(mockResponseErr));

      expect(
        login({
          method: "mfa",
          firstFactorCode,
          verificationCode,
        })
      ).rejects.toEqual(new Error(mockResponseErr.response.data.message));
    });
  });
});
