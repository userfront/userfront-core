import axios from "axios";

import Userfront from "../src/index.js";
import {
  createAccessToken,
  createIdToken,
  createRefreshToken,
  idTokenUserDefaults,
} from "./config/utils.js";
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

describe("sendLoginLink", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
  });

  it("should respond with link information", async () => {
    const mockResponse = {
      data: {
        message: "OK",
        result: {
          to: "link-requester@example.com",
          whatever: "else",
        },
      },
    };
    // Mock the API response
    axios.post.mockImplementationOnce(() => mockResponse);

    // Call sendLoginLink()
    const res = await sendLoginLink(mockResponse.data.result.to);

    // Should have sent the proper API request
    expect(axios.post).toHaveBeenCalledWith(
      `https://api.userfront.com/v0/auth/link`,
      {
        tenantId,
        email: mockResponse.data.result.to,
      }
    );

    // Should have returned the proper value
    expect(res).toEqual(mockResponse.data);
  });

  it("should respond with link information using custom baseUrl", async () => {
    Userfront.init(tenantId, {
      baseUrl: customBaseUrl,
    });

    const mockResponse = {
      data: {
        message: "OK",
        result: {
          to: "link-requester@example.com",
          whatever: "else",
        },
      },
    };
    // Mock the API response
    axios.post.mockImplementationOnce(() => mockResponse);

    // Call sendLoginLink()
    const res = await sendLoginLink(mockResponse.data.result.to);

    // Should have sent the proper API request
    expect(axios.post).toHaveBeenCalledWith(`${customBaseUrl}auth/link`, {
      tenantId,
      email: mockResponse.data.result.to,
    });

    // Should have returned the proper value
    expect(res).toEqual(mockResponse.data);
  });

  it(`error should respond with whatever the server sends`, async () => {
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
      new Error(mockResponse.response.data.message)
    );
  });
});

describe("loginWithLink", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
  });

  afterEach(() => {
    window.location.assign.mockClear();
  });

  it("should login and redirect", async () => {
    // Update the userId to ensure it is overwritten
    const newUserAttrs = {
      userId: 2091,
      email: "linker@example.com",
    };
    const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
    mockResponseCopy.data.tokens.id.value = createIdToken(newUserAttrs);

    // Mock the API response
    axios.put.mockImplementationOnce(() => mockResponseCopy);

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
    expect(res).toEqual(mockResponseCopy.data);

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponseCopy.data);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(newUserAttrs.email);
    expect(Userfront.user.userId).toEqual(newUserAttrs.userId);

    // Should have redirected correctly
    expect(window.location.assign).toHaveBeenCalledWith("/dashboard");
  });

  it("should login and redirect using custom baseUrl", async () => {
    Userfront.init(tenantId, {
      baseUrl: customBaseUrl,
    });

    // Update the userId to ensure it is overwritten
    const newUserAttrs = {
      userId: 2091,
      email: "linker@example.com",
    };
    const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
    mockResponseCopy.data.tokens.id.value = createIdToken(newUserAttrs);

    // Mock the API response
    axios.put.mockImplementationOnce(() => mockResponseCopy);

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
    expect(axios.put).toHaveBeenCalledWith(`${customBaseUrl}auth/link`, {
      tenantId,
      ...payload,
    });

    // Should return the correct value
    expect(res).toEqual(mockResponseCopy.data);
  });

  it("should read token, uuid, and redirect from the URL if not present", async () => {
    // Update the userId to ensure it is overwritten
    const newUserAttrs = {
      userId: 98100,
      email: "linker-2@example.com",
    };
    const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
    mockResponseCopy.data.tokens.id.value = createIdToken(newUserAttrs);

    const query = {
      token: "some-token",
      uuid: "some-uuid",
    };

    const redirect = "/post-login";

    // Visit a URL with ?token=&uuid=&redirect=
    window.location.href = `https://example.com/login?token=${query.token}&uuid=${query.uuid}&redirect=${redirect}`;

    // Mock the API response
    axios.put.mockImplementationOnce(() => mockResponseCopy);

    // Call login()
    const res = await login({ method: "link" });

    // Should have sent the proper API request
    expect(axios.put).toHaveBeenCalledWith(
      `https://api.userfront.com/v0/auth/link`,
      {
        tenantId,
        ...query,
      }
    );

    // Should return the correct value
    expect(res).toEqual(mockResponseCopy.data);

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponseCopy.data);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(newUserAttrs.email);
    expect(Userfront.user.userId).toEqual(newUserAttrs.userId);

    // Should have redirected correctly
    expect(window.location.assign).toHaveBeenCalledWith(redirect);

    // Reset the URL
    window.location.href = `https://example.com/login`;
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

    // Should have set the user object
    expect(Userfront.user.email).toEqual(idTokenUserDefaults.email);
    expect(Userfront.user.userId).toEqual(idTokenUserDefaults.userId);

    // Should not have redirected
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it("should return MFA options if tenant requires", async () => {
    exchange.mockClear();

    const mockMfaOptionsResponse = {
      data: {
        mode: "live",
        allowedStrategies: ["verificationCode"],
        allowedChannels: ["sms"],
        firstFactorCode: "204a8def-651c-4ab2-9ca0-1e3fca9e280a",
      },
    };

    axios.put.mockImplementationOnce(() => mockMfaOptionsResponse);

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

    // Should not have set the user object, called exchange, or redirected
    expect(Userfront.user).toBeUndefined;
    expect(exchange).not.toHaveBeenCalled();
    expect(window.location.assign).not.toHaveBeenCalled();

    // Should have returned MFA options & firstFactorCode
    expect(res).toEqual(mockMfaOptionsResponse.data);
  });
});

describe("sendResetLink", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
  });

  it(`error should respond with whatever the server sends`, async () => {
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
    expect(sendResetLink("email@example.com")).rejects.toEqual(
      new Error(mockResponse.response.data.message)
    );
  });

  it(`should respond with whatever the server sends when using custom baseUrl`, async () => {
    Userfront.init(tenantId, {
      baseUrl: customBaseUrl,
    });

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

    const email = "email@example.com";
    expect(sendResetLink(email)).rejects.toEqual(
      new Error(mockResponse.response.data.message)
    );

    // Should have sent the proper API request
    expect(axios.post).toHaveBeenCalledWith(`${customBaseUrl}auth/reset/link`, {
      email,
      tenantId,
    });
  });
});

describe("resetPassword", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
  });

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

  it("should send a password reset request with custom baseUrl", async () => {
    Userfront.init(tenantId, {
      baseUrl: customBaseUrl,
    });

    // Mock the API response
    axios.put.mockImplementationOnce(() => Promise.resolve(mockResponse));

    const options = { token: "token", uuid: "uuid", password: "password" };

    // Call resetPassword
    await resetPassword(options);

    // Should have sent the proper API request
    expect(axios.put).toHaveBeenCalledWith(`${customBaseUrl}auth/reset`, {
      tenantId,
      ...options,
    });

    // Should have redirected the page
    expect(window.location.assign).toHaveBeenCalledWith(
      mockResponse.data.redirectTo
    );
  });

  it("should send a password reset request and redirect to a custom page", async () => {
    // Update the userId to ensure it is overwritten
    const newUserAttrs = {
      userId: 3312,
      email: "resetter@example.com",
    };
    const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
    mockResponseCopy.data.tokens.id.value = createIdToken(newUserAttrs);

    // Mock the API response
    axios.put.mockImplementationOnce(() => mockResponseCopy);

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

    // Should have set the user object
    expect(Userfront.user.email).toEqual(newUserAttrs.email);
    expect(Userfront.user.userId).toEqual(newUserAttrs.userId);

    // Should have redirected the page
    expect(window.location.assign).toHaveBeenCalledWith(targetPath);
  });

  it("should send a password reset request and not redirect if redirect is false", async () => {
    // Mock the API response
    axios.put.mockImplementationOnce(() => Promise.resolve(mockResponse));

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

    // Should have set the user object
    expect(Userfront.user.email).toEqual(idTokenUserDefaults.email);
    expect(Userfront.user.userId).toEqual(idTokenUserDefaults.userId);

    // Should not have redirected the page
    expect(window.location.assign).not.toHaveBeenCalled();
  });

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
