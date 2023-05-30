import Cookies from "js-cookie";

import Userfront from "../src/index.js";
import api from "../src/api.js";
import { removeAllCookies } from "../src/cookies.js";
import { store } from "../src/store.js";
import { defaultHandleRedirect } from "../src/url.js";
import { createAccessToken, mockWindow } from "./config/utils.js";
import { store as pkceStore } from "../src/pkce.js";

jest.mock("../src/api.js");
jest.mock("../src/cookies.js");

const tenantId = "abcdefg";
Userfront.init(tenantId);

mockWindow({
  origin: "https://example.com",
  href: "https://example.com/login",
});

describe("defaultHandleRedirect()", () => {
  beforeEach(() => {
    window.location.href = "https://example.com/login";
    jest.resetAllMocks();
  });

  it("should redirect to a given path", () => {
    // Add querystring and data.redirectTo to ensure they are not used
    window.location.href = "https://example.com/login?redirect=/manual";
    const data = { redirectTo: "/api-response" };
    // Call defaultHandleRedirect() with manual path
    const path = "/manual-redirect";
    defaultHandleRedirect(path, data);
    expect(window.location.assign).toHaveBeenCalledWith(path);
  });

  it("should redirect based on URL querystring ?redirect", () => {
    // Add data.redirectTo to ensure it is not used
    const data = { redirectTo: "/api-response" };
    // Call defaultHandleRedirect()
    window.location.href = "https://example.com/login?redirect=/url-redirect";
    defaultHandleRedirect(undefined, data);
    expect(window.location.assign).toHaveBeenCalledWith("/url-redirect");
  });

  it("should redirect based on data.redirectTo", () => {
    const data = { redirectTo: "/api-redirect" };
    defaultHandleRedirect(undefined, data);
    expect(window.location.assign).toHaveBeenCalledWith(data.redirectTo);
  });

  it("should not redirect if redirect=false", () => {
    // Add querystring and data.redirectTo to ensure they are not used
    window.location.href = "https://example.com/login?redirect=/url-redirect";
    const data = { redirectTo: "/api-redirect" };
    // Call defaultHandleRedirect() with redirect=false
    defaultHandleRedirect(false, data);
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  describe("with redirect=true", () => {
    it("should redirect based on URL querystring ?redirect", () => {
      // Add data.redirectTo to ensure it is not used
      const data = { redirectTo: "/api-response" };
      // Call defaultHandleRedirect()
      window.location.href = "https://example.com/login?redirect=/url-redirect";
      defaultHandleRedirect(true, data);
      expect(window.location.assign).toHaveBeenCalledWith("/url-redirect");
    });

    it("should redirect based on data.redirectTo", () => {
      const data = { redirectTo: "/api-redirect" };
      defaultHandleRedirect(true, data);
      expect(window.location.assign).toHaveBeenCalledWith(data.redirectTo);
    });

    it("should redirect to / if no other redirect is given", () => {
      const data = {};
      defaultHandleRedirect(true, data);
      expect(window.location.assign).toHaveBeenCalledWith("/");
    });
  });
});

describe("redirectIfLoggedIn()", () => {
  const mockAccessToken = createAccessToken();

  beforeAll(() => {
    // Set default href
    window.location.href = "https://example.com/login";
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    Cookies.remove(`access.${tenantId}`);
    removeAllCookies.mockReset();
  });

  it("should call removeAllCookies if store.tokens.accessToken isn't defined", async () => {
    await Userfront.redirectIfLoggedIn();
    expect(removeAllCookies).toHaveBeenCalledTimes(1);

    // Should not have made request to Userfront API or redirected the user
    expect(api.get).not.toHaveBeenCalledWith("/self");
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it("should call removeAllCookies if request to Userfront API gives an error", async () => {
    Cookies.set(`access.${tenantId}`, mockAccessToken, {});

    store.tokens.accessToken = mockAccessToken;

    api.get.mockImplementationOnce(() => {
      throw new Error("Bad Request");
    });
    await Userfront.redirectIfLoggedIn();

    // Should have called Userfront API
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith(`/self`, {
      headers: {
        authorization: `Bearer ${store.tokens.accessToken}`,
      },
    });

    // Should have cleared cookies
    expect(removeAllCookies).toHaveBeenCalledTimes(1);

    // Clear mock
    api.get.mockReset();
  });

  it("should not make request to Userfront API and should immediately redirect to path defined in `redirect` url param", async () => {
    Cookies.set(`access.${tenantId}`, mockAccessToken, {});
    store.tokens.accessToken = mockAccessToken;
    const originalHref = window.location.href;

    // Append ?redirect= override path
    const targetPath = "/target/path";
    window.location.href = `https://example.com/login?redirect=${targetPath}`;

    await Userfront.redirectIfLoggedIn();

    // Should redirected immediately without calling Userfront API
    expect(removeAllCookies).not.toHaveBeenCalled();
    expect(api.get).not.toHaveBeenCalledWith("/self");
    expect(window.location.assign).toHaveBeenCalledTimes(1);
    expect(window.location.assign).toHaveBeenCalledWith(targetPath);

    // Revert href
    window.location.href = originalHref;
  });

  it("should not make request to Userfront API and should immediately redirect to path provided in options", async () => {
    Cookies.set(`access.${tenantId}`, mockAccessToken, {});
    store.tokens.accessToken = mockAccessToken;
    const originalHref = window.location.href;

    // Append ?redirect= override path
    const targetPath = "/custom/path";
    window.location.href = `https://example.com/login`;

    await Userfront.redirectIfLoggedIn({ redirect: targetPath });

    // Should redirected immediately without calling Userfront API
    expect(removeAllCookies).not.toHaveBeenCalled();
    expect(api.get).not.toHaveBeenCalledWith("/self");
    expect(window.location.assign).toHaveBeenCalledTimes(1);
    expect(window.location.assign).toHaveBeenCalledWith(targetPath);

    // Revert href and clear mock
    window.location.href = originalHref;
  });

  it("should make request to Userfront API and redirect user to tenant's loginRedirectPath when `redirect` url param is not specified", async () => {
    Cookies.set(`access.${tenantId}`, mockAccessToken, {});
    store.tokens.accessToken = mockAccessToken;
    const originalHref = window.location.href;

    const loginRedirectPath = "/after/login/path";
    api.get.mockResolvedValue({
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
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith(`/self`, {
      headers: {
        authorization: `Bearer ${store.tokens.accessToken}`,
      },
    });
    expect(removeAllCookies).not.toHaveBeenCalled();

    // Was redirected to tenant's loginRedirectPath
    expect(window.location.assign).toHaveBeenCalledTimes(1);
    expect(window.location.assign).toHaveBeenCalledWith(loginRedirectPath);

    // Revert href
    window.location.href = originalHref;

    // Clear mock
    api.get.mockReset();
  });

  // TODO see #130: change this test when we're able to use tokens to get an authorization code
  it("should not redirect if PKCE is in use", async () => {
    Cookies.set(`access.${tenantId}`, mockAccessToken, {});
    store.tokens.accessToken = mockAccessToken;

    // Signal that we should use PKCE for this session
    pkceStore.codeChallenge = "use-pkce";

    await Userfront.redirectIfLoggedIn();

    pkceStore.codeChallenge = "";

    // Should not have made request to Userfront API or redirected the user
    expect(api.get).not.toHaveBeenCalledWith("/self");
    expect(window.location.assign).not.toHaveBeenCalled();
  });
});

describe("redirectIfLoggedOut()", () => {
  beforeAll(() => {
    // Set default href
    window.location.href = "https://example.com/dashboard";
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    Cookies.remove(`access.${tenantId}`);
    removeAllCookies.mockReset();
  });

  it("should call removeAllCookies if store.tokens.accessToken isn't defined", async () => {
    store.tokens.accessToken = undefined;
    await Userfront.redirectIfLoggedOut();
    expect(removeAllCookies).toHaveBeenCalledTimes(1);

    // Should not have made request to Userfront API or redirected the user
    expect(api.get).not.toHaveBeenCalledWith("/self");
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it("should not make request to Userfront API and should immediately redirect to path defined in `redirect` url param", async () => {
    const originalHref = window.location.href;

    // Append ?redirect= override path
    const targetPath = "/target/path";
    window.location.href = `https://example.com/dashboard?redirect=${targetPath}`;

    await Userfront.redirectIfLoggedOut();

    // Should redirected immediately without calling Userfront API
    expect(removeAllCookies).toHaveBeenCalled();
    expect(api.get).not.toHaveBeenCalledWith("/self");
    expect(window.location.assign).toHaveBeenCalledTimes(1);
    expect(window.location.assign).toHaveBeenCalledWith(targetPath);

    // Revert href
    window.location.href = originalHref;
  });

  it("should not make request to Userfront API and should immediately redirect to path provided in options", async () => {
    const originalHref = window.location.href;

    // Append ?redirect= override path
    const targetPath = "/custom/path";
    window.location.href = `https://example.com/dashboard`;

    await Userfront.redirectIfLoggedOut({ redirect: targetPath });

    // Should redirected immediately without calling Userfront API
    expect(removeAllCookies).toHaveBeenCalled();
    expect(api.get).not.toHaveBeenCalledWith("/self");
    expect(window.location.assign).toHaveBeenCalledTimes(1);
    expect(window.location.assign).toHaveBeenCalledWith(targetPath);

    // Revert href and clear mock
    window.location.href = originalHref;
  });

  it("should do nothing when logged out and redirect path is not specified", async () => {
    const originalHref = window.location.href;
    window.location.href = `https://example.com/dashboard`;

    await Userfront.redirectIfLoggedOut();

    // Should have removed any remaining cookies
    expect(removeAllCookies).toHaveBeenCalled();

    // Should not have redirected
    expect(window.location.assign).not.toHaveBeenCalled();

    // Revert href
    window.location.href = originalHref;

    // Clear mock
    api.get.mockReset();
  });
});
