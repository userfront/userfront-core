import Userfront from "../src/index.js";
import api from "../src/api.js";
import {
  createAccessToken,
  createIdToken,
  createRefreshToken,
  idTokenUserDefaults,
  mockWindow,
} from "./config/utils.js";
import {
  sendVerificationCode,
  loginWithVerificationCode,
} from "../src/verificationCode.js";
import { exchange } from "../src/refresh.js";

jest.mock("../src/refresh.js");
jest.mock("../src/api.js");

const tenantId = "abcd9876";

mockWindow({
  origin: "https://example.com",
  href: "https://example.com/login",
});

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

    const payload = { channel: "sms", phoneNumber: "+15558769098" };

    // Call sendVerificationCode()
    const data = await sendVerificationCode(payload);

    // Should have sent the proper API request
    expect(api.post).toHaveBeenCalledWith(`/auth/code`, {
      tenantId,
      ...payload,
    });

    // Should have returned the proper value
    expect(data).toEqual(mockResponse.data);
  });

  it(`email send should respond with API response information`, async () => {
    // Mock the API response
    api.post.mockImplementationOnce(() => mockResponse);

    const payload = { channel: "email", email: "user@example.com" };

    // Call sendVerificationCode()
    const data = await sendVerificationCode(payload);

    // Should have sent the proper API request
    expect(api.post).toHaveBeenCalledWith(`/auth/code`, {
      tenantId,
      ...payload,
    });

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
    expect(() =>
      sendVerificationCode({ channel: "email", email: "email@example.com" })
    ).rejects.toEqual(new Error(mockResponse.data.message));
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

  beforeEach(() => {
    Userfront.init(tenantId);
  });

  afterEach(() => {
    window.location.assign.mockClear();
  });

  it("should login and redirect", async () => {
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
    expect(api.put).toHaveBeenCalledWith(`/auth/code`, {
      tenantId,
      ...payload,
    });

    // Should return the correct value
    expect(data).toEqual(mockResponseCopy.res);

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponseCopy.res);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(userAttrs.email);
    expect(Userfront.user.userId).toEqual(userAttrs.userId);

    // Should have redirected correctly
    expect(window.location.assign).toHaveBeenCalledWith("/dashboard");
  });

  it("should read token, uuid, and redirect from the URL if not present", async () => {
    // Update the userId to ensure it is overwritten
    const userAttrs = {
      userId: 98100,
      email: "verified-2@example.com",
    };
    const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
    mockResponseCopy.data.tokens.id.value = createIdToken(userAttrs);

    const query = {
      token: "some-token",
      uuid: "some-uuid",
    };

    const redirect = "/post-login";

    // Visit a URL with ?token=&uuid=&redirect=
    window.location.href = `https://example.com/login?token=${query.token}&uuid=${query.uuid}&redirect=${redirect}`;

    // Mock the API response
    api.put.mockImplementationOnce(() => mockResponseCopy);

    // Call loginWithVerificationCode()
    const data = await loginWithVerificationCode();

    // Should have sent the proper API request
    expect(api.put).toHaveBeenCalledWith(`/auth/code`, {
      tenantId,
      ...query,
    });

    // Should return the correct value
    expect(data).toEqual(mockResponseCopy.res);

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponseCopy.res);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(userAttrs.email);
    expect(Userfront.user.userId).toEqual(userAttrs.userId);

    // Should have redirected correctly
    expect(window.location.assign).toHaveBeenCalledWith(redirect);

    // Reset the URL
    window.location.href = `https://example.com/login`;
  });

  it("should not redirect if redirect = false", async () => {
    api.put.mockImplementationOnce(() => mockResponse);

    // Call loginWithVerificationCode()
    const payload = {
      token: "some-token",
      uuid: "some-uuid",
    };
    const data = await loginWithVerificationCode({
      redirect: false,
      ...payload,
    });

    // Should have sent the proper API request
    expect(api.put).toHaveBeenCalledWith(`/auth/code`, {
      tenantId,
      ...payload,
    });

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
});
