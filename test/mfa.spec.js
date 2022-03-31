import axios from "axios";

import Userfront from "../src/index.js";
import {
  createAccessToken,
  createIdToken,
  createRefreshToken,
  idTokenUserDefaults,
} from "./config/utils.js";
import {
  sendSecurityCode,
  sendSms,
  loginWithSecurityCode,
} from "../src/mfa.js";
import { exchange } from "../src/refresh.js";

jest.mock("../src/refresh.js", () => {
  return {
    __esModule: true,
    exchange: jest.fn(),
  };
});
jest.mock("axios");

const tenantId = "abcd9876";
const firstFactorCode = "204a8def-651c-4ab2-9ca0-1e3fca9e280a";
const phoneNumber = "+15558675309";
const securityCode = "123456";

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

const mockSendSmsResponse = {
  data: {
    message: "OK",
    result: {
      to: phoneNumber,
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

describe("sendSecurityCode", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
  });

  it(`should throw if missing parameters`, async () => {
    const missingParamsError = new Error(
      "Userfront.sendSecurityCode missing parameters."
    );

    expect(sendSecurityCode()).rejects.toEqual(missingParamsError);

    // Missing firstFactorCode
    expect(
      sendSecurityCode({
        strategy: "securityCode",
        channel: "sms",
        to: phoneNumber,
      })
    ).rejects.toEqual(missingParamsError);

    // Missing strategy
    expect(
      sendSecurityCode({
        firstFactorCode,
        channel: "sms",
        to: phoneNumber,
      })
    ).rejects.toEqual(missingParamsError);

    // Missing channel
    expect(
      sendSecurityCode({
        firstFactorCode,
        strategy: "securityCode",
        to: phoneNumber,
      })
    ).rejects.toEqual(missingParamsError);

    // Missing to
    expect(
      sendSecurityCode({
        firstFactorCode,
        strategy: "securityCode",
        channel: "sms",
      })
    ).rejects.toEqual(missingParamsError);

    expect(axios.post).not.toHaveBeenCalled();
  });

  it(`should return message status upon successful submission`, async () => {
    expect(Userfront.tokens.accessToken).toBeUndefined;

    axios.post.mockImplementationOnce(() => mockSendSmsResponse);
    const payload = {
      firstFactorCode,
      strategy: "securityCode",
      channel: "sms",
      to: phoneNumber,
    };
    const res = await sendSecurityCode(payload);

    // Should have sent the proper API request
    expect(axios.post).toHaveBeenCalledWith(
      `https://api.userfront.com/v0/auth/mfa`,
      {
        tenantId,
        ...payload,
      }
    );

    // Should have returned the proper value
    expect(res).toEqual(mockSendSmsResponse.data);
    expect(res.result.to).toEqual(payload.to);
  });
});

describe("sendSms", () => {
  beforeAll(() => {
    axios.post.mockClear();
  });

  beforeEach(() => {
    Userfront.init(tenantId);
  });

  it(`should throw if missing parameters`, async () => {
    expect(sendSms()).rejects.toEqual(
      new Error('Userfront.sendSms called without "type" property.')
    );
  });

  describe("type: securityCode", () => {
    it(`should throw if missing parameters`, async () => {
      const missingParamsError = new Error(
        'Userfront.sendSms type "securityCode" requires "to" and "firstFactorCode".'
      );

      // Missing firstFactorCode
      expect(
        sendSms({
          type: "securityCode",
          to: phoneNumber,
        })
      ).rejects.toEqual(missingParamsError);

      // Missing to
      expect(
        sendSms({
          type: "securityCode",
          firstFactorCode,
        })
      ).rejects.toEqual(missingParamsError);

      expect(axios.post).not.toHaveBeenCalled();
    });

    it(`should return message status upon successful submission`, async () => {
      expect(Userfront.tokens.accessToken).toBeUndefined;

      axios.post.mockImplementationOnce(() => mockSendSmsResponse);
      const payload = {
        to: phoneNumber,
        firstFactorCode,
      };
      const res = await sendSms({
        type: "securityCode",
        ...payload,
      });

      // Should have sent the proper API request
      expect(axios.post).toHaveBeenCalledWith(
        `https://api.userfront.com/v0/auth/mfa`,
        {
          tenantId,
          strategy: "securityCode",
          channel: "sms",
          ...payload,
        }
      );

      // Should have returned the proper value
      expect(res).toEqual(mockSendSmsResponse.data);
      expect(res.result.to).toEqual(payload.to);
    });
  });
});

describe("loginWithSecurityCode", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
  });

  afterEach(() => {
    window.location.assign.mockClear();
  });

  it(`should throw if missing parameters`, async () => {
    const missingParamsError = new Error(
      "Userfront.loginWithSecurityCode missing parameters."
    );

    expect(loginWithSecurityCode()).rejects.toEqual(missingParamsError);

    // Missing firstFactorCode
    expect(
      loginWithSecurityCode({
        securityCode,
      })
    ).rejects.toEqual(missingParamsError);

    // Missing securityCode
    expect(
      loginWithSecurityCode({
        firstFactorCode,
      })
    ).rejects.toEqual(missingParamsError);

    expect(axios.put).not.toHaveBeenCalled();
  });

  it(`should return login response upon successful submission`, async () => {
    expect(Userfront.tokens.accessToken).toBeUndefined;
    expect(Userfront.user).toBeUndefined;

    axios.put.mockImplementationOnce(() => mockLoginResponse);
    const payload = {
      firstFactorCode,
      securityCode,
    };
    const res = await loginWithSecurityCode(payload);

    // Should have sent the proper API request
    expect(axios.put).toHaveBeenCalledWith(
      `https://api.userfront.com/v0/auth/mfa`,
      {
        tenantId,
        ...payload,
      }
    );

    // Should have returned the proper value
    expect(res).toEqual(mockLoginResponse.data);

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

    axios.put.mockImplementationOnce(() => mockLoginResponse);
    const payload = {
      firstFactorCode,
      securityCode,
    };
    const res = await loginWithSecurityCode({
      ...payload,
      redirect,
    });

    // Should have sent the proper API request
    expect(axios.put).toHaveBeenCalledWith(
      `https://api.userfront.com/v0/auth/mfa`,
      {
        tenantId,
        ...payload,
      }
    );

    // Should have returned the proper value
    expect(res).toEqual(mockLoginResponse.data);

    // Should have redirected to path
    expect(window.location.assign).toHaveBeenCalledWith(redirect);
  });

  it("should not redirect if specified as `false`", async () => {
    expect(Userfront.tokens.accessToken).toBeUndefined;
    expect(Userfront.user).toBeUndefined;

    axios.put.mockImplementationOnce(() => mockLoginResponse);
    const payload = {
      firstFactorCode,
      securityCode,
    };
    const res = await loginWithSecurityCode({
      ...payload,
      redirect: false,
    });

    // Should have sent the proper API request
    expect(axios.put).toHaveBeenCalledWith(
      `https://api.userfront.com/v0/auth/mfa`,
      {
        tenantId,
        ...payload,
      }
    );

    // Should have returned the proper value
    expect(res).toEqual(mockLoginResponse.data);

    // Should not have redirected
    expect(window.location.assign).not.toHaveBeenCalledWith(
      mockLoginResponse.data.redirectTo
    );
  });
});
