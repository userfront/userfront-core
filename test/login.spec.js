import axios from "axios";

import Userfront from "../src/index.js";
import {
  createAccessToken,
  createIdToken,
  createRefreshToken,
  mockWindow,
} from "./config/utils.js";
import { login } from "../src/login.js";
import { loginWithPassword } from "../src/password.js";
import { loginWithTotp } from "../src/totp.js";
import { signonWithSso } from "../src/sso.js";

jest.mock("../src/refresh.js", () => {
  return {
    __esModule: true,
    exchange: jest.fn(),
  };
});
jest.mock("../src/password.js");
jest.mock("../src/sso.js");
jest.mock("../src/totp.js");
jest.mock("axios");

const tenantId = "abcd9876";
const customBaseUrl = "https://custom.example.com/api/v1/";
const firstFactorCode = "204a8def-651c-4ab2-9ca0-1e3fca9e280a";
const verificationCode = "123456";

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

describe("login", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
  });

  afterEach(() => {
    window.location.assign.mockClear();
  });

  it(`should throw if missing "method" argument`, () => {
    expect(login()).rejects.toEqual(
      new Error(`Userfront.login called without "method" property.`)
    );
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  describe(`{ method: "password" }`, () => {
    it(`should call loginWithPassword()`, () => {
      const email = "user@example.com";
      const password = "some-password123";
      const combos = [
        { email, password },
        { username: "user-name", password },
        { emailOrUsername: email, password },
        { email, password, redirect: "/custom" },
        { email, password, redirect: false },
      ];

      // Test login for each combo
      combos.forEach((combo) => {
        // Call login for the combo
        Userfront.login({ method: "password", ...combo });

        // Assert that loginWithPassword was called correctly
        expect(loginWithPassword).toHaveBeenCalledWith(combo);
      });
    });
  });

  describe(`{ method: "google" } and other SSO providers`, () => {
    it(`should call signonWithSso()`, () => {
      const combos = [
        { method: "apple" },
        { method: "azure" },
        { method: "facebook" },
        { method: "github" },
        { method: "google", redirect: "/after-google" },
        { method: "linkedin", redirect: false },
      ];

      // Test login for each provider
      combos.forEach((combo) => {
        // Call login for the combo
        Userfront.login(combo);

        // Assert that loginWithPassword was called correctly
        expect(signonWithSso).toHaveBeenCalledWith({
          provider: combo.method,
          redirect: combo.redirect,
        });
      });
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

  describe(`{ method: "totp" }`, () => {
    const codeAttrs = [{ totpCode: "991234" }, { backupCode: "11111-aaaaa" }];
    const identifierAttrs = [
      { userId: 222 },
      { userUuid: "326381e1-30b8-4280-93b6-ea27b2078966" },
      { emailOrUsername: "myusername" },
      { email: "user@example.com" },
      { username: "ausername" },
      { phoneNumber: "+15558675309" },
    ];
    // Loop over all input combos and ensure that loginWithTotp is called correctly for each
    codeAttrs.map((codeAttr) => {
      identifierAttrs.map((identifierAttr) => {
        it(`should call loginWithTotp with ${codeAttr} and ${identifierAttr}`, () => {
          // Call login for the combo
          Userfront.login({ method: "totp", ...codeAttr, ...identifierAttr });

          // Assert that loginWithTotp was called correctly
          expect(loginWithTotp).toHaveBeenCalledWith({
            ...codeAttr,
            ...identifierAttr,
          });
        });
      });
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
