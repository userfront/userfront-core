import Userfront from "../src/index.js";
import api from "../src/api.js";
import {
  mfaData,
  updateFirstFactors,
  isMfaRequired,
  handleMfaRequired,
  getMfaHeaders,
  clearMfa,
  resetMfa
} from "../src/mfa.js";

jest.mock("../src/api.js");

const blankMfaData = {
  ...mfaData
}

describe("mfa.js - MFA service", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    for (const key in mfaData) {
      mfaData[key] = blankMfaData[key];
    }
  })
  describe("updateFirstFactors()", () => {
    it("should update the available first factors to match the tenant's default flow", async () => {
      const mockResponse = {
        firstFactors: [
          {
            channel: "email",
            strategy: "password"
          },
          {
            channel: "email",
            strategy: "link"
          }
        ]
      }
      api.get.mockImplementationOnce(() => mockResponse)

      Userfront.init("demo1234")
      const firstFactors = await updateFirstFactors();

      expect(api.get).toHaveBeenCalledWith("/tenants/demo1234/flows/default");
      
      expect(mfaData.firstFactors).toEqual([
        "password:email",
        "link:email"
      ])

      expect(firstFactors).toEqual([
        "password:email",
        "link:email"
      ])
    });
    it("should clear the available first factors if the library hasn't been initialized with a tenantId", async () =>{
      const mockResponse = {
        response: {
          data: {
            error: "Bad request",
            message: "Missing tenantId.",
            statusCode: 400
          }
        }
      }
      api.get.mockImplementationOnce(() => Promise.reject(mockResponse));
      delete Userfront.store.tenantId;

      const firstFactors = await updateFirstFactors();

      expect(api.get).not.toHaveBeenCalled();
      expect(mfaData.firstFactors).toEqual([]);
      expect(firstFactors).toEqual([]);
    });
    it("should leave existing first factors in place and do nothing if the update call rejects", async () => {
      const mockResponse = {
        response: {
          data: {
            error: "Internal server error",
            message: "Try again later",
            statusCode: 500
          }
        }
      }
      api.get.mockImplementationOnce(() => Promise.reject(mockResponse));
      Userfront.init("demo1234");
      const existingFirstFactors = [
        "password:email",
        "verificationCode:sms"
      ]
      mfaData.firstFactors = [...existingFirstFactors];

      const firstFactors = await updateFirstFactors();

      expect(api.get).toHaveBeenCalledWith("/tenants/demo1234/flows/default");
      expect(mfaData.firstFactors).toEqual(existingFirstFactors);
      expect(firstFactors).toEqual(existingFirstFactors);
    });
    it("should clear first factors if the default auth flow is empty", async () => {
      const mockResponse = {}
      api.get.mockImplementationOnce(() => mockResponse);
      Userfront.init("demo1234")
      mfaData.firstFactors = [
        "link:email",
        "verificationCode:email"
      ]

      const firstFactors = await updateFirstFactors();

      expect(api.get).toHaveBeenCalledWith("/tenants/demo1234/flows/default");
      expect(mfaData.firstFactors).toEqual([]);
      expect(firstFactors).toEqual([]);
    });
  });

  describe("isMfaRequired()", () => {
    it("should return true if MFA is currently required", () => {
      mfaData.firstFactorToken = "uf_live_first_factor_sometoken";
      expect(isMfaRequired()).toEqual(true);
    });
    it("should return false if MFA is not currently required", () => {
      mfaData.firstFactorToken = "";
      expect(isMfaRequired()).toEqual(false);
    });
  });

  describe("handleMfaRequired()", () => {
    it("should do nothing if the response is not an MFA Required response", () => {
      const mockResponse = {
        message: "OK",
        result: {
          channel: "sms",
          phoneNumber: "+15558675309",
          submittedAt: "2022-10-21T23:26:07.146Z",
          messageId: "fe3194f6-da85-48aa-a24e-3eab4c5c19d1"
        }
      }
      handleMfaRequired(mockResponse);
      expect(mfaData).toEqual(blankMfaData);
    });
    it("should set the MFA service state if it is an MFA Required response", () => {
      const mockResponse = {
        message: "MFA required",
        isMfaRequired: true,
        firstFactorToken: "uf_test_first_factor_207a4d56ce7e40bc9dafb0918fb6599a",
        authentication: {
          firstFactor: {
            strategy: "link",
            channel: "email"
          },
          secondFactors: [
            {
              strategy: "totp",
              channel: "authenticator"
            },
            {
              strategy: "verificationCode",
              channel: "sms"
            }
          ]
        }
      }
      handleMfaRequired(mockResponse);
      expect(mfaData.secondFactors).toEqual([
        "totp:authenticator",
        "verificationCode:sms"
      ]);
    });
  });

  describe("getMfaHeaders()", () => {
    it("should return an authorization header if there is a firstFactorToken set", () => {
      mfaData.firstFactorToken = "uf_test_first_factor_token"
      const headers = getMfaHeaders();
      expect(headers).toEqual({
        authorization: "Bearer uf_test_first_factor_token"
      })
    })
    it("should return an empty object if there is no firstFactorToken set", () => {
      const headers = getMfaHeaders();
      expect(headers).toEqual({})
    })
  })

  it("clearMfa should clear the transient MFA state", () => {
    mfaData.secondFactors = [
      "totp:authenticator",
      "verificationCode:sms"
    ]
    mfaData.firstFactorToken = "uf_test_first_factor_token";
    mfaData.firstFactors = [
      "password:email"
    ]
    clearMfa();
    expect(mfaData.secondFactors).toEqual([])
    expect(mfaData.firstFactorToken).toEqual(null);
    expect(mfaData.firstFactors).toEqual([
      "password:email"
    ])
  })

  it("resetMfa should reset the MFA service to the uninitialized state", () => {
    mfaData.secondFactors = [
      "totp:authenticator",
      "verificationCode:sms"
    ]
    mfaData.firstFactorToken = "uf_test_first_factor_token";
    mfaData.firstFactors = [
      "password:email"
    ]
    resetMfa();
    expect(mfaData.secondFactors).toEqual([])
    expect(mfaData.firstFactorToken).toEqual(null);
    expect(mfaData.firstFactors).toEqual([]);
  })
})