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
  assertNoUser,
  mfaHeaders,
  noMfaHeaders,
  pkceParams,
} from "./config/assertions.js";
import { exchange } from "../src/refresh.js";
import { signupWithPassword, loginWithPassword } from "../src/password.js";
import { handleRedirect } from "../src/url.js";
import * as Pkce from "../src/pkce.js";

jest.mock("../src/api.js");
jest.mock("../src/refresh.js");
jest.mock("../src/url.js");
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
  },
};

// Mock "MFA Required" API response
const mockMfaRequiredResponse = createMfaRequiredResponse({
  firstFactor: {
    strategy: "password",
    channel: "email",
  },
});

const mockPkceRequiredResponse = {
  data: {
    message: "PKCE required",
    authorizationCode: "auth-code",
    redirectTo: "my-app:/login"
  }
}

describe("signupWithPassword()", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
    jest.resetAllMocks();
    unsetUser();
  });

  it("should send a request, set access and ID cookies, and initiate nonce exchange", async () => {
    // Mock the API response
    api.post.mockImplementationOnce(() => mockResponse);

    // Call signupWithPassword()
    const payload = {
      email: idTokenUserDefaults.email,
      name: idTokenUserDefaults.name,
      userData: idTokenUserDefaults.data,
      password: "something",
    };
    const data = await signupWithPassword(payload);

    // Should have sent the proper API request
    expect(api.post).toHaveBeenCalledWith(
      `/auth/create`,
      {
        tenantId,
        email: payload.email,
        name: payload.name,
        data: payload.userData,
        password: payload.password,
      },
      noMfaHeaders
    );

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponse.data);

    // Should have returned the proper value
    expect(data).toEqual(mockResponse.data);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(payload.email);
    expect(Userfront.user.userId).toEqual(idTokenUserDefaults.userId);

    // Should call handleRedirect correctly
    expect(handleRedirect).toHaveBeenCalledWith({
      redirect: payload.redirect,
      data: mockResponse.data,
    });
  });

  it("should sign up and redirect to provided path", async () => {
    // Mock the API response
    api.post.mockImplementationOnce(() => mockResponse);

    // Call signupWithPassword()
    const payload = {
      email: idTokenUserDefaults.email,
      password: "something",
      redirect: "/custom",
    };
    const data = await signupWithPassword(payload);

    // Should have sent the proper API request
    expect(api.post).toHaveBeenCalledWith(
      `/auth/create`,
      {
        tenantId,
        email: payload.email,
        password: payload.password,
      },
      noMfaHeaders
    );

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponse.data);

    // Should have returned the proper value
    expect(data).toEqual(mockResponse.data);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(payload.email);
    expect(Userfront.user.userId).toEqual(idTokenUserDefaults.userId);

    // Should call handleRedirect correctly
    expect(handleRedirect).toHaveBeenCalledWith({
      redirect: payload.redirect,
      data: mockResponse.data,
    });
  });

  it("should sign up and not redirect if redirect = false", async () => {
    // Update the userId to ensure it is overwritten
    const newAttrs = {
      userId: 891,
      email: "another@example.com",
    };
    const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
    mockResponseCopy.data.tokens.id.value = createIdToken(newAttrs);

    // Mock the API response
    api.post.mockImplementationOnce(() => mockResponseCopy);

    // Call signupWithPassword() with redirect = false
    const payload = {
      email: newAttrs.email,
      password: "something",
    };
    await signupWithPassword({
      redirect: false,
      ...payload,
    });

    // Should have sent the proper API request
    expect(api.post).toHaveBeenCalledWith(
      `/auth/create`,
      {
        tenantId,
        ...payload,
      },
      noMfaHeaders
    );

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponseCopy.data);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(payload.email);
    expect(Userfront.user.userId).toEqual(newAttrs.userId);

    // Should call handleRedirect correctly
    expect(handleRedirect).toHaveBeenCalledWith({
      redirect: false,
      data: mockResponseCopy.data,
    });
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
      signupWithPassword({
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
    const data = await signupWithPassword(payload);

    // Should have sent the correct API request
    expect(api.post).toHaveBeenCalledWith(
      `/auth/create`,
      {
        tenantId,
        email: payload.email,
        password: payload.password,
      },
      noMfaHeaders
    );

    // Should have updated the MFA service state
    assertAuthenticationDataMatches(mockMfaRequiredResponse);

    // Should not have set the user object or redirected
    assertNoUser(Userfront.user);
    expect(handleRedirect).not.toHaveBeenCalled();

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
    await signupWithPassword(payload);

    // Should have sent the correct API request, with MFA headers
    expect(api.post).toHaveBeenCalledWith(
      `/auth/create`,
      {
        tenantId,
        email: payload.email,
        password: payload.password,
      },
      mfaHeaders
    );
  });
});

describe("loginWithPassword()", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
    jest.resetAllMocks();
    unsetUser();
  });

  describe("with username & password", () => {
    it("should send a request, set access and ID cookies, and initiate nonce exchange", async () => {
      // Mock the API response
      api.post.mockImplementationOnce(() => mockResponse);

      // Call loginWithPassword()
      const payload = {
        emailOrUsername: idTokenUserDefaults.email,
        password: "something",
      };
      const data = await loginWithPassword(payload);

      // Should have sent the proper API request
      expect(api.post).toHaveBeenCalledWith(
        `/auth/basic`,
        {
          tenantId,
          ...payload,
        },
        noMfaHeaders
      );

      // Should have returned the proper value
      expect(data).toEqual(mockResponse.data);

      // Should have called exchange() with the API's response
      expect(exchange).toHaveBeenCalledWith(mockResponse.data);

      // Should have set the user object
      expect(Userfront.user.email).toEqual(payload.emailOrUsername);
      expect(Userfront.user.userId).toEqual(idTokenUserDefaults.userId);

      // Should call handleRedirect correctly
      expect(handleRedirect).toHaveBeenCalledWith({
        redirect: payload.redirect,
        data: mockResponse.data,
      });
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

      // Call loginWithPassword() with redirect = false
      const payload = {
        email: newAttrs.email,
        password: "something",
      };
      const data = await loginWithPassword({
        redirect: false,
        ...payload,
      });

      // Should have sent the proper API request
      expect(api.post).toHaveBeenCalledWith(
        `/auth/basic`,
        {
          tenantId,
          emailOrUsername: payload.email,
          password: payload.password,
        },
        noMfaHeaders
      );

      // Should have called exchange() with the API's response
      expect(exchange).toHaveBeenCalledWith(mockResponseCopy.data);

      // Should have returned the proper value
      expect(data).toEqual(mockResponseCopy.data);

      // Should have set the user object
      expect(Userfront.user.email).toEqual(payload.email);
      expect(Userfront.user.userId).toEqual(newAttrs.userId);

      // Should call handleRedirect correctly
      expect(handleRedirect).toHaveBeenCalledWith({
        redirect: false,
        data: mockResponseCopy.data,
      });
    });

    it("should login and redirect to a provided path", async () => {
      api.post.mockImplementationOnce(() => mockResponse);

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
      expect(api.post).toHaveBeenCalledWith(
        `/auth/basic`,
        {
          tenantId,
          ...payload,
        },
        noMfaHeaders
      );

      // Should have called exchange() with the API's response
      expect(exchange).toHaveBeenCalledWith(mockResponse.data);

      // Should have set the user object
      expect(Userfront.user.email).toEqual(payload.emailOrUsername);
      expect(Userfront.user.userId).toEqual(idTokenUserDefaults.userId);

      // Should call handleRedirect correctly
      expect(handleRedirect).toHaveBeenCalledWith({
        redirect: false,
        data: mockResponse.data,
      });
    });

    it("should set the noResetEmail option if provided", async () => {
      // Mock the API response
      api.post.mockImplementationOnce(() => mockResponse);

      // Call loginWithPassword()
      const payload = {
        emailOrUsername: idTokenUserDefaults.email,
        password: "something",
        options: {
          noResetEmail: true,
        },
      };
      await loginWithPassword(payload);

      // Should have sent the proper API request
      expect(api.post).toHaveBeenCalledWith(
        `/auth/basic`,
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
        loginWithPassword({
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
      const data = await loginWithPassword(payload);

      // Should have sent the correct API request
      expect(api.post).toHaveBeenCalledWith(
        `/auth/basic`,
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
      assertNoUser(Userfront.user);
      expect(handleRedirect).not.toHaveBeenCalled();

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
      await loginWithPassword(payload);

      // Should have sent the correct API request, with MFA headers
      expect(api.post).toHaveBeenCalledWith(
        `/auth/basic`,
        {
          tenantId,
          emailOrUsername: payload.email,
          password: payload.password,
        },
        mfaHeaders
      );
    });

    describe("with PKCE", () => {
      it("signup: should send a PKCE request if PKCE is required", async () => {
        Pkce.getPkceRequestQueryParams.mockImplementationOnce(() => ({ "code_challenge": "code" }));
        // Mock the API response
        api.post.mockImplementationOnce(() => mockResponse);

        // Call loginWithPassword()
        const payload = {
          email: idTokenUserDefaults.email,
          password: "something",
        };
        await signupWithPassword(payload);

        // Should have sent the proper API request
        expect(api.post).toHaveBeenCalledWith(
          `/auth/create`,
          {
            tenantId,
            email: payload.email,
            password: payload.password,
          },
          pkceParams("code")
        );
      })

      it("signup: should handle a PKCE Required response", async () => {
        Pkce.getPkceRequestQueryParams.mockImplementationOnce(() => ({ "code_challenge": "code" }));
        api.post.mockImplementationOnce(() => mockPkceRequiredResponse);
        // Call loginWithPassword()
        const payload = {
          email: idTokenUserDefaults.email,
          password: "something",
        };
        await signupWithPassword(payload);

        // Should have sent the proper API request
        expect(api.post).toHaveBeenCalledWith(
          `/auth/create`,
          {
            tenantId,
            email: payload.email,
            password: payload.password,
          },
          pkceParams("code")
        );
        
        // Should have requested redirect with the correct params
        const params = Pkce.redirectWithPkce.mock.lastCall;
        expect(params[0]).toEqual("my-app:/login");
        expect(params[1]).toEqual("auth-code");
      })
      it("login: should send a PKCE request if PKCE is required", async () => {
        Pkce.getPkceRequestQueryParams.mockImplementationOnce(() => ({ "code_challenge": "code" }));
        // Mock the API response
        api.post.mockImplementationOnce(() => mockResponse);

        // Call loginWithPassword()
        const payload = {
          emailOrUsername: idTokenUserDefaults.email,
          password: "something"
        };
        await loginWithPassword(payload);

        // Should have sent the proper API request
        expect(api.post).toHaveBeenCalledWith(
          `/auth/basic`,
          {
            tenantId,
            ...payload,
          },
          pkceParams("code")
        );
      })

      it("login: should handle a PKCE Required response", async () => {
        Pkce.getPkceRequestQueryParams.mockImplementationOnce(() => ({ "code_challenge": "code" }));
        api.post.mockImplementationOnce(() => mockPkceRequiredResponse);
        // Call loginWithPassword()
        const payload = {
          emailOrUsername: idTokenUserDefaults.email,
          password: "something"
        };
        await loginWithPassword(payload);

        // Should have sent the proper API request
        expect(api.post).toHaveBeenCalledWith(
          `/auth/basic`,
          {
            tenantId,
            ...payload,
          },
          pkceParams("code")
        );
        
        // Should have requested redirect with the correct params
        const params = Pkce.redirectWithPkce.mock.lastCall;
        expect(params[0]).toEqual("my-app:/login");
        expect(params[1]).toEqual("auth-code");
      })
    })
  });
});
