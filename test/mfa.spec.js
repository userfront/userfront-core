import { vi } from "vitest";
import Userfront from "../src/index.js";
import { mockWindow } from "./config/utils.js";
import { authenticationData } from "../src/authentication.js";
import {
  setFirstFactors,
  defaultHandleMfaRequired,
  isFirstFactorTokenPresent,
  getMfaHeaders,
  clearMfa,
  resetMfa,
} from "../src/mfa.js";

vi.mock("../src/api.js");
vi.mock("../src/pkce.js");

mockWindow({
  origin: "https://example.com",
  href: "https://example.com/login",
});

const blankAuthenticationData = {
  ...authenticationData,
};

describe("MFA service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.location.href = `https://example.com/login`;
    for (const key in authenticationData) {
      authenticationData[key] = blankAuthenticationData[key];
    }
  });

  describe("defaultHandleMfaRequired()", () => {
    it("should do nothing if the response is not an MFA Required response", () => {
      const mockResponse = {
        message: "OK",
        result: {
          channel: "sms",
          phoneNumber: "+15558675309",
          submittedAt: "2022-10-21T23:26:07.146Z",
          messageId: "fe3194f6-da85-48aa-a24e-3eab4c5c19d1",
        },
      };
      defaultHandleMfaRequired("anything", mockResponse);
      expect(authenticationData).toEqual(blankAuthenticationData);
    });
    it("should set the MFA service state if it is an MFA Required response", () => {
      const mockResponse = {
        message: "MFA required",
        isMfaRequired: true,
        isEmailConfirmed: true,
        isPhoneNumberConfirmed: false,
        firstFactorToken:
          "uf_test_first_factor_207a4d56ce7e40bc9dafb0918fb6599a",
        authentication: {
          firstFactor: {
            strategy: "link",
            channel: "email",
          },
          secondFactors: [
            {
              strategy: "totp",
              channel: "authenticator",
            },
            {
              strategy: "verificationCode",
              channel: "sms",
            },
          ],
        },
      };
      defaultHandleMfaRequired(mockResponse.firstFactorToken, mockResponse);
      expect(authenticationData.secondFactors).toEqual([
        {
          strategy: "totp",
          channel: "authenticator",
        },
        {
          strategy: "verificationCode",
          channel: "sms",
        },
      ]);
      expect(authenticationData.firstFactorToken).toEqual(
        "uf_test_first_factor_207a4d56ce7e40bc9dafb0918fb6599a"
      );
    });
    it("should overwrite the firstFactorToken on sequential successful first factor logins", () => {
      const firstFactorToken1 =
        "uf_test_first_factor_207a4d56ce7e40bc9dafb0918fb6599a";
      const mockResponse1 = {
        message: "MFA required",
        isMfaRequired: true,
        isEmailConfirmed: true,
        isPhoneNumberConfirmed: false,
        firstFactorToken: firstFactorToken1,
        authentication: {
          firstFactor: {
            strategy: "link",
            channel: "email",
          },
          secondFactors: [
            {
              strategy: "totp",
              channel: "authenticator",
            },
            {
              strategy: "verificationCode",
              channel: "sms",
            },
          ],
        },
      };
      defaultHandleMfaRequired(mockResponse1.firstFactorToken, mockResponse1);
      expect(authenticationData.firstFactorToken).toEqual(firstFactorToken1);
      const firstFactorToken2 =
        "uf_test_first_factor_12345d56ce7e4ae3677ea0918fbabcde";
      const mockResponse2 = {
        message: "MFA required",
        isMfaRequired: true,
        isEmailConfirmed: true,
        isPhoneNumberConfirmed: false,
        firstFactorToken: firstFactorToken2,
        authentication: {
          firstFactor: {
            strategy: "link",
            channel: "email",
          },
          secondFactors: [
            {
              strategy: "totp",
              channel: "authenticator",
            },
            {
              strategy: "verificationCode",
              channel: "sms",
            },
          ],
        },
      };
      defaultHandleMfaRequired(mockResponse2.firstFactorToken, mockResponse2);
      expect(authenticationData.firstFactorToken).toEqual(firstFactorToken2);
    });
  });

  describe("setFirstFactors", () => {
    it("should update the available first factors when passed a valid authentication object", async () => {
      const authentication = {
        firstFactors: [
          {
            channel: "email",
            strategy: "password",
          },
          {
            channel: "email",
            strategy: "link",
          },
        ],
      };
      Userfront.init("demo1234");

      setFirstFactors(authentication);
      expect(authenticationData.firstFactors).toEqual(
        authentication.firstFactors
      );
    });

    it("should fail gracefully for bad inputs", async () => {
      expect(() => {
        setFirstFactors(null);
      }).not.toThrow();
      expect(() => {
        setFirstFactors("bad input");
      }).not.toThrow();
      expect(() => {
        setFirstFactors({ mode: "test" });
      }).not.toThrow();
      expect(() => {
        setFirstFactors({ firstFactors: ["corrupt", "data"] });
      }).not.toThrow();

      Userfront.store.tenantId = null;
      const goodAuthentication = {
        firstFactors: [
          {
            channel: "email",
            strategy: "password",
          },
          {
            channel: "email",
            strategy: "link",
          },
        ],
      };
      expect(() => {
        setFirstFactors(goodAuthentication)
      }).not.toThrow();
    });
  });

  describe("isFirstFactorTokenPresent()", () => {
    it("should return true if MFA is currently required", () => {
      authenticationData.firstFactorToken = "uf_live_first_factor_sometoken";
      expect(isFirstFactorTokenPresent()).toEqual(true);
    });
    it("should return false if MFA is not currently required", () => {
      authenticationData.firstFactorToken = "";
      expect(isFirstFactorTokenPresent()).toEqual(false);
    });
  });

  describe("getMfaHeaders()", () => {
    it("should return an authorization header if there is a firstFactorToken set", () => {
      authenticationData.firstFactorToken = "uf_test_first_factor_token";
      const headers = getMfaHeaders();
      expect(headers).toEqual({
        authorization: "Bearer uf_test_first_factor_token",
      });
    });
    it("should return an empty object if there is no firstFactorToken set", () => {
      const headers = getMfaHeaders();
      expect(headers).toEqual({});
    });
  });

  it("clearMfa should clear the transient MFA state", () => {
    authenticationData.secondFactors = [
      {
        strategy: "totp",
        channel: "authenticator",
      },
      {
        strategy: "verificationCode",
        channel: "sms",
      },
    ];
    authenticationData.firstFactorToken = "uf_test_first_factor_token";
    authenticationData.firstFactors = [
      {
        channel: "email",
        strategy: "password",
      },
    ];
    clearMfa();
    expect(authenticationData.secondFactors).toEqual([]);
    expect(authenticationData.firstFactorToken).toEqual(null);
    expect(authenticationData.firstFactors).toEqual([
      {
        channel: "email",
        strategy: "password",
      },
    ]);
  });

  it("resetMfa should reset the MFA service to the uninitialized state", () => {
    authenticationData.secondFactors = [
      {
        strategy: "totp",
        channel: "authenticator",
      },
      {
        strategy: "verificationCode",
        channel: "sms",
      },
    ];
    authenticationData.firstFactorToken = "uf_test_first_factor_token";
    authenticationData.firstFactors = [
      {
        channel: "email",
        strategy: "password",
      },
    ];
    resetMfa();
    expect(authenticationData.secondFactors).toEqual([]);
    expect(authenticationData.firstFactorToken).toEqual(null);
    expect(authenticationData.firstFactors).toEqual([]);
  });
});
