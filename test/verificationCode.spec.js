import { vi } from "vitest";

import Userfront from "../src/index.js";
import api from "../src/api.js";
import { unsetUser } from "../src/user.js";
import {
  createAccessToken,
  createIdToken,
  createRefreshToken,
  createMfaRequiredResponse,
  setMfaRequired,
} from "./config/utils.js";
import {
  assertAuthenticationDataMatches,
  mfaHeaders,
  noMfaHeaders,
  pkceParams,
} from "./config/assertions.js";
import {
  sendVerificationCode,
  loginWithVerificationCode,
} from "../src/verificationCode.js";
import { defaultHandleRedirect } from "../src/url.js";
import { defaultHandleTokens } from "../src/tokens.js";
import * as Pkce from "../src/pkce.js";

vi.mock("../src/refresh.js");
vi.mock("../src/api.js");
vi.mock("../src/url.js");
vi.mock("../src/tokens.js");
vi.mock("../src/pkce.js");

const tenantId = "abcd9876";

describe("sendVerificationCode()", () => {
  // Mock API response
  const mockResponse = {
    data: {
      message: "OK",
      result: {
        whatever: "response",
      },
    },
  };

  beforeEach(() => {
    Userfront.init(tenantId);
  });

  it(`sms send should respond with API response information`, async () => {
    // Mock the API response
    api.post.mockImplementationOnce(() => mockResponse);

    const payload = {
      channel: "sms",
      phoneNumber: "+15558769098",
      email: "user@example.com",
      username: "new-by-sms",
      name: "New User",
      data: { attr: "custom-data" },
    };

    // Call sendVerificationCode()
    const res = await sendVerificationCode(payload);

    // Should have sent the proper API request
    expect(api.post).toHaveBeenCalledWith(
      `/tenants/${tenantId}/auth/code`,
      payload,
      noMfaHeaders
    );

    // Should have returned the proper value
    expect(res).toEqual(mockResponse.data);
  });

  it(`email send should respond with API response information`, async () => {
    // Mock the API response
    api.post.mockImplementationOnce(() => mockResponse);

    const payload = { channel: "email", email: "user@example.com" };

    // Call sendVerificationCode()
    const data = await sendVerificationCode(payload);

    // Should have sent the proper API request
    expect(api.post).toHaveBeenCalledWith(
      `/tenants/${tenantId}/auth/code`,
      payload,
      noMfaHeaders
    );

    // Should have returned the proper value
    expect(data).toEqual(mockResponse.data);
  });

  it(`error should respond with whatever the server sends`, async () => {
    // Mock the API response
    const mockResponse = {
      data: {
        error: "Bad Request",
        message: `Can't use email with SMS (duh)`,
        statusCode: 400,
      },
    };
    api.post.mockImplementationOnce(() => Promise.reject(mockResponse));
    try {
      await sendVerificationCode({
        channel: "email",
        email: "email@example.com",
      });
      expect("This line should not run").toEqual(true);
    } catch (error) {
      expect(error.data).toEqual(mockResponse.data);
    }
  });

  it("should error if channel and identifier do not match", async () => {
    // SMS without phoneNumber
    expect(() =>
      sendVerificationCode({ channel: "sms", email: "user@example.com" })
    ).rejects.toEqual(
      new Error(`SMS verification code requires "phoneNumber"`)
    );

    // Email without email
    expect(() =>
      sendVerificationCode({ channel: "email", phoneNumber: "+15558769098" })
    ).rejects.toEqual(new Error(`Email verification code requires "email"`));
  });

  it("should include the firstFactorToken if this is the second factor", async () => {
    // Set up the MFA service
    setMfaRequired();

    // Mock the API response
    api.post.mockImplementationOnce(() => mockResponse);

    const payload = {
      channel: "sms",
    };

    // Call sendVerificationCode()
    const res = await sendVerificationCode(payload);

    // Should have sent the proper API request with MFA headers
    expect(api.post).toHaveBeenCalledWith(
      `/tenants/${tenantId}/auth/code`,
      payload,
      mfaHeaders
    );

    // Should have returned the proper value
    expect(res).toEqual(mockResponse.data);
  });
});

describe("loginWithVerificationCode()", () => {
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
      strategy: "verificationCode",
      channel: "sms",
    },
  });

  beforeEach(() => {
    Userfront.init(tenantId);
    unsetUser();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should login", async () => {
    // Update the userId to ensure it is overwritten
    const userAttrs = {
      userId: 2091,
      email: "verified@example.com",
    };
    const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
    mockResponseCopy.data.tokens.id.value = createIdToken(userAttrs);

    // Mock the API response
    api.put.mockImplementationOnce(() => mockResponseCopy);

    // Call loginWithVerificationCode()
    const payload = {
      channel: "email",
      email: userAttrs.email,
      verificationCode: "123467",
    };
    const data = await loginWithVerificationCode(payload);

    // Should have sent the proper API request
    expect(api.put).toHaveBeenCalledWith(
      `/tenants/${tenantId}/auth/code`,
      payload,
      noMfaHeaders
    );

    // Should return the correct value
    expect(data).toEqual(mockResponseCopy.data);

    // Should call defaultHandleTokens correctly
    expect(defaultHandleTokens).toHaveBeenCalledWith(data.tokens, data);

    // Should call defaultHandleRedirect correctly
    expect(defaultHandleRedirect).toHaveBeenCalledWith(data.redirectTo, data);
  });

  it("should login with custom redirect", async () => {
    // Update the userId to ensure it is overwritten
    const userAttrs = {
      userId: 2091,
      email: "verified@example.com",
    };
    const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
    mockResponseCopy.data.tokens.id.value = createIdToken(userAttrs);

    // Mock the API response
    api.put.mockImplementationOnce(() => mockResponseCopy);

    // Call loginWithVerificationCode()
    const payload = {
      channel: "email",
      email: userAttrs.email,
      verificationCode: "123467",
      redirect: "/custom",
    };
    const data = await loginWithVerificationCode(payload);

    // Should have sent the proper API request
    expect(api.put).toHaveBeenCalledWith(
      `/tenants/${tenantId}/auth/code`,
      {
        channel: payload.channel,
        email: payload.email,
        verificationCode: payload.verificationCode,
      },
      noMfaHeaders
    );

    // Should return the correct value
    expect(data).toEqual(mockResponseCopy.data);

    // Should call defaultHandleTokens correctly
    expect(defaultHandleTokens).toHaveBeenCalledWith(data.tokens, data);

    // Should call defaultHandleRedirect correctly
    expect(defaultHandleRedirect).toHaveBeenCalledWith(payload.redirect, data);
  });

  it("should login without redirect if redirect=false", async () => {
    // Update the userId to ensure it is overwritten
    const userAttrs = {
      userId: 992,
      phoneNumber: "+15558769912",
    };
    const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
    mockResponseCopy.data.tokens.id.value = createIdToken(userAttrs);

    // Mock the API response
    api.put.mockImplementationOnce(() => mockResponseCopy);

    // Call loginWithVerificationCode()
    const payload = {
      channel: "sms",
      phoneNumber: userAttrs.phoneNumber,
      verificationCode: "123467",
      redirect: false,
    };
    const data = await loginWithVerificationCode(payload);

    // Should have sent the proper API request
    expect(api.put).toHaveBeenCalledWith(
      `/tenants/${tenantId}/auth/code`,
      {
        channel: payload.channel,
        phoneNumber: payload.phoneNumber,
        verificationCode: payload.verificationCode,
      },
      noMfaHeaders
    );

    // Should return the correct value
    expect(data).toEqual(mockResponseCopy.data);

    // Should call defaultHandleTokens correctly
    expect(defaultHandleTokens).toHaveBeenCalledWith(data.tokens, data);

    // Should not call defaultHandleRedirect
    expect(defaultHandleRedirect).not.toHaveBeenCalled();
  });

  it("should handle an MFA Required response", async () => {
    // Mock the API response
    api.put.mockImplementationOnce(() => mockMfaRequiredResponse);

    // Call loginWithVerificationCode()
    const payload = {
      channel: "sms",
      phoneNumber: "+15558769912",
      verificationCode: "123467",
    };
    const data = await loginWithVerificationCode(payload);

    // Should have sent the proper API request
    expect(api.put).toHaveBeenCalledWith(
      `/tenants/${tenantId}/auth/code`,
      {
        channel: payload.channel,
        phoneNumber: payload.phoneNumber,
        verificationCode: payload.verificationCode,
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

    // Mock the API response
    api.put.mockImplementationOnce(() => mockResponse);

    // Call loginWithVerificationCode()
    const payload = {
      channel: "sms",
      verificationCode: "123467",
    };
    await loginWithVerificationCode(payload);

    // Should have sent the proper API request
    expect(api.put).toHaveBeenCalledWith(
      `/tenants/${tenantId}/auth/code`,
      {
        channel: payload.channel,
        verificationCode: payload.verificationCode,
      },
      mfaHeaders
    );
  });

  it("should throw an error for incorrect channel", async () => {
    // Invalid channel
    expect(() =>
      loginWithVerificationCode({
        channel: "usps",
        email: "john@example.com",
        verificationCode: "123467",
      })
    ).rejects.toEqual(new Error(`Invalid channel`));

    // SMS channel without phoneNumber
    expect(() =>
      loginWithVerificationCode({
        channel: "sms",
        email: "john@example.com",
        verificationCode: "123467",
      })
    ).rejects.toEqual(
      new Error(`SMS verification code requires "phoneNumber"`)
    );

    // Email channel without email address
    expect(() =>
      loginWithVerificationCode({
        channel: "email",
        phoneNumber: "+15558769912",
        verificationCode: "123467",
      })
    ).rejects.toEqual(new Error(`Email verification code requires "email"`));
  });

  describe("with PKCE", () => {
    const mockPkceRequiredResponse = {
      data: {
        message: "PKCE required",
        authorizationCode: "auth-code",
        redirectTo: "my-app:/login",
      },
    };

    it("should send a PKCE request if PKCE is required", async () => {
      Pkce.getPkceRequestQueryParams.mockImplementationOnce(() => ({
        code_challenge: "code",
      }));
      api.put.mockImplementationOnce(() => mockResponse);

      // Update the userId to ensure it is overwritten
      const userAttrs = {
        userId: 2091,
        email: "verified@example.com",
      };
      const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
      mockResponseCopy.data.tokens.id.value = createIdToken(userAttrs);

      // Mock the API response
      api.put.mockImplementationOnce(() => mockResponseCopy);

      // Call loginWithVerificationCode()
      const payload = {
        channel: "email",
        email: userAttrs.email,
        verificationCode: "123467",
      };
      await loginWithVerificationCode(payload);

      // Should have sent the proper API request
      expect(api.put).toHaveBeenCalledWith(
        `/tenants/${tenantId}/auth/code`,
        payload,
        pkceParams("code")
      );
    });

    it("should handle a PKCE Required response", async () => {
      Pkce.getPkceRequestQueryParams.mockImplementationOnce(() => ({
        code_challenge: "code",
      }));
      // Mock the API response
      api.put.mockImplementationOnce(() => mockPkceRequiredResponse);

      // Update the userId to ensure it is overwritten
      const userAttrs = {
        userId: 2091,
        email: "verified@example.com",
      };
      const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
      mockResponseCopy.data.tokens.id.value = createIdToken(userAttrs);

      // Mock the API response
      api.put.mockImplementationOnce(() => mockResponseCopy);

      // Call loginWithVerificationCode()
      const payload = {
        channel: "email",
        email: userAttrs.email,
        verificationCode: "123467",
      };
      const data = await loginWithVerificationCode(payload);

      // Should have sent the proper API request
      expect(api.put).toHaveBeenCalledWith(
        `/tenants/${tenantId}/auth/code`,
        payload,
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
