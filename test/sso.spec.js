import Userfront from "../src/index.js";
import { signonWithSso } from "../src/sso.js";
import { getQueryAttr } from "../src/url.js";
import { store } from "../src/store.js";

const providers = [
  "apple",
  "azure",
  "facebook",
  "github",
  "google",
  "linkedin",
];

// Using `window.location.assign` rather than `window.location.href =` because
// JSDOM throws an error "Error: Not implemented: navigation (except hash changes)"
// JSDOM complains about this is because JSDOM does not implement methods like window.alert, window.location.assign, etc.
// https://stackoverflow.com/a/54477957
delete window.location;
const assignMock = jest.fn();
window.location = {
  assign: assignMock,
  origin: "https://example.com",
  href: "https://example.com/login?redirect=%2Fdashboard",
};

const tenantId = "abcdefg";
const customBaseUrl = "https://custom.example.com/api/v1/";

describe("SSO", () => {
  describe("signonWithSso()", () => {
    beforeEach(() => {
      Userfront.init(tenantId);
    });

    afterEach(() => {
      assignMock.mockClear();
    });

    it.each(providers)("with each provider", (provider) => {
      signonWithSso({ provider });
      expect(assignMock).toHaveBeenCalledWith(
        `https://api.userfront.com/v0/auth/${provider}/login?` +
          `tenant_id=${tenantId}&` +
          `origin=${window.location.origin}&` +
          `redirect=${encodeURIComponent(getQueryAttr("redirect"))}`
      );
    });

    it.each(providers)("with each provider; to custom baseUrl", (provider) => {
      Userfront.init(tenantId, {
        baseUrl: customBaseUrl,
      });

      signonWithSso({ provider });

      expect(assignMock).toHaveBeenCalledWith(
        `${customBaseUrl}auth/${provider}/login?` +
          `tenant_id=${tenantId}&` +
          `origin=${window.location.origin}&` +
          `redirect=${encodeURIComponent(getQueryAttr("redirect"))}`
      );
    });

    it("should throw if no tenantId", async () => {
      store.tenantId = null;

      expect(() => signonWithSso({ provider: "google" })).toThrow(
        "Missing tenantId"
      );
    });
  });
});
