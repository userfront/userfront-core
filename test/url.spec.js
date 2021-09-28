import Cookies from "js-cookie";
import axios from "axios";

import Userfront from "../src/index.js";

import { apiUrl } from "../src/constants.js";
import { removeAllCookies } from "../src/cookies.js";
import { store } from "../src/store.js";

jest.mock("../src/cookies.js", () => {
  return {
    __esModule: true,
    removeAllCookies: jest.fn(),
  };
});

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

describe("redirectIfLoggedIn", () => {
  const mockAccessToken = "mockAccessToken";

  beforeAll(() => {
    // Set default href
    window.location.href = "https://example.com/login";
  });

  afterEach(() => {
    Cookies.remove(`access.${tenantId}`);
    removeAllCookies.mockReset();
    window.location.assign.mockClear();
  });

  it("should call removeAllCookies if store.tokens.accessToken isn't defined", async () => {
    await Userfront.redirectIfLoggedIn();
    expect(removeAllCookies).toHaveBeenCalledTimes(1);

    // Should not have made request to Userfront API or redirected the user
    expect(axios.get).not.toHaveBeenCalled();
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it("should call removeAllCookies if request to Userfront API gives an error", async () => {
    Cookies.set(`access.${tenantId}`, mockAccessToken, {});

    store.tokens.accessToken = mockAccessToken;

    axios.get.mockImplementationOnce(() => {
      throw new Error("Bad Request");
    });
    await Userfront.redirectIfLoggedIn();

    // Should have called Userfront API
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(`${apiUrl}self`, {
      headers: {
        authorization: `Bearer ${store.tokens.accessToken}`,
      },
    });

    // Should have cleared cookies
    expect(removeAllCookies).toHaveBeenCalledTimes(1);

    // Clear mock
    axios.get.mockReset();
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
    expect(axios.get).not.toHaveBeenCalled();
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
    expect(axios.get).not.toHaveBeenCalled();
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
        authorization: `Bearer ${store.tokens.accessToken}`,
      },
    });
    expect(removeAllCookies).not.toHaveBeenCalled();

    // Was redirected to tenant's loginRedirectPath
    expect(window.location.assign).toHaveBeenCalledTimes(1);
    expect(window.location.assign).toHaveBeenCalledWith(loginRedirectPath);

    // Revert href
    window.location.href = originalHref;
  });
});
