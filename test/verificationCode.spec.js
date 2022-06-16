import axios from "axios";

import Userfront from "../src/index.js";
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

jest.mock("../src/refresh.js", () => {
  return {
    __esModule: true,
    exchange: jest.fn(),
  };
});
jest.mock("axios");

const tenantId = "abcd9876";
const customBaseUrl = "https://custom.example.com/api/v1/";

mockWindow({
  origin: "https://example.com",
  href: "https://example.com/login",
});

// Mock API response
const mockResponse = {
  data: {
    message: "OK",
    result: {
      whatever: "response",
    },
  },
};

describe("sendVerificationCode()", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
  });

  it(`sms send should respond with API response information`, async () => {
    // Mock the API response
    axios.post.mockImplementationOnce(() => mockResponse);

    const payload = { channel: "sms", phoneNumber: "+15558769098" };

    // Call sendVerificationCode()
    const data = await sendVerificationCode(payload);

    // Should have sent the proper API request
    expect(axios.post).toHaveBeenCalledWith(
      `https://api.userfront.com/v0/auth/code`,
      {
        tenantId,
        ...payload,
      }
    );

    // Should have returned the proper value
    expect(data).toEqual(mockResponse.data);
  });

  it(`email send should respond with API response information`, async () => {
    // Mock the API response
    axios.post.mockImplementationOnce(() => mockResponse);

    const payload = { channel: "email", email: "user@example.com" };

    // Call sendVerificationCode()
    const data = await sendVerificationCode(payload);

    // Should have sent the proper API request
    expect(axios.post).toHaveBeenCalledWith(
      `https://api.userfront.com/v0/auth/code`,
      {
        tenantId,
        ...payload,
      }
    );

    // Should have returned the proper value
    expect(data).toEqual(mockResponse.data);
  });

  it(`error should respond with whatever the server sends`, async () => {
    // Mock the API response
    const mockResponse = {
      response: {
        data: {
          error: "Bad Request",
          message: `Can't use email with SMS (duh)`,
          statusCode: 400,
        },
      },
    };
    axios.post.mockImplementationOnce(() => Promise.reject(mockResponse));
    expect(() =>
      sendVerificationCode({ channel: "email", email: "email@example.com" })
    ).rejects.toEqual(new Error(mockResponse.response.data.message));
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

xdescribe("loginWithVerificationCode()", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
  });

  afterEach(() => {
    window.location.assign.mockClear();
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
    axios.put.mockImplementationOnce(() => mockResponseCopy);

    // Call loginWithVerificationCode()
    const payload = {
      token: "some-token",
      uuid: "some-uuid",
    };
    const data = await loginWithVerificationCode(payload);

    // Should have sent the proper API request
    expect(axios.put).toHaveBeenCalledWith(
      `https://api.userfront.com/v0/auth/link`,
      {
        tenantId,
        ...payload,
      }
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

  it("should login and redirect using custom baseUrl", async () => {
    Userfront.init(tenantId, {
      baseUrl: customBaseUrl,
    });

    // Update the userId to ensure it is overwritten
    const newAttrs = {
      userId: 2091,
      email: "linker@example.com",
    };
    const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
    mockResponseCopy.data.tokens.id.value = createIdToken(newAttrs);

    // Mock the API response
    axios.put.mockImplementationOnce(() => mockResponseCopy);

    // Call loginWithVerificationCode()
    const payload = {
      token: "some-token",
      uuid: "some-uuid",
    };
    const data = await loginWithVerificationCode(payload);

    // Should have sent the proper API request
    expect(axios.put).toHaveBeenCalledWith(`${customBaseUrl}auth/link`, {
      tenantId,
      ...payload,
    });

    // Should return the correct value
    expect(data).toEqual(mockResponseCopy.data);
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
    axios.put.mockImplementationOnce(() => mockResponseCopy);

    // Call loginWithVerificationCode()
    const data = await loginWithVerificationCode();

    // Should have sent the proper API request
    expect(axios.put).toHaveBeenCalledWith(
      `https://api.userfront.com/v0/auth/link`,
      {
        tenantId,
        ...query,
      }
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
    axios.put.mockImplementationOnce(() => mockResponse);

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
    expect(axios.put).toHaveBeenCalledWith(
      `https://api.userfront.com/v0/auth/link`,
      {
        tenantId,
        ...payload,
      }
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
    const data = await loginWithVerificationCode(payload);

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
    expect(data).toEqual(mockMfaOptionsResponse.data);
  });
});
