import axios from "axios";

import Userfront from "../src/index.js";
import {
  createAccessToken,
  createIdToken,
  createRefreshToken,
  idTokenUserDefaults,
  mockWindow,
} from "./config/utils.js";
import { loginWithPassword } from "../src/password.js";
import { exchange } from "../src/refresh.js";

jest.mock("../src/refresh.js", () => {
  return {
    __esModule: true,
    exchange: jest.fn(),
  };
});
jest.mock("../src/totp.js");
jest.mock("axios");

const tenantId = "abcd9876";
const customBaseUrl = "https://pass.word.example.com/password/";

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

describe("loginWithPassword()", () => {
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

      // Call loginWithPassword()
      const payload = {
        emailOrUsername: idTokenUserDefaults.email,
        password: "something",
      };
      const data = await loginWithPassword(payload);

      // Should have sent the proper API request
      expect(axios.post).toHaveBeenCalledWith(
        `https://api.userfront.com/v0/auth/basic`,
        {
          tenantId,
          ...payload,
        }
      );

      // Should have returned the proper value
      expect(data).toEqual(mockResponse.data);

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

      // Call loginWithPassword()
      const payload = {
        emailOrUsername: idTokenUserDefaults.email,
        password: "something",
      };
      const data = await loginWithPassword(payload);

      // Should have sent the proper API request
      expect(axios.post).toHaveBeenCalledWith(`${customBaseUrl}auth/basic`, {
        tenantId,
        ...payload,
      });

      // Should have returned the proper value
      expect(data).toEqual(mockResponse.data);
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

      // Call loginWithPassword() with redirect = false
      const payload = {
        email: newUserAttrs.email,
        password: "something",
      };
      const data = await loginWithPassword({
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
      expect(data).toEqual(mockResponseCopy.data);

      // Should have set the user object
      expect(Userfront.user.email).toEqual(payload.email);
      expect(Userfront.user.userId).toEqual(newUserAttrs.userId);

      // Should have redirected correctly
      expect(window.location.assign).not.toHaveBeenCalled();
    });

    it("should login and redirect to a provided path", async () => {
      axios.post.mockImplementationOnce(() => mockResponse);

      // Call loginWithPassword() with redirect = false
      const payload = {
        emailOrUsername: idTokenUserDefaults.email,
        password: "something",
      };
      await loginWithPassword({
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
        loginWithPassword({
          email: "valid@example.com",
          password: "somevalidpassword",
        })
      ).rejects.toEqual(new Error(mockResponse.response.data.message));
    });
  });
});
