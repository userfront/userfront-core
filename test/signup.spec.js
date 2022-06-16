import axios from "axios";

import Userfront from "../src/index.js";
import {
  createAccessToken,
  createIdToken,
  createRefreshToken,
  idTokenUserDefaults,
  mockWindow,
} from "./config/utils.js";
import { signup } from "../src/signup.js";
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

mockWindow({
  origin: "https://example.com",
  href: "https://example.com/login",
});

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

describe("signup", () => {
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

      // Call signup()
      const payload = {
        email: idTokenUserDefaults.email,
        name: idTokenUserDefaults.name,
        data: idTokenUserDefaults.data,
        password: "something",
      };
      const res = await signup({
        method: "password",
        ...payload,
      });

      // Should have sent the proper API request
      expect(axios.post).toHaveBeenCalledWith(
        `https://api.userfront.com/v0/auth/create`,
        {
          tenantId,
          username: undefined,
          ...payload,
        }
      );

      // Should have called exchange() with the API's response
      expect(exchange).toHaveBeenCalledWith(mockResponse.data);

      // Should have returned the proper value
      expect(res).toEqual(mockResponse.data);

      // Should have set the user object
      expect(Userfront.user.email).toEqual(payload.email);
      expect(Userfront.user.userId).toEqual(idTokenUserDefaults.userId);

      // Should have redirected correctly
      expect(window.location.assign).toHaveBeenCalledWith(
        mockResponse.data.redirectTo
      );
    });

    it("should sign up and not redirect if redirect = false", async () => {
      // Update the userId to ensure it is overwritten
      const newUserAttrs = {
        userId: 891,
        email: "another@example.com",
      };
      const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
      mockResponseCopy.data.tokens.id.value = createIdToken(newUserAttrs);

      // Mock the API response
      axios.post.mockImplementationOnce(() => mockResponseCopy);

      // Call signup() with redirect = false
      const payload = {
        email: newUserAttrs.email,
        password: "something",
      };
      await signup({
        method: "password",
        redirect: false,
        ...payload,
      });

      // Should have sent the proper API request
      expect(axios.post).toHaveBeenCalledWith(
        `https://api.userfront.com/v0/auth/create`,
        {
          tenantId,
          username: undefined,
          ...payload,
        }
      );

      // Should have called exchange() with the API's response
      expect(exchange).toHaveBeenCalledWith(mockResponse.data);

      // Should have set the user object
      expect(Userfront.user.email).toEqual(payload.email);
      expect(Userfront.user.userId).toEqual(newUserAttrs.userId);

      // Should not have redirected
      expect(window.location.assign).not.toHaveBeenCalled();
    });

    it("should sign up and redirect to provided path", async () => {
      // Mock the API response
      axios.post.mockImplementationOnce(() => mockResponse);

      // Call signup() with redirect = false
      const payload = {
        email: idTokenUserDefaults.email,
        password: "something",
      };
      await signup({
        method: "password",
        redirect: "/custom",
        ...payload,
      });

      // Should have sent the proper API request
      expect(axios.post).toHaveBeenCalledWith(
        `https://api.userfront.com/v0/auth/create`,
        {
          tenantId,
          username: undefined,
          ...payload,
        }
      );

      // Should have called exchange() with the API's response
      expect(exchange).toHaveBeenCalledWith(mockResponse.data);

      // Should have set the user object
      expect(Userfront.user.email).toEqual(payload.email);
      expect(Userfront.user.userId).toEqual(idTokenUserDefaults.userId);

      // Should have redirected
      expect(window.location.assign).toHaveBeenCalledWith(`/custom`);
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
      axios.post.mockImplementationOnce(() => Promise.reject(mockResponse));
      expect(
        signup({
          method: "password",
          email: "valid@example.com",
          password: "somevalidpassword",
        })
      ).rejects.toEqual(new Error(mockResponse.response.data.message));
    });

    it("should sign up using custom baseUrl if defined", async () => {
      Userfront.init(tenantId, {
        baseUrl: customBaseUrl,
      });

      // Mock the API response
      axios.post.mockImplementationOnce(() => mockResponse);

      // Call signup()
      const payload = {
        email: idTokenUserDefaults.email,
        name: idTokenUserDefaults.name,
        data: idTokenUserDefaults.data,
        password: "something",
      };
      await signup({
        method: "password",
        ...payload,
      });

      // Should have sent the proper API request
      expect(axios.post).toHaveBeenCalledWith(`${customBaseUrl}auth/create`, {
        tenantId,
        username: undefined,
        ...payload,
      });
    });
  });

  describe("with an SSO provider", () => {
    const provider = "github";
    const loginUrl = `https://api.userfront.com/v0/auth/${provider}/login?tenant_id=${tenantId}&origin=${window.location.origin}`;

    it("should throw if provider is missing", () => {
      expect(signup()).rejects.toEqual(
        new Error(`Userfront.signup called without "method" property.`)
      );
      expect(window.location.assign).not.toHaveBeenCalled();
    });

    it("should throw if provider is not supported", () => {
      expect(signup({ method: "foobar" })).rejects.toEqual(
        new Error(`Userfront.signup called with invalid "method" property.`)
      );
      expect(window.location.assign).not.toHaveBeenCalled();
    });

    it("should get provider link and redirect", () => {
      signup({ method: provider });

      // Assert getProviderLink was called and user is redirected
      expect(window.location.assign).toHaveBeenCalledTimes(1);
      expect(window.location.assign).toHaveBeenCalledWith(loginUrl);
    });

    it("should use custom baseUrl if defined", () => {
      Userfront.init(tenantId, {
        baseUrl: customBaseUrl,
      });

      const loginUrl =
        `${customBaseUrl}auth/${provider}/login` +
        `?tenant_id=${tenantId}&origin=${window.location.origin}`;

      signup({ method: provider });

      // Assert getProviderLink was called and user is redirected
      expect(window.location.assign).toHaveBeenCalledTimes(1);
      expect(window.location.assign).toHaveBeenCalledWith(loginUrl);
    });

    it("should return to current path if redirect = false", async () => {
      // Navigate to /signup
      window.history.pushState({}, "", "/signup");

      Userfront.signup({ method: "google", redirect: false });

      expect(window.location.assign).toHaveBeenCalledTimes(1);
      expect(window.location.assign).toHaveBeenCalledWith(
        `https://api.userfront.com/v0/auth/google/login?` +
          `tenant_id=${tenantId}&` +
          `origin=${window.location.origin}&` +
          `redirect=${encodeURIComponent("/signup")}`
      );
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

      // Call signup()
      const payload = {
        email: mockResponse.data.result.to,
        name: idTokenUserDefaults.name,
        username: idTokenUserDefaults.username,
        data: idTokenUserDefaults.data,
      };
      const res = await signup({
        method: "passwordless",
        ...payload,
      });

      // Should have sent the proper API request
      expect(axios.post).toHaveBeenCalledWith(
        `https://api.userfront.com/v0/auth/link`,
        {
          tenantId,
          options: undefined,
          ...payload,
        }
      );

      // Should have returned the response exactly
      expect(res).toEqual(mockResponse.data);
    });

    it("should send a request using custom baseUrl if defined", async () => {
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

      // Call signup()
      const payload = {
        email: mockResponse.data.result.to,
        name: idTokenUserDefaults.name,
        username: idTokenUserDefaults.username,
        data: idTokenUserDefaults.data,
      };
      const res = await signup({
        method: "passwordless",
        ...payload,
      });

      // Should have sent the proper API request
      expect(axios.post).toHaveBeenCalledWith(`${customBaseUrl}auth/link`, {
        tenantId,
        options: undefined,
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
        signup({
          method: "passwordless",
          email: "valid@example.com",
        })
      ).rejects.toEqual(new Error(mockResponseErr.response.data.message));
    });
  });
});
