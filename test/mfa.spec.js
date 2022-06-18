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
  sendSms,
  loginWithVerificationCode,
} from "../src/mfa.js";
import { exchange } from "../src/refresh.js";

jest.mock("../src/api.js");
jest.mock("../src/refresh.js");

const tenantId = "abcd9876";
const firstFactorCode = "204a8def-651c-4ab2-9ca0-1e3fca9e280a";
const phoneNumber = "+15558675309";
const verificationCode = "123456";

mockWindow({
  origin: "https://example.com",
  href: "https://example.com/login",
});

const mockSendSmsResponse = {
  data: {
    message: "OK",
    result: {
      phoneNumber,
      submittedAt: new Date(),
      messageId: "204a8def-651c-4ab2-9ca0-1e3fca9e280a",
      status: "pending",
    },
  },
};

const mockLoginResponse = {
  data: {
    mode: "live",
    redirectTo: "/dashboard",
    sessionId: "8976836f-f43d-425d-ab93-86e620c51e5c",
    nonce: "71539dd5-7efc-43d1-b355-9c7e48f165b5",
    tokens: {
      access: { value: createAccessToken() },
      id: { value: createIdToken() },
      refresh: { value: createRefreshToken() },
    },
  },
};

describe("sendVerificationCode", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
  });

  it(`should throw if missing parameters`, async () => {
    const missingParamsError = new Error(
      "Userfront.sendVerificationCode missing parameters."
    );

    expect(sendVerificationCode()).rejects.toEqual(missingParamsError);

    // Missing firstFactorCode
    expect(
      sendVerificationCode({
        strategy: "verificationCode",
        channel: "sms",
        phoneNumber,
      })
    ).rejects.toEqual(missingParamsError);

    // Missing strategy
    expect(
      sendVerificationCode({
        firstFactorCode,
        channel: "sms",
        phoneNumber,
      })
    ).rejects.toEqual(missingParamsError);

    // Missing channel
    expect(
      sendVerificationCode({
        firstFactorCode,
        strategy: "verificationCode",
        phoneNumber,
      })
    ).rejects.toEqual(missingParamsError);

    // Missing to
    expect(
      sendVerificationCode({
        firstFactorCode,
        strategy: "verificationCode",
        channel: "sms",
      })
    ).rejects.toEqual(missingParamsError);

    expect(api.post).not.toHaveBeenCalled();
  });

  it(`should return message status upon successful submission`, async () => {
    expect(Userfront.tokens.accessToken).toBeUndefined;

    api.post.mockImplementationOnce(() => mockSendSmsResponse);
    const payload = {
      firstFactorCode,
      strategy: "verificationCode",
      channel: "sms",
      phoneNumber,
    };
    const data = await sendVerificationCode(payload);

    // Should have sent the proper API request
    expect(api.post).toHaveBeenCalledWith(`/auth/mfa`, {
      tenantId,
      ...payload,
    });

    // Should have returned the proper value
    expect(data).toEqual(mockSendSmsResponse.data);
    expect(data.result.to).toEqual(payload.to);
  });
});

describe("sendSms", () => {
  beforeAll(() => {
    api.post.mockClear();
  });

  beforeEach(() => {
    Userfront.init(tenantId);
  });

  it(`should throw if missing parameters`, async () => {
    expect(sendSms()).rejects.toEqual(
      new Error('Userfront.sendSms called without "type" property.')
    );
  });

  describe("type: verificationCode", () => {
    it(`should throw if missing parameters`, async () => {
      const missingParamsError = new Error(
        'Userfront.sendSms type "verificationCode" requires "phoneNumber" and "firstFactorCode".'
      );

      // Missing firstFactorCode
      expect(
        sendSms({
          type: "verificationCode",
          phoneNumber,
        })
      ).rejects.toEqual(missingParamsError);

      // Missing to
      expect(() =>
        sendSms({
          type: "verificationCode",
          firstFactorCode,
        })
      ).rejects.toEqual(missingParamsError);

      expect(api.post).not.toHaveBeenCalled();
    });

    it(`should return message status upon successful submission`, async () => {
      expect(Userfront.tokens.accessToken).toBeUndefined;

      api.post.mockImplementationOnce(() => mockSendSmsResponse);
      const payload = {
        phoneNumber,
        firstFactorCode,
      };
      const data = await sendSms({
        type: "verificationCode",
        ...payload,
      });

      // Should have sent the proper API request
      expect(api.post).toHaveBeenCalledWith(`/auth/mfa`, {
        tenantId,
        strategy: "verificationCode",
        channel: "sms",
        ...payload,
      });

      // Should have returned the proper value
      expect(data).toEqual(mockSendSmsResponse.data);
      expect(data.result.to).toEqual(payload.to);
    });
  });
});

describe("loginWithVerificationCode", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
  });

  afterEach(() => {
    window.location.assign.mockClear();
  });

  it(`should throw if missing parameters`, async () => {
    const missingParamsError = new Error(
      "Userfront.loginWithVerificationCode missing parameters."
    );

    expect(loginWithVerificationCode()).rejects.toEqual(missingParamsError);

    // Missing firstFactorCode
    expect(
      loginWithVerificationCode({
        verificationCode,
      })
    ).rejects.toEqual(missingParamsError);

    // Missing verificationCode
    expect(
      loginWithVerificationCode({
        firstFactorCode,
      })
    ).rejects.toEqual(missingParamsError);

    expect(api.put).not.toHaveBeenCalled();
  });

  it(`should return login response upon successful submission`, async () => {
    expect(Userfront.tokens.accessToken).toBeUndefined;
    expect(Userfront.user).toBeUndefined;

    api.put.mockImplementationOnce(() => mockLoginResponse);
    const payload = {
      firstFactorCode,
      verificationCode,
    };
    const data = await loginWithVerificationCode(payload);

    // Should have sent the proper API request
    expect(api.put).toHaveBeenCalledWith(`/auth/mfa`, {
      tenantId,
      ...payload,
    });

    // Should have returned the proper value
    expect(data).toEqual(mockLoginResponse.data);

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockLoginResponse.data);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(idTokenUserDefaults.email);
    expect(Userfront.user.userId).toEqual(idTokenUserDefaults.userId);

    // Should have redirected correctly
    expect(window.location.assign).toHaveBeenCalledWith(
      mockLoginResponse.data.redirectTo
    );
  });

  it("should redirect to specified path", async () => {
    expect(Userfront.tokens.accessToken).toBeUndefined;
    expect(Userfront.user).toBeUndefined;

    const redirect = "/post-login";

    api.put.mockImplementationOnce(() => mockLoginResponse);
    const payload = {
      firstFactorCode,
      verificationCode,
    };
    const data = await loginWithVerificationCode({
      ...payload,
      redirect,
    });

    // Should have sent the proper API request
    expect(api.put).toHaveBeenCalledWith(`/auth/mfa`, {
      tenantId,
      ...payload,
    });

    // Should have returned the proper value
    expect(data).toEqual(mockLoginResponse.data);

    // Should have redirected to path
    expect(window.location.assign).toHaveBeenCalledWith(redirect);
  });

  it("should not redirect if specified as `false`", async () => {
    expect(Userfront.tokens.accessToken).toBeUndefined;
    expect(Userfront.user).toBeUndefined;

    api.put.mockImplementationOnce(() => mockLoginResponse);
    const payload = {
      firstFactorCode,
      verificationCode,
    };
    const data = await loginWithVerificationCode({
      ...payload,
      redirect: false,
    });

    // Should have sent the proper API request
    expect(api.put).toHaveBeenCalledWith(`/auth/mfa`, {
      tenantId,
      ...payload,
    });

    // Should have returned the proper value
    expect(data).toEqual(mockLoginResponse.data);

    // Should not have redirected
    expect(window.location.assign).not.toHaveBeenCalledWith(
      mockLoginResponse.data.redirectTo
    );
  });
});
