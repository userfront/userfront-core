import Userfront from "../src/index.js";
import api from "../src/api.js";
import {
  createAccessToken,
  createIdToken,
  createRefreshToken,
  idTokenUserDefaults,
  createMfaRequiredResponse,
  mockWindow,
} from "./config/utils.js";
import { removeAllCookies } from "../src/cookies.js";
import { setCookiesAndTokens } from "../src/authentication.js";
import {
  sendResetLink,
  updatePassword,
  resetPassword,
  updatePasswordWithLink,
  updatePasswordWithJwt,
} from "../src/password.js";
import { unsetTokens } from "../src/tokens.js";
import { loginWithTotp } from "../src/totp.js";
import { assertAuthenticationDataMatches, mfaHeaders } from "./config/assertions.js";

jest.mock("../src/api.js");

const tenantId = "abcd9876";

mockWindow({
  origin: "https://example.com",
  href: "https://example.com/login",
});

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

describe("sendResetLink()", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
  });

  it(`error should respond with whatever the server sends`, async () => {
    // Mock the API response
    const mockResponse = {
      response: {
        data: {
          error: "Bad Request",
          message: `That's a silly link request.`,
          statusCode: 400,
        },
      },
    };
    api.post.mockImplementationOnce(() => Promise.reject(mockResponse));
    expect(sendResetLink("email@example.com")).rejects.toEqual(
      new Error(mockResponse.response.data.message)
    );
  });
});

describe("resetPassword()", () => {
  it("should be an alias for updatePassword()", () => {
    expect(resetPassword).toEqual(updatePassword);
  });
});

describe("updatePassword()", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
    jest.resetAllMocks();
    // Remove token and uuid from the URL
    window.location.href = "https://example.com/reset";
    unsetTokens();
  });

  describe("No method set (method is inferred)", () => {
    it("should call updatePasswordWithLink() if token and uuid are present in the method inputs", async () => {
      // Mock the API response
      api.put.mockImplementationOnce(() => Promise.resolve(mockResponse));

      const options = { token: "token", uuid: "uuid", password: "password" };

      // Call updatePassword
      await updatePassword(options);

      // Should have sent the proper API request
      expect(api.put).toHaveBeenCalledWith(`/auth/reset`, {
        tenantId,
        ...options,
      });

      // Should have redirected the page
      expect(window.location.assign).toHaveBeenCalledWith(
        mockResponse.data.redirectTo
      );
    });

    it("should call updatePasswordWithLink() if token and uuid are present in the URL", async () => {
      // Add token and uuid to the URL
      window.location.href = "https://example.com/reset?token=aaaaa&uuid=bbbbb";

      // Add JWT access token (to ensure it is not used)
      setCookiesAndTokens(mockResponse.data.tokens);

      // Mock the API response
      api.put.mockImplementationOnce(() => Promise.resolve(mockResponse));

      const options = { password: "password" };

      // Call updatePassword
      await updatePassword(options);

      // Should have sent the proper API request
      expect(api.put).toHaveBeenCalledWith(`/auth/reset`, {
        tenantId,
        token: "aaaaa",
        uuid: "bbbbb",
        ...options,
      });

      // Should have redirected the page
      expect(window.location.assign).toHaveBeenCalledWith(
        mockResponse.data.redirectTo
      );
    });

    it("should call updatePasswordWithJwt() if token and uuid are not present", async () => {
      // Add JWT access token
      setCookiesAndTokens(mockResponse.data.tokens);

      // Mock the API response
      api.put.mockImplementationOnce(() => Promise.resolve(mockResponse));

      // Call updatePassword()
      const options = {
        password: "new-password",
        existingPassword: "old-password",
      };
      await updatePassword(options);

      // Should have sent the proper API request
      expect(api.put).toHaveBeenCalledWith(
        `/auth/basic`,
        {
          tenantId,
          ...options,
        },
        {
          headers: {
            Authorization: `Bearer ${mockResponse.data.tokens.access.value}`,
          },
        }
      );

      // Remove JWT access token
      removeAllCookies();
    });
  });

  describe("updatePasswordWithLink()", () => {
    it("should send a password reset request and then redirect the page", async () => {
      // Mock the API response
      api.put.mockImplementationOnce(() => Promise.resolve(mockResponse));

      const options = { token: "token", uuid: "uuid", password: "password" };

      // Call updatePasswordWithLink
      await updatePasswordWithLink(options);

      // Should have sent the proper API request
      expect(api.put).toHaveBeenCalledWith(`/auth/reset`, {
        tenantId,
        ...options,
      });

      // Should have redirected the page
      expect(window.location.assign).toHaveBeenCalledWith(
        mockResponse.data.redirectTo
      );
    });

    it("should send a password reset request and redirect to a custom page", async () => {
      // Update the userId to ensure it is overwritten
      const newUserAttrs = {
        userId: 3312,
        email: "resetter@example.com",
      };
      const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
      mockResponseCopy.data.tokens.id.value = createIdToken(newUserAttrs);

      // Mock the API response
      api.put.mockImplementationOnce(() => mockResponseCopy);

      const targetPath = "/custom/page";

      const options = {
        token: "token",
        uuid: "uuid",
        password: "password",
      };

      // Call updatePasswordWithLink
      await updatePasswordWithLink({ ...options, redirect: targetPath });

      // Should have sent the proper API request
      expect(api.put).toHaveBeenCalledWith(`/auth/reset`, {
        tenantId,
        ...options,
      });

      // Should have set the user object
      expect(Userfront.user.email).toEqual(newUserAttrs.email);
      expect(Userfront.user.userId).toEqual(newUserAttrs.userId);

      // Should have redirected the page
      expect(window.location.assign).toHaveBeenCalledWith(targetPath);
    });

    it("should send a password reset request and not redirect if redirect is false", async () => {
      // Mock the API response
      api.put.mockImplementationOnce(() => Promise.resolve(mockResponse));

      const options = {
        token: "token",
        uuid: "uuid",
        password: "password",
      };

      // Call updatePasswordWithLink
      await updatePasswordWithLink({ ...options, redirect: false });

      // Should have sent the proper API request
      expect(api.put).toHaveBeenCalledWith(`/auth/reset`, {
        tenantId,
        ...options,
      });

      // Should have set the user object
      expect(Userfront.user.email).toEqual(idTokenUserDefaults.email);
      expect(Userfront.user.userId).toEqual(idTokenUserDefaults.userId);

      // Should not have redirected the page
      expect(window.location.assign).not.toHaveBeenCalled();
    });

    it("should handle an MFA Required response", async () => {
      // Return an MFA Required response
      api.put.mockImplementationOnce(() => mockMfaRequiredResponse);

      const payload = {
        token: "token",
        uuid: "uuid",
        password: "password"
      };

      // Send the request
      const data = await updatePasswordWithLink({ ...payload });

      // Should have update the MFA service state
      assertAuthenticationDataMatches(mockMfaRequiredResponse);

      // Should not have set the user object or redirected
      expect(Userfront.tokens.accessToken).toBeFalsy();
      expect(window.location.assign).not.toHaveBeenCalled();

      // Should have returned MFA options & firstFactorToken
      expect(data).toEqual(mockMfaRequiredResponse.data);
    });

    it("should handle an MFA Required response followed by a second factor", async () => {
      // Return an MFA Required response
      api.put.mockImplementationOnce(() => mockMfaRequiredResponse);

      const payload = {
        token: "token",
        uuid: "uuid",
        password: "password"
      };

      // Send the request
      const data = await updatePasswordWithLink({ ...payload });

      // Should have update the MFA service state
      assertAuthenticationDataMatches(mockMfaRequiredResponse);

      // Should not have set the user object or redirected
      expect(Userfront.tokens.accessToken).toBeFalsy();
      expect(window.location.assign).not.toHaveBeenCalled();

      // Should have returned MFA options & firstFactorToken
      expect(data).toEqual(mockMfaRequiredResponse.data);

      // Mock TOTP login response
      const mockTotpResponse = {
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

      // Return a success response for TOTP second factor
      api.post.mockImplementationOnce(() => mockTotpResponse);

      // Call loginWithTotp() as second factor
      const totpPayload = {
        totpCode: "123456",
      };
      const totpData = await loginWithTotp({
        redirect: false,
        ...totpPayload,
      });

      // Should have sent the proper API request
      expect(api.post).toHaveBeenCalledWith(
        `/auth/totp`,
        {
          tenantId,
          ...totpPayload,
        },
        mfaHeaders
      );

      // Should return the correct value
      expect(totpData).toEqual(mockTotpResponse.data);

      // Tokens should be set now
      expect(Userfront.tokens.accessToken).toEqual(totpData.tokens.access.value);
    });

    it(`error should respond with whatever error the server sends`, async () => {
      // Mock the API response
      const mockResponse = {
        response: {
          data: {
            error: "Bad Request",
            message: `That's a silly reset request.`,
            statusCode: 400,
          },
        },
      };
      api.put.mockImplementationOnce(() => Promise.reject(mockResponse));
      expect(
        updatePasswordWithLink({ token: "token", uuid: "uuid" })
      ).rejects.toEqual(new Error(mockResponse.response.data.message));
    });
  });

  describe("updatePasswordWithJwt()", () => {
    beforeEach(() => {
      // Add JWT access token
      setCookiesAndTokens(mockResponse.data.tokens);
    });

    afterEach(() => {
      // Remove JWT access token
      removeAllCookies();
    });

    it("should send a password update request", async () => {
      // Mock the API response
      api.put.mockImplementationOnce(() => Promise.resolve(mockResponse));

      // Call updatePassword()
      const options = {
        password: "new-password",
        existingPassword: "old-password",
      };

      const data = await updatePassword(options);

      // Should have sent the proper API request
      expect(api.put).toHaveBeenCalledWith(
        `/auth/basic`,
        {
          tenantId,
          ...options,
        },
        {
          headers: {
            Authorization: `Bearer ${mockResponse.data.tokens.access.value}`,
          },
        }
      );

      // Assert the response
      expect(data.tokens).toEqual(mockResponse.data.tokens);
    });

    it(`error should respond with whatever error the server sends`, async () => {
      // Mock the API response
      const mockResponse = {
        response: {
          data: {
            error: "Bad Request",
            message: `That's a silly password update request.`,
            statusCode: 400,
          },
        },
      };
      api.put.mockImplementationOnce(() => Promise.reject(mockResponse));
      expect(
        updatePasswordWithJwt({ password: "new-password" })
      ).rejects.toEqual(new Error(mockResponse.response.data.message));
    });
  });
});
