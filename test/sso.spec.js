import Userfront from "../src/index.js";

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
Userfront.init(tenantId);
let revertGetProviderLink;

describe("SSO", () => {
  describe("Signup", () => {
    let signupWithSSOSpy;

    beforeAll(() => {
      // Userfront.signupWithSSO is originally undefined because it's not exported.
      // Using Rewire, we can get the function and set it to our Userfront instance
      Userfront.signupWithSSO = Userfront.__get__("signupWithSSO");

      // Now we can spy on the defined Userfront.signupWithSSO
      signupWithSSOSpy = jest.spyOn(Userfront, "signupWithSSO");

      // and inject the spy into the module
      Userfront.__set__("signupWithSSO", signupWithSSOSpy);
    });

    afterEach(() => {
      signupWithSSOSpy.mockClear();
      assignMock.mockClear();
    });

    it.each(providers)("calls signupWithSSO with each provider", (provider) => {
      Userfront.signup({ method: provider });
      expect(signupWithSSOSpy).toHaveBeenCalledWith(provider);
      expect(assignMock).toHaveBeenCalledWith(
        `https://api.userfront.com/v0/auth/${provider}/login?` +
          `tenant_id=${tenantId}&` +
          `origin=${window.location.origin}&` +
          `redirect=${encodeURIComponent(
            getQueryAttr(window.location.href, "redirect")
          )}`
      );
    });

    it("should throw if problem getting link", async () => {
      const mock = jest.fn();
      mock.mockImplementation(() => {
        throw new Error("Missing tenant ID");
      });

      // Mock this function with option to revert later
      revertGetProviderLink = Userfront.__set__("getProviderLink", mock);

      try {
        await Userfront.signup({ method: "google" });
      } catch (error) {}

      expect(signupWithSSOSpy).toHaveBeenCalledWith("google");
      expect(assignMock).not.toHaveBeenCalled();
    });
  });

  describe("Login", () => {
    let loginWithSSOSpy;

    beforeAll(() => {
      revertGetProviderLink(); // Revert from mock to original function
      Userfront.loginWithSSO = Userfront.__get__("loginWithSSO");
      loginWithSSOSpy = jest.spyOn(Userfront, "loginWithSSO");
      Userfront.__set__("loginWithSSO", loginWithSSOSpy);
    });

    afterEach(() => {
      loginWithSSOSpy.mockClear();
      assignMock.mockClear();
    });

    it.each(providers)("calls loginWithSSO with each provider", (provider) => {
      Userfront.login({ method: provider });
      expect(loginWithSSOSpy).toHaveBeenCalledWith(provider);
      expect(assignMock).toHaveBeenCalledWith(
        `https://api.userfront.com/v0/auth/${provider}/login?` +
          `tenant_id=${tenantId}&` +
          `origin=${window.location.origin}&` +
          `redirect=${encodeURIComponent(
            getQueryAttr(window.location.href, "redirect")
          )}`
      );
    });

    it("should throw if problem getting link", async () => {
      const mock = jest.fn();
      mock.mockImplementation(() => {
        throw new Error("Missing tenant ID");
      });

      revertGetProviderLink = Userfront.__set__("getProviderLink", mock);

      try {
        await Userfront.login({ method: "google" });
      } catch (error) {}

      expect(loginWithSSOSpy).toHaveBeenCalledWith("google");
      expect(assignMock).not.toHaveBeenCalled();
    });
  });
});

function getQueryAttr(url, attrName) {
  if (!url || url.indexOf(`${attrName}=`) < 0) {
    return;
  }
  return decodeURIComponent(url.split(`${attrName}=`)[1].split("&")[0]);
}
