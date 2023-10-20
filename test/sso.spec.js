import Userfront from "../src/index.js";
import { signonWithSso } from "../src/sso.js";
import { getQueryAttr } from "../src/url.js";
import { mockWindow } from "./config/utils.js";

const providers = [
  "apple",
  "azure",
  "facebook",
  "github",
  "google",
  "linkedin",
  "okta",
];

mockWindow({
  origin: "https://example.com",
  href: "https://example.com/login?redirect=%2Fdashboard",
});

const tenantId = "abcdefg";

describe("SSO", () => {
  describe("signonWithSso()", () => {
    beforeEach(() => {
      Userfront.init(tenantId);
    });

    afterEach(() => {
      window.location.assign.mockClear();
    });

    it.each(providers)("with each social provider", (provider) => {
      signonWithSso({ provider });

      expect(window.location.assign).toHaveBeenCalledTimes(1);
      expect(window.location.assign).toHaveBeenCalledWith(
        `https://api.userfront.com/v0/auth/${provider}/login?` +
          `origin=${encodeURIComponent(window.location.origin)}&` +
          `tenant_id=${tenantId}&` +
          `redirect=${encodeURIComponent(getQueryAttr("redirect"))}`
      );
    });

    it.each(providers)(
      "redirects to social SSO provider location with redirect=false to not redirect after signup/login",
      (provider) => {
        signonWithSso({ provider, redirect: false });

        expect(window.location.assign).toHaveBeenCalledTimes(1);
        expect(window.location.assign).toHaveBeenCalledWith(
          `https://api.userfront.com/v0/auth/${provider}/login?` +
            `origin=${encodeURIComponent(window.location.origin)}&` +
            `tenant_id=${tenantId}&` +
            `redirect=${encodeURIComponent("/")}`
        );
      }
    );

    it("throws when { provider: 'custom' } is specified without a providerId", () => {
      try {
        signonWithSso({ provider: "custom" });
        expect("non-error").not.toBeDefined();
      } catch (error) {
        expect(error).toEqual(new Error("Missing providerId"));
      }

      expect(window.location.assign).toHaveBeenCalledTimes(0);
    });

    it("redirects to custom SSO provider location", () => {
      const providerId = "fake-provider-id";
      signonWithSso({ provider: "custom", providerId });

      expect(window.location.assign).toHaveBeenCalledTimes(1);
      expect(window.location.assign).toHaveBeenCalledWith(
        `https://api.userfront.com/v0/auth/custom/login?` +
          `origin=${encodeURIComponent(window.location.origin)}&` +
          `tenant_id=${tenantId}&` +
          `provider_id=${providerId}&` +
          `redirect=${encodeURIComponent(getQueryAttr("redirect"))}`
      );
    });

    it("redirects to custom SSO provider location with redirect", () => {
      const providerId = "fake-provider-id";
      const redirect = "/redirect-path";
      signonWithSso({ provider: "custom", providerId, redirect });

      expect(window.location.assign).toHaveBeenCalledTimes(1);
      expect(window.location.assign).toHaveBeenCalledWith(
        `https://api.userfront.com/v0/auth/custom/login?` +
          `origin=${encodeURIComponent(window.location.origin)}&` +
          `tenant_id=${tenantId}&` +
          `provider_id=${providerId}&` +
          `redirect=${encodeURIComponent(redirect)}`
      );
    });

    it("redirects to custom SSO provider location with redirect=false to not redirect after signup/login", () => {
      const providerId = "fake-provider-id";
      signonWithSso({ provider: "custom", providerId, redirect: false });

      expect(window.location.assign).toHaveBeenCalledTimes(1);
      expect(window.location.assign).toHaveBeenCalledWith(
        `https://api.userfront.com/v0/auth/custom/login?` +
          `origin=${encodeURIComponent(window.location.origin)}&` +
          `tenant_id=${tenantId}&` +
          `provider_id=${providerId}&` +
          `redirect=${encodeURIComponent("/")}`
      );
    });
  });
});
