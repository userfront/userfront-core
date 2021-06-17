import axios from "axios";
import Userfront from "../src/index.js";
import {
  signup,
  login,
  sendLoginLink,
  sendResetLink,
  resetPassword,
} from "../src/signon.js";
import { exchange } from "../src/refresh.js";

jest.mock("../src/refresh.js", () => {
  return {
    __esModule: true,
    exchange: jest.fn(),
  };
});
jest.mock("axios");

const tenantId = "abcd9876";
Userfront.init(tenantId);

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

describe("signup", () => {
  afterEach(() => {
    window.location.assign.mockClear();
  });
  describe("with username & password", () => {
    it("should send a request, set access and ID cookies, and initiate nonce exchange", async () => {
      // Mock the API response
      const mockResponse = {
        data: {
          tokens: {
            id: { value: "id-token-value" },
            access: { value: "access-token-value" },
            refresh: { value: "refresh-token-value" },
          },
          nonce: "nonce-value",
          redirectTo: "/path",
        },
      };
      axios.post.mockImplementationOnce(() => mockResponse);

      // Call signup()
      const payload = {
        email: "someone@example.com",
        name: "Someone",
        password: "something",
        data: {
          some: "custom",
          camelCase: Math.random(),
          Underscore_Case: {
            capitalized: true,
          },
        },
      };
      await signup({
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

      // Should have redirected correctly
      expect(window.location.assign).toHaveBeenCalledWith(
        mockResponse.data.redirectTo
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
      axios.post.mockImplementationOnce(() => Promise.reject(mockResponse));
      expect(
        signup({
          method: "password",
          email: "valid@example.com",
          password: "somevalidpassword",
        })
      ).rejects.toEqual(new Error(mockResponse.response.data.message));
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

    it("should get provider link and redirect", () => {
      signup({ method: provider });

      // Assert getProviderLink was called and user is redirected
      expect(window.location.assign).toHaveBeenCalledTimes(1);
      expect(window.location.assign).toHaveBeenCalledWith(loginUrl);
    });
  });
});

describe("login", () => {
  afterEach(() => {
    window.location.assign.mockClear();
  });

  describe("with username & password", () => {
    it("should send a request, set access and ID cookies, and initiate nonce exchange", async () => {
      // Mock the API response
      const mockResponse = {
        data: {
          tokens: {
            id: { value: "id-token-value" },
            access: { value: "access-token-value" },
            refresh: { value: "refresh-token-value" },
          },
          nonce: "nonce-value",
          redirectTo: "/dashboard",
        },
      };
      axios.post.mockImplementationOnce(() => mockResponse);

      // Call login()
      const payload = {
        emailOrUsername: "someone@example.com",
        password: "something",
      };
      await login({
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

      // Should have called exchange() with the API's response
      expect(exchange).toHaveBeenCalledWith(mockResponse.data);

      // Should have redirected correctly
      expect(window.location.assign).toHaveBeenCalledWith(
        mockResponse.data.redirectTo
      );
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

    it("should throw if provider is missing", () => {
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
  });
});

describe("sendLoginLink", () => {
  it(`error should respond "Problem sending link"`, async () => {
    // Mock the API response
    const mockResponse = {
      response: {
        data: {
          error: "Bad Request",
          message: `That's a silly link request.`,
          statusCode: 400,
        },
      },
    };
    axios.post.mockImplementationOnce(() => Promise.reject(mockResponse));
    expect(sendLoginLink({ email: "email@example.com" })).rejects.toEqual(
      new Error("Problem sending link.")
    );
  });
});

describe("sendResetLink", () => {
  it(`error should respond "Problem sending link"`, async () => {
    // Mock the API response
    const mockResponse = {
      response: {
        data: {
          error: "Bad Request",
          message: `That's a silly link request.`,
          statusCode: 400,
        },
      },
    };
    axios.post.mockImplementationOnce(() => Promise.reject(mockResponse));
    expect(sendResetLink({ email: "email@example.com" })).rejects.toEqual(
      new Error("Problem sending link.")
    );
  });
});

describe("resetPassword", () => {
  it(`error should respond with whatever error the server sends`, async () => {
    // Mock the API response
    const mockResponse = {
      response: {
        data: {
          error: "Bad Request",
          message: `That's a silly reset request.`,
          statusCode: 400,
        },
      },
    };
    axios.put.mockImplementationOnce(() => Promise.reject(mockResponse));
    expect(resetPassword({ token: "token", uuid: "uuid" })).rejects.toEqual(
      new Error(mockResponse.response.data.message)
    );
  });
});
