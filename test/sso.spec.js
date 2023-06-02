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

    it.each(providers)("with each provider", (provider) => {
      signonWithSso({ provider });

      expect(window.location.assign).toHaveBeenCalledTimes(1);
      expect(window.location.assign).toHaveBeenCalledWith(
        `https://api.userfront.com/v0/auth/${provider}/login?` +
          `tenant_id=${tenantId}&` +
          `origin=${window.location.origin}&` +
          `redirect=${encodeURIComponent(getQueryAttr("redirect"))}`
      );
    });
  });
});
