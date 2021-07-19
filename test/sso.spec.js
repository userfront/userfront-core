import Userfront from "../src/index.js";
import Signon from "../src/signon.js";

import { getQueryAttr } from "../src/url.js";

const providers = ["azure", "facebook", "github", "google", "linkedin"];

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
let revertGetProviderLink;

describe("SSO", () => {
  beforeAll(() => {
    Userfront.__set__("setUser", jest.fn());
    Userfront.init(tenantId);
  });

  describe("Signup", () => {
    let signupWithSSOSpy;

    beforeAll(() => {
      // Signon.signupWithSSO is originally undefined because it's not exported.
      // Using Rewire, we can get the function and set it to our Signon instance
      Signon.signupWithSSO = Signon.__get__("signupWithSSO");
      // Now we can spy on the defined Signon.signupWithSSO
      signupWithSSOSpy = jest.spyOn(Signon, "signupWithSSO");
      // and inject the spy into the module
      Signon.__set__("signupWithSSO", signupWithSSOSpy);
    });

    afterEach(() => {
      signupWithSSOSpy.mockClear();
      assignMock.mockClear();
    });

    it.each(providers)("calls signupWithSSO with each provider", (provider) => {
      Userfront.signup({ method: provider });
      expect(signupWithSSOSpy).toHaveBeenCalledWith({ provider });
      expect(assignMock).toHaveBeenCalledWith(
        `https://api.userfront.com/v0/auth/${provider}/login?` +
          `tenant_id=${tenantId}&` +
          `origin=${window.location.origin}&` +
          `redirect=${encodeURIComponent(getQueryAttr("redirect"))}`
      );
    });

    it("should return to current path if redirect = false", async () => {
      // Navigate to /signup
      window.history.pushState({}, "", "/signup");

      Userfront.signup({ method: "google", redirect: false });
      expect(signupWithSSOSpy).toHaveBeenCalledWith({
        provider: "google",
        redirect: false,
      });
      expect(assignMock).toHaveBeenCalledWith(
        `https://api.userfront.com/v0/auth/google/login?` +
          `tenant_id=${tenantId}&` +
          `origin=${window.location.origin}&` +
          `redirect=${encodeURIComponent("/signup")}`
      );
    });

    it("should throw if problem getting link", async () => {
      const mock = jest.fn();
      mock.mockImplementation(() => {
        throw new Error("Missing tenant ID");
      });

      // Mock this function with option to revert later
      revertGetProviderLink = Signon.__set__("getProviderLink", mock);

      try {
        await Userfront.signup({ method: "google" });
      } catch (error) {}

      expect(signupWithSSOSpy).toHaveBeenCalledWith({ provider: "google" });
      expect(assignMock).not.toHaveBeenCalled();
    });
  });

  describe("Login", () => {
    let loginWithSSOSpy;

    beforeAll(() => {
      revertGetProviderLink(); // Revert from mock to original function
      // Signon.loginWithSSO is originally undefined because it's not exported.
      // Using Rewire, we can get the function and set it to our Signon instance
      Signon.loginWithSSO = Signon.__get__("loginWithSSO");

      // Now we can spy on the defined Signon.loginWithSSO
      loginWithSSOSpy = jest.spyOn(Signon, "loginWithSSO");

      // and inject the spy into the module
      Signon.__set__("loginWithSSO", loginWithSSOSpy);
    });

    afterEach(() => {
      loginWithSSOSpy.mockClear();
      assignMock.mockClear();
    });

    it.each(providers)("calls loginWithSSO with each provider", (provider) => {
      Userfront.login({ method: provider });
      expect(loginWithSSOSpy).toHaveBeenCalledWith({ provider });
      expect(assignMock).toHaveBeenCalledWith(
        `https://api.userfront.com/v0/auth/${provider}/login?` +
          `tenant_id=${tenantId}&` +
          `origin=${window.location.origin}&` +
          `redirect=${encodeURIComponent(getQueryAttr("redirect"))}`
      );
    });

    it("should return to current path if redirect = false", async () => {
      // Navigate to /login/special
      window.history.pushState({}, "", "/login/special");

      Userfront.login({ method: "azure", redirect: false });
      expect(loginWithSSOSpy).toHaveBeenCalledWith({
        provider: "azure",
        redirect: false,
      });
      expect(assignMock).toHaveBeenCalledWith(
        `https://api.userfront.com/v0/auth/azure/login?` +
          `tenant_id=${tenantId}&` +
          `origin=${window.location.origin}&` +
          `redirect=${encodeURIComponent("/login/special")}`
      );
    });

    it("should throw if problem getting link", async () => {
      const mock = jest.fn();
      mock.mockImplementation(() => {
        throw new Error("Missing tenant ID");
      });

      revertGetProviderLink = Signon.__set__("getProviderLink", mock);

      try {
        await Userfront.login({ method: "google" });
      } catch (error) {}

      expect(loginWithSSOSpy).toHaveBeenCalledWith({ provider: "google" });
      expect(assignMock).not.toHaveBeenCalled();
    });
  });
});
