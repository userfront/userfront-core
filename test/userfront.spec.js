import Userfront from "../src/index.js";

/**
 * Using Rewire, we can get an unexported function from our module:
 * const signupWithSSO = Userfront.__get__("signupWithSSO");
 *
 * and also set a function this way:
 * const mockFn = jest.fn()
 * Userfront.__set__("signupWithSSO", mockFn);
 */

const tenantId = "abcdefg";
Userfront.init(tenantId);

describe("signupWithSSO", () => {
  it("should throw if provider is missing", () => {
    Userfront.signupWithSSO = Userfront.__get__("signupWithSSO");

    expect(() => Userfront.signupWithSSO()).toThrowError(
      new Error("Missing provider")
    );
  });
});

describe("loginWithSSO", () => {
  it("should throw if provider is missing", () => {
    Userfront.loginWithSSO = Userfront.__get__("loginWithSSO");

    expect(() => Userfront.loginWithSSO()).toThrowError(
      new Error("Missing provider")
    );
  });
});

describe("getProviderLink", () => {
  it("should throw if provider is missing", () => {
    Userfront.getProviderLink = Userfront.__get__("getProviderLink");

    expect(() => {
      return Userfront.getProviderLink();
    }).toThrowError(new Error("Missing provider"));
  });

  it("should throw if tenant ID is missing", () => {
    Userfront.getProviderLink = Userfront.__get__("getProviderLink");

    expect(() => {
      Userfront.store.tenantId = "";
      return Userfront.getProviderLink("google");
    }).toThrowError(new Error("Missing tenant ID"));
  });
});
