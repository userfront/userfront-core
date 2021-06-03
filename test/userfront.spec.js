import axios from "axios";

import Userfront from "../src/index.js";
import constants from "../src/constants.js";
const { apiUrl } = constants;

/**
 * Using Rewire, we can get an unexported function from our module:
 * const signupWithSSO = Userfront.__get__("signupWithSSO");
 *
 * and also set a function this way:
 * const mockFn = jest.fn()
 * Userfront.__set__("signupWithSSO", mockFn);
 */

jest.mock("axios");
const tenantId = "abcdefg";
Userfront.init(tenantId);

// Using `window.location.assign` rather than `window.location.href =` because
// JSDOM throws an error "Error: Not implemented: navigation (except hash changes)"
// JSDOM complains about this is because JSDOM does not implement methods like window.alert, window.location.assign, etc.
// https://stackoverflow.com/a/54477957
delete window.location;
window.location = {
  assign: jest.fn(),
  origin: "https://example.com",
  href: "https://example.com/login",
};

describe("addInitCallback", () => {
  it("should add callbacks that are fired when Userfront.init(tenantId) is called", () => {
    const tenantId = "a9b8c7d6";
    const callbackA = jest.fn();
    const callbackB = jest.fn();

    // Add callbacks
    Userfront.addInitCallback(callbackA);
    Userfront.addInitCallback(callbackB);

    // Call Userfront.init()
    Userfront.init(tenantId);

    // Assert that callbacks were called
    expect(callbackA).toHaveBeenCalled();
    expect(callbackA).toHaveBeenCalledWith({ tenantId });
    expect(callbackB).toHaveBeenCalled();
    expect(callbackB).toHaveBeenCalledWith({ tenantId });

    // Calling Userfront.init() again should not call the callbacks again
    jest.clearAllMocks();
    Userfront.init(tenantId);

    expect(callbackA).not.toHaveBeenCalled();
    expect(callbackB).not.toHaveBeenCalled();
  });
});

describe("signupWithSSO", () => {
  const provider = "github";
  const loginUrl = `https://api.userfront.com/v0/auth/${provider}/login`;

  beforeAll(() => {
    // Expose non-exported function
    Userfront.signupWithSSO = Userfront.__get__("signupWithSSO");

    // Mock getProviderLink
    Userfront.__set__(
      "getProviderLink",
      jest.fn(() => loginUrl)
    );
    Userfront.getProviderLink = Userfront.__get__("getProviderLink");
  });

  afterAll(() => {
    // Revert getProviderLink
    Userfront.__ResetDependency__("getProviderLink");
    Userfront.getProviderLink = Userfront.__get__("getProviderLink");
    window.location.assign.mockClear();
  });

  it("should throw if provider is missing", () => {
    expect(() => Userfront.signupWithSSO()).toThrow("Missing provider");
    expect(Userfront.getProviderLink).not.toHaveBeenCalled();
  });

  it("should get provider link and redirect", () => {
    Userfront.signupWithSSO(provider);

    // Assert getProviderLink was called and user is redirected
    expect(Userfront.getProviderLink).toHaveBeenCalledTimes(1);
    expect(Userfront.getProviderLink).toHaveBeenCalledWith(provider);
    expect(window.location.assign).toHaveBeenCalledTimes(1);
    expect(window.location.assign).toHaveBeenCalledWith(loginUrl);
  });
});

describe("loginWithSSO", () => {
  const provider = "github";
  const loginUrl = `https://api.userfront.com/v0/auth/${provider}/login`;

  beforeAll(() => {
    // Expose non-exported function
    Userfront.loginWithSSO = Userfront.__get__("loginWithSSO");

    // Mock getProviderLink
    Userfront.__set__(
      "getProviderLink",
      jest.fn(() => loginUrl)
    );
    Userfront.getProviderLink = Userfront.__get__("getProviderLink");
  });

  afterAll(() => {
    // Revert getProviderLink
    Userfront.__ResetDependency__("getProviderLink");
    Userfront.getProviderLink = Userfront.__get__("getProviderLink");
    window.location.assign.mockClear();
  });

  it("should throw if provider is missing", () => {
    expect(() => Userfront.loginWithSSO()).toThrow("Missing provider");
    expect(Userfront.getProviderLink).not.toHaveBeenCalled();
  });

  it("should get provider link and redirect", () => {
    Userfront.loginWithSSO(provider);

    // Assert getProviderLink was called and user is redirected
    expect(Userfront.getProviderLink).toHaveBeenCalledTimes(1);
    expect(Userfront.getProviderLink).toHaveBeenCalledWith(provider);
    expect(window.location.assign).toHaveBeenCalledTimes(1);
    expect(window.location.assign).toHaveBeenCalledWith(loginUrl);
  });
});

describe("getProviderLink", () => {
  const provider = "github";
  let loginUrl =
    `https://api.userfront.com/v0/auth/${provider}/login?` +
    `tenant_id=${tenantId}&` +
    `origin=${window.location.origin}`;

  it("should throw if provider is missing", () => {
    expect(() => Userfront.getProviderLink()).toThrow("Missing provider");
  });

  it("should throw if tenant ID is missing", () => {
    Userfront.store.tenantId = "";
    expect(() => Userfront.getProviderLink(provider)).toThrow(
      "Missing tenant ID"
    );

    // Revert tenantId
    Userfront.store.tenantId = tenantId;
  });

  it("should return link with correct tenant_id, and origin", () => {
    window.location.href = "https://example.com/login";

    const url = Userfront.getProviderLink(provider);
    expect(getQueryAttr(url, "tenant_id")).toEqual(tenantId);
    expect(getQueryAttr(url, "origin")).toEqual(window.location.origin);
    expect(getQueryAttr(url, "redirect")).toBeUndefined();
    expect(url).toEqual(loginUrl);
  });

  it("should return link with redirect if provided", () => {
    window.location.href += `?redirect=%2Fdashboard`;

    const redirectParam = encodeURIComponent(
      getQueryAttr(window.location.href, "redirect")
    );
    loginUrl += `&redirect=${redirectParam}`;

    const url = Userfront.getProviderLink(provider);
    expect(getQueryAttr(url, "tenant_id")).toEqual(tenantId);
    expect(getQueryAttr(url, "origin")).toEqual(window.location.origin);
    expect(getQueryAttr(url, "redirect")).toEqual("/dashboard");
    expect(url).toEqual(loginUrl);
  });
});

describe("redirectIfLoggedIn", () => {
  const mockAccessToken = "mockAccessToken";

  beforeAll(() => {
    // Mock removeAllCookies
    Userfront.__set__("removeAllCookies", jest.fn());
    Userfront.removeAllCookies = Userfront.__get__("removeAllCookies");

    // Set default href
    window.location.href = "https://example.com/login";
  });

  it("should call removeAllCookies if store.accessToken isn't defined", async () => {
    await Userfront.redirectIfLoggedIn();
    expect(Userfront.removeAllCookies).toHaveBeenCalledTimes(1);

    // Should not have made request to Userfront API or redirected the user
    expect(axios.get).not.toHaveBeenCalled();
    expect(window.location.assign).not.toHaveBeenCalled();

    // Clear mock
    Userfront.removeAllCookies.mockClear();
  });

  it("should call removeAllCookies if request to Userfront API is an error", async () => {
    Userfront.setCookie(mockAccessToken, null, "access");
    Userfront.store.accessToken = mockAccessToken;

    axios.get.mockImplementationOnce(() => {
      throw new Error("Bad Request");
    });
    await Userfront.redirectIfLoggedIn();

    // Should have called Userfront API
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(`${apiUrl}self`, {
      headers: {
        authorization: `Bearer ${Userfront.store.accessToken}`,
      },
    });

    // Should have cleared cookies
    expect(Userfront.removeAllCookies).toHaveBeenCalledTimes(1);
    Userfront.removeAllCookies.mockClear();

    // Clear mock
    axios.get.mockReset();
  });

  it("should not make request to Userfront API and immediately redirect user to path defined in `redirect` param", async () => {
    Userfront.setCookie(mockAccessToken, null, "access");
    Userfront.store.accessToken = mockAccessToken;
    const originalHref = window.location.href;

    // Append ?redirect= override path
    const targetPath = "/target/path";
    window.location.href = `https://example.com/login?redirect=${targetPath}`;

    await Userfront.redirectIfLoggedIn();

    // Should redirected immediately without calling Userfront API
    expect(Userfront.removeAllCookies).not.toHaveBeenCalled();
    expect(axios.get).not.toHaveBeenCalled();
    expect(window.location.assign).toHaveBeenCalledTimes(1);
    expect(window.location.assign).toHaveBeenCalledWith(targetPath);

    // Revert href and clear mock
    window.location.href = originalHref;
    window.location.assign.mockClear();
  });

  it("should make request to Userfront API and redirect user to tenant's loginRedirectPath when `redirect` param is not specified", async () => {
    Userfront.setCookie(mockAccessToken, null, "access");
    Userfront.store.accessToken = mockAccessToken;
    const originalHref = window.location.href;

    const loginRedirectPath = "/after/login/path";
    axios.get.mockResolvedValue({
      data: {
        userId: 1,
        tenantId,
        name: "John Doe",
        tenant: {
          tenantId,
          name: "Project Foo",
          loginRedirectPath,
          logoutRedirectPath: "/login",
        },
      },
    });

    await Userfront.redirectIfLoggedIn();

    // Should have made request to Userfront API without error
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(`${apiUrl}self`, {
      headers: {
        authorization: `Bearer ${Userfront.store.accessToken}`,
      },
    });
    expect(Userfront.removeAllCookies).not.toHaveBeenCalled();

    // Was redirected to tenant's loginRedirectPath
    expect(window.location.assign).toHaveBeenCalledTimes(1);
    expect(window.location.assign).toHaveBeenCalledWith(loginRedirectPath);

    // Revert href and clear mock
    window.location.href = originalHref;
    window.location.assign.mockClear();
  });
});

function getQueryAttr(url, attrName) {
  if (!url || url.indexOf(`${attrName}=`) < 0) {
    return;
  }
  return decodeURIComponent(url.split(`${attrName}=`)[1].split("&")[0]);
}
