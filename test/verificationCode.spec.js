import Userfront from "../src/index.js";
import api from "../src/api.js";
import {
  createAccessToken,
  createIdToken,
  createRefreshToken,
} from "./config/utils.js";
import {
  sendVerificationCode,
  loginWithVerificationCode,
} from "../src/verificationCode.js";
import { exchange } from "../src/refresh.js";
import { handleRedirect } from "../src/url.js";

jest.mock("../src/refresh.js");
jest.mock("../src/api.js");
jest.mock("../src/url.js");

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
    expect(api.post).toHaveBeenCalledWith(`/auth/code`, {
      tenantId,
      ...payload,
    });

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
    jest.resetAllMocks();
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
    expect(api.put).toHaveBeenCalledWith(`/auth/code`, {
      tenantId,
      ...payload,
    });

    // Should return the correct value
    expect(data).toEqual(mockResponseCopy.data);

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponseCopy.data);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(userAttrs.email);
    expect(Userfront.user.userId).toEqual(userAttrs.userId);

    // Should have redirected correctly
    expect(handleRedirect).toHaveBeenCalledWith({
      data: mockResponseCopy.data,
    });
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
    expect(api.put).toHaveBeenCalledWith(`/auth/code`, {
      tenantId,
      channel: payload.channel,
      email: payload.email,
      verificationCode: payload.verificationCode,
    });

    // Should return the correct value
    expect(data).toEqual(mockResponseCopy.data);

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponseCopy.data);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(userAttrs.email);
    expect(Userfront.user.userId).toEqual(userAttrs.userId);

    // Should redirect correctly
    expect(handleRedirect).toHaveBeenCalledWith({
      redirect: payload.redirect,
      data: mockResponseCopy.data,
    });
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
    expect(api.put).toHaveBeenCalledWith(`/auth/code`, {
      tenantId,
      channel: payload.channel,
      phoneNumber: payload.phoneNumber,
      verificationCode: payload.verificationCode,
    });

    // Should return the correct value
    expect(data).toEqual(mockResponseCopy.data);

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponseCopy.data);

    // Should have set the user object
    expect(Userfront.user.phoneNumber).toEqual(userAttrs.phoneNumber);
    expect(Userfront.user.userId).toEqual(userAttrs.userId);

    // Should redirect correctly
    expect(handleRedirect).toHaveBeenCalledWith({
      redirect: false,
      data: mockResponseCopy.data,
    });
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
});
