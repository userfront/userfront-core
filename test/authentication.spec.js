import { vi } from "vitest";
import { mockWindow } from "./config/utils.js";
import {
  authenticationData,
  handleLoginResponse,
} from "../src/authentication.js";
import { defaultHandleMfaRequired } from "../src/mfa.js";
import { defaultHandlePkceRequired } from "../src/pkce.js";

vi.mock("../src/api.js");
vi.mock("../src/mfa.js");
vi.mock("../src/pkce.js");

mockWindow({
  origin: "https://example.com",
  href: "https://example.com/login",
});

const blankAuthenticationData = {
  ...authenticationData,
};

describe("Authentication service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.location.href = `https://example.com/login`;
    for (const key in authenticationData) {
      authenticationData[key] = blankAuthenticationData[key];
    }
  });

  describe("handleLoginResponse()", () => {
    describe("redirection", () => {
      it("should redirect to redirect argument when present", async () => {
        const redirect = "/argument";
        window.location.href = `https://example.com/login?redirect=/redirect-query`; // should ignore
        await handleLoginResponse({
          data: {
            redirectTo: "/data", // should ignore
          },
          redirect,
        });

        // Should have redirected correctly
        expect(window.location.assign).toHaveBeenCalledWith(redirect);
      });

      it("should redirect to querystring redirect when other redirect argument is not present", async () => {
        const redirectQuery = "/redirect-query";
        window.location.href = `https://example.com/login?redirect=${redirectQuery}`;
        await handleLoginResponse({
          data: {
            redirectTo: "/data", // should ignore
          },
          redirect: undefined,
        });

        // Should have redirected correctly
        expect(window.location.assign).toHaveBeenCalledWith(redirectQuery);
      });

      it("should redirect to data.redirectTo when other redirect methods are not present", async () => {
        const redirectTo = "/data";
        await handleLoginResponse({
          data: {
            redirectTo,
          },
          redirect: undefined,
        });

        // Should have redirected correctly
        expect(window.location.assign).toHaveBeenCalledWith(redirectTo);
      });

      it("should not redirect when redirect=false", async () => {
        window.location.href = `https://example.com/login?redirect=/redirect-query`; // should ignore
        await handleLoginResponse({
          data: {
            redirectTo: "/data", // should ignore
          },
          redirect: false,
        });

        // Should have redirected correctly
        expect(window.location.assign).not.toHaveBeenCalled();
      });
    });

    describe("PKCE", () => {
      it(`should handle "PKCE required" response`, async () => {
        const payload = {
          data: {
            message: "PKCE required",
            authorizationCode: "auth-code",
            redirectTo: "my-app:/login",
          },
        };

        const data = await handleLoginResponse(payload);

        // Should have requested PKCE redirect with the correct params
        expect(defaultHandlePkceRequired).toHaveBeenCalledWith(
          data.authorizationCode,
          data.redirectTo,
          data
        );
      });
      it("should call a custom handlePkceRequired function", async () => {
        const fn = vi.fn();

        const payload = {
          data: {
            message: "PKCE required",
            authorizationCode: "auth-code",
            redirectTo: "my-app:/login",
          },
          handlePkceRequired: fn
        };

        const data = await handleLoginResponse(payload);

        // Should have called the custom function with the correct params
        expect(fn).toHaveBeenCalledWith(
          data.authorizationCode,
          data.redirectTo,
          data
        );
      })
    });

    describe("MFA", () => {
      it(`should handle "MFA required" response`, async () => {
        const payload = {
          data: {
            message: "MFA required",
            firstFactorToken: "uf_factor",
            authentication: {},
          },
        };

        const data = await handleLoginResponse(payload);

        // Should called the defaultHandleMfaRequired handler
        expect(defaultHandleMfaRequired).toHaveBeenCalledWith(
          data.firstFactorToken,
          data
        );
      });
      it("should call a custom handleMfaRequired function", async () => {
        const fn = vi.fn();

        const payload = {
          data: {
            message: "MFA required",
            firstFactorToken: "uf_factor",
            authentication: {},
          },
          handleMfaRequired: fn
        };

        const data = await handleLoginResponse(payload);

        // Should have called the custom function with the correct params
        expect(fn).toHaveBeenCalledWith(
          data.firstFactorToken,
          data
        );
      });
    });
  });
});
