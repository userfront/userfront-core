import Userfront from "../src/index.js";
import api from "../src/api.js";
import { unsetUser } from "../src/user.js";
import {
  createAccessToken,
  createIdToken,
  createRefreshToken,
  createMfaRequiredResponse,
  setMfaRequired,
  idTokenUserDefaults,
  mockWindow,
} from "./config/utils.js";
import {
  assertAuthenticationDataMatches,
  assertNoUser,
  mfaHeaders,
  noMfaHeaders,
  pkceParams,
} from "./config/assertions.js";
import {
  sendLoginLink,
  loginWithLink,
  sendPasswordlessLink,
} from "../src/link.js";
import { exchange } from "../src/refresh.js";
import * as Pkce from "../src/pkce.js";

jest.mock("../src/refresh.js");
jest.mock("../src/api.js");
jest.mock("../src/pkce.js");

mockWindow({
  origin: "https://example.com",
  href: "https://example.com/login",
});

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
    strategy: "link",
    channel: "email",
  },
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
          email: "link-requester@example.com",
          whatever: "else",
        },
      },
    };
    // Mock the API response
    api.post.mockImplementationOnce(() => mockResponse);

    // Call sendLoginLink()
    const data = await sendLoginLink(mockResponse.data.result.email);

    // Should have sent the proper API request
    expect(api.post).toHaveBeenCalledWith(`/auth/link`, {
      tenantId,
      email: mockResponse.data.result.email,
    });

    // Should have returned the proper value
    expect(data).toEqual(mockResponse.data);
  });

  it(`error should respond with whatever the server sends`, async () => {
    // Mock the API response
    const mockResponse = {
      data: {
        error: "Bad Request",
        message: `That's a silly link request.`,
        statusCode: 400,
      },
    };
    api.post.mockImplementationOnce(() => Promise.reject(mockResponse));
    expect(() => sendLoginLink({ email: "email@example.com" })).rejects.toEqual(
      mockResponse
    );
  });
});

describe("sendPasswordlessLink", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
  });

  it("should send a request and respond with OK", async () => {
    // Mock the API response
    const mockResponse = {
      data: {
        message: "OK",
        result: {
          email: "link-registered@example.com",
          whatever: "else",
        },
      },
    };
    api.post.mockImplementationOnce(() => mockResponse);

    // Call sendPasswordlessLink()
    const payload = {
      email: mockResponse.data.result.email,
      name: idTokenUserDefaults.name,
      username: idTokenUserDefaults.username,
      data: idTokenUserDefaults.res,
      options: {
        custom: "option",
      },
    };
    const data = await sendPasswordlessLink({
      email: payload.email,
      name: payload.name,
      username: payload.username,
      userData: payload.res,
      options: payload.options,
    });

    // Should have sent the proper API request
    expect(api.post).toHaveBeenCalledWith(`/auth/link`, {
      tenantId,
      ...payload,
    });

    // Should have returned the response exactly
    expect(data).toEqual(mockResponse.data);
  });

  it("should respond with whatever error the server sends", async () => {
    // Mock the API response
    const mockResponseErr = {
      data: {
        error: "Bad Request",
        message: `That's a dumb email address.`,
        statusCode: 400,
      },
    };
    api.post.mockImplementationOnce(() => Promise.reject(mockResponseErr));
    expect(
      sendPasswordlessLink({
        email: "valid@example.com",
      })
    ).rejects.toEqual(mockResponseErr);
  });
});

describe("loginWithLink", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
    window.location.assign.mockClear();
    unsetUser();
  });

  it("should login and redirect", async () => {
    // Update the userId to ensure it is overwritten
    const newAttrs = {
      userId: 2091,
      email: "linker@example.com",
    };
    const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
    mockResponseCopy.data.tokens.id.value = createIdToken(newAttrs);

    // Mock the API response
    api.put.mockImplementationOnce(() => mockResponseCopy);

    // Call loginWithLink()
    const payload = {
      token: "some-token",
      uuid: "some-uuid",
    };
    const data = await loginWithLink(payload);

    // Should have sent the proper API request
    expect(api.put).toHaveBeenCalledWith(
      `/auth/link`,
      {
        tenantId,
        ...payload,
      },
      noMfaHeaders
    );

    // Should return the correct value
    expect(data).toEqual(mockResponseCopy.data);

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponseCopy.data);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(newAttrs.email);
    expect(Userfront.user.userId).toEqual(newAttrs.userId);

    // Should have redirected correctly
    expect(window.location.assign).toHaveBeenCalledWith("/dashboard");
  });

  it("should read token, uuid, and redirect from the URL if not present", async () => {
    // Update the userId to ensure it is overwritten
    const newAttrs = {
      userId: 98100,
      email: "linker-2@example.com",
    };
    const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
    mockResponseCopy.data.tokens.id.value = createIdToken(newAttrs);

    const query = {
      token: "some-token",
      uuid: "some-uuid",
    };

    const redirect = "/post-login";

    // Visit a URL with ?token=&uuid=&redirect=
    window.location.href = `https://example.com/login?token=${query.token}&uuid=${query.uuid}&redirect=${redirect}`;

    // Mock the API response
    api.put.mockImplementationOnce(() => mockResponseCopy);

    // Call loginWithLink()
    const data = await loginWithLink();

    // Should have sent the proper API request
    expect(api.put).toHaveBeenCalledWith(
      `/auth/link`,
      {
        tenantId,
        ...query,
      },
      noMfaHeaders
    );

    // Should return the correct value
    expect(data).toEqual(mockResponseCopy.data);

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponseCopy.data);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(newAttrs.email);
    expect(Userfront.user.userId).toEqual(newAttrs.userId);

    // Should have redirected correctly
    expect(window.location.assign).toHaveBeenCalledWith(redirect);

    // Reset the URL
    window.location.href = `https://example.com/login`;
  });

  it("should not redirect if redirect = false", async () => {
    api.put.mockImplementationOnce(() => mockResponse);

    // Call loginWithLink()
    const payload = {
      token: "some-token",
      uuid: "some-uuid",
    };
    const data = await loginWithLink({
      redirect: false,
      ...payload,
    });

    // Should have sent the proper API request
    expect(api.put).toHaveBeenCalledWith(
      `/auth/link`,
      {
        tenantId,
        ...payload,
      },
      noMfaHeaders
    );

    // Should return the correct value
    expect(data).toEqual(mockResponse.data);

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponse.data);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(idTokenUserDefaults.email);
    expect(Userfront.user.userId).toEqual(idTokenUserDefaults.userId);

    // Should not have redirected
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it("should handle an MFA Required response", async () => {
    exchange.mockClear();

    api.put.mockImplementationOnce(() => mockMfaRequiredResponse);

    const payload = {
      token: "some-token",
      uuid: "some-uuid",
    };
    const data = await loginWithLink(payload);

    // Should have sent the proper API request
    expect(api.put).toHaveBeenCalledWith(
      `/auth/link`,
      {
        tenantId,
        ...payload,
      },
      noMfaHeaders
    );

    // Should have updated the MFA service state
    assertAuthenticationDataMatches(mockMfaRequiredResponse);

    // Should not have set the user object, called exchange, or redirected
    assertNoUser(Userfront.user);
    expect(exchange).not.toHaveBeenCalled();
    expect(window.location.assign).not.toHaveBeenCalled();

    // Should have returned MFA options & firstFactorToken
    expect(data).toEqual(mockMfaRequiredResponse.data);
  });

  it("should include the firstFactorToken if this is the second factor", async () => {
    // Set up the MFA service
    setMfaRequired();
    exchange.mockClear();
    api.put.mockImplementationOnce(() => mockResponse);
    const payload = {
      token: "some-token",
      uuid: "some-uuid",
    };
    await loginWithLink(payload);

    // Should have send the correct API request, with MFA headers attached
    expect(api.put).toHaveBeenCalledWith(
      "/auth/link",
      {
        tenantId,
        ...payload,
      },
      mfaHeaders
    );
  });

  describe("with PKCE", () => {

    const mockPkceRequiredResponse = {
      data: {
        message: "PKCE required",
        authorizationCode: "auth-code",
        redirectTo: "my-app:/login"
      }
    }

    it("should send a PKCE request if PKCE is required", async () => {
      Pkce.getPkceRequestQueryParams.mockImplementationOnce(() => ({ "code_challenge": "code" }));
      // Mock the API response
      api.put.mockImplementationOnce(() => mockResponse);

      const payload = {
        token: "some-token",
        uuid: "some-uuid",
      };
      await loginWithLink(payload);

      // Should have sent the proper API request
      expect(api.put).toHaveBeenCalledWith(
        `/auth/link`,
        {
          tenantId,
          ...payload,
        },
        pkceParams("code")
      );
    })

    it("should handle a PKCE Required response", async () => {
      Pkce.getPkceRequestQueryParams.mockImplementationOnce(() => ({ "code_challenge": "code" }));
      // Mock the API response
      api.put.mockImplementationOnce(() => mockPkceRequiredResponse);;

      const payload = {
        token: "some-token",
        uuid: "some-uuid",
      };
      await loginWithLink(payload);

      // Should have sent the proper API request
      expect(api.put).toHaveBeenCalledWith(
        `/auth/link`,
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
    });
  });
});
