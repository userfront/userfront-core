import axios from "axios";
import Userfront from "../src/index.js";
import {
  signup,
  login,
  sendLoginLink,
  sendResetLink,
  resetPassword,
  loginWithLink,
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

// Mock API response
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

describe("signup", () => {
  afterEach(() => {
    window.location.assign.mockClear();
  });
  describe("with username & password", () => {
    it("should send a request, set access and ID cookies, and initiate nonce exchange", async () => {
      // Mock the API response
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

      // Should have redirected correctly
      expect(window.location.assign).toHaveBeenCalledWith(
        mockResponse.data.redirectTo
      );
    });

    it("should sign up and not redirect if redirect = false", async () => {
      // Mock the API response
      axios.post.mockImplementationOnce(() => mockResponse);

      // Call signup() with redirect = false
      const payload = {
        email: "someone@example.com",
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

      // Should not have redirected
      expect(window.location.assign).not.toHaveBeenCalled();
    });

    it("should sign up and redirect to provided path", async () => {
      // Mock the API response
      axios.post.mockImplementationOnce(() => mockResponse);

      // Call signup() with redirect = false
      const payload = {
        email: "someone@example.com",
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
      axios.post.mockImplementationOnce(() => mockResponse);

      // Call login()
      const payload = {
        emailOrUsername: "someone@example.com",
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

      // Should have redirected correctly
      expect(window.location.assign).toHaveBeenCalledWith(
        mockResponse.data.redirectTo
      );
    });

    it("should login and not redirect if redirect = false", async () => {
      axios.post.mockImplementationOnce(() => mockResponse);

      // Call login() with redirect = false
      const payload = {
        emailOrUsername: "someone@example.com",
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
          ...payload,
        }
      );

      // Should have called exchange() with the API's response
      expect(exchange).toHaveBeenCalledWith(mockResponse.data);

      // Should have returned the proper value
      expect(res).toEqual(mockResponse.data);

      // Should have redirected correctly
      expect(window.location.assign).not.toHaveBeenCalled();
    });

    it("should login and redirect to a provided path", async () => {
      axios.post.mockImplementationOnce(() => mockResponse);

      // Call login() with redirect = false
      const payload = {
        emailOrUsername: "someone@example.com",
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

      // Should have redirected correctly
      expect(window.location.assign).not.toHaveBeenCalled();
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

describe("loginWithLink", () => {
  afterEach(() => {
    window.location.assign.mockClear();
  });

  it("should login and redirect", async () => {
    axios.put.mockImplementationOnce(() => mockResponse);

    // Call login()
    const payload = {
      token: "some-token",
      uuid: "some-uuid",
    };
    const res = await login({
      method: "link",
      ...payload,
    });

    // Should have sent the proper API request
    expect(axios.put).toHaveBeenCalledWith(
      `https://api.userfront.com/v0/auth/link`,
      {
        tenantId,
        ...payload,
      }
    );

    // Should return the correct value
    expect(res).toEqual(mockResponse.data);

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponse.data);

    // Should have redirected correctly
    expect(window.location.assign).toHaveBeenCalledWith("/dashboard");
  });

  it("should not redirect if redirect = false", async () => {
    axios.put.mockImplementationOnce(() => mockResponse);

    // Call login()
    const payload = {
      token: "some-token",
      uuid: "some-uuid",
    };
    const res = await login({
      method: "link",
      redirect: false,
      ...payload,
    });

    // Should have sent the proper API request
    expect(axios.put).toHaveBeenCalledWith(
      `https://api.userfront.com/v0/auth/link`,
      {
        tenantId,
        ...payload,
      }
    );

    // Should return the correct value
    expect(res).toEqual(mockResponse.data);

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponse.data);

    // Should not have redirected
    expect(window.location.assign).not.toHaveBeenCalled();
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
  afterEach(() => {
    window.location.assign.mockClear();
  });

  it("should send a password reset request and then redirect the page", async () => {
    // Mock the API response
    axios.put.mockImplementationOnce(() => Promise.resolve(mockResponse));

    const options = { token: "token", uuid: "uuid", password: "password" };

    // Call resetPassword
    await resetPassword(options);

    // Should have sent the proper API request
    expect(axios.put).toHaveBeenCalledWith(
      `https://api.userfront.com/v0/auth/reset`,
      {
        tenantId,
        ...options,
      }
    );

    // Should have redirected the page
    expect(window.location.assign).toHaveBeenCalledWith(
      mockResponse.data.redirectTo
    );
  });

  it("should send a password reset request and redirect to a custom page", async () => {
    // Mock the API response
    axios.put.mockImplementationOnce(() => Promise.resolve(mockResponse));

    const targetPath = "/custom/page";

    const options = {
      token: "token",
      uuid: "uuid",
      password: "password",
    };

    // Call resetPassword
    await resetPassword({ ...options, redirect: targetPath });

    // Should have sent the proper API request
    expect(axios.put).toHaveBeenCalledWith(
      `https://api.userfront.com/v0/auth/reset`,
      {
        tenantId,
        ...options,
      }
    );

    // Should have redirected the page
    expect(window.location.assign).toHaveBeenCalledWith(targetPath);
  });

  it("should send a password reset request and not redirect if redirect is false", async () => {
    // Mock the API response
    axios.put.mockImplementationOnce(() => Promise.resolve(mockResponse));

    const targetPath = "/custom/page";

    const options = {
      token: "token",
      uuid: "uuid",
      password: "password",
    };

    // Call resetPassword
    await resetPassword({ ...options, redirect: false });

    // Should have sent the proper API request
    expect(axios.put).toHaveBeenCalledWith(
      `https://api.userfront.com/v0/auth/reset`,
      {
        tenantId,
        ...options,
      }
    );

    // Should not have redirected the page
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  xit(`error should respond with whatever error the server sends`, async () => {
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
