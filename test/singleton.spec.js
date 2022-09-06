import Userfront from "../src/index.js";

describe(`Userfront object`, () => {
  beforeAll(() => {
    Userfront.init("demo1234");
  });
  describe("should export proper methods on the singleton", () => {
    const methods = [
      // index
      "addInitCallback",
      "init",
      "registerUrlChangedEventListener",
      //logout
      "logout",
      // mode
      "setMode",
      // refresh
      "refresh",
      // signon
      "login",
      "getSession",
      "resetPassword",
      "updatePassword",
      "sendLoginLink",
      "sendResetLink",
      "sendVerificationCode",
      "signup",
      // url
      "redirectIfLoggedIn",
      "redirectIfLoggedOut",
    ];
    methods.forEach((method) => {
      it(`should have Userfront.${method}()`, () => {
        expect(Userfront[method]).not.toBeUndefined();
        expect(typeof Userfront[method]).toEqual("function");
      });
    });
  });

  describe("should export proper methods on the user object", () => {
    const methods = ["update", "updatePassword", "hasRole", "getTotp"];
    methods.forEach((method) => {
      it(`should have Userfront.user.${method}()`, () => {
        expect(Userfront.user[method]).not.toBeUndefined();
        expect(typeof Userfront.user[method]).toEqual("function");
      });
    });
  });
});
