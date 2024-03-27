import * as Pkce from "../src/pkce.js";

const NOW = Date.now();
const FUTURE = (NOW + 1000 * 60 * 5).toString(); // 5 minutes from now
const PAST = (NOW - 1000 * 60 * 5).toString(); // 5 minutes ago
vi.useFakeTimers({ now: NOW });

let localStorageData = {};

describe("PKCE service", () => {
  beforeEach(() => {
    global.Storage.prototype.setItem = vi.fn((key, value) => {
      localStorageData[key] = value;
    });
    global.Storage.prototype.getItem = vi.fn((key) => localStorageData[key]);
    global.Storage.prototype.removeItem = vi.fn(
      (key) => delete localStorageData[key]
    );
    Pkce.store.codeChallenge = "";
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("readPkceDataFromLocalStorage()", () => {
    it("should return the codeChallenge if it is set and unexpired", () => {
      localStorageData["uf_pkce_code_challenge"] = "some-challenge";
      localStorageData["uf_pkce_code_challenge_expiresAt"] = FUTURE;
      const codeChallenge = Pkce.readPkceDataFromLocalStorage();
      expect(codeChallenge).toEqual("some-challenge");
    });

    it("should not return the codeChallenge if it is expired", () => {
      localStorageData["uf_pkce_code_challenge"] = "some-challenge";
      localStorageData["uf_pkce_code_challenge_expiresAt"] = PAST;
      const codeChallenge = Pkce.readPkceDataFromLocalStorage();
      expect(codeChallenge).toBeFalsy();
    });

    it("should not return a codeChallenge if none is set", () => {
      const codeChallenge = Pkce.readPkceDataFromLocalStorage();
      expect(codeChallenge).toBeFalsy();
    });
  });

  describe("writePkceDataToLocalStorage()", () => {
    it("should write the codeChallenge and expiry", () => {
      Pkce.writePkceDataToLocalStorage("test-challenge");
      expect(localStorageData["uf_pkce_code_challenge"]).toEqual(
        "test-challenge"
      );
      expect(localStorageData["uf_pkce_code_challenge_expiresAt"].toString()).toEqual(
        FUTURE
      );
    });

    it("should clear data if no codeChallenge is provided", () => {
      localStorageData["uf_pkce_code_challenge"] = "some-challenge";
      localStorageData["uf_pkce_code_challenge_expiresAt"] = PAST;
      Pkce.writePkceDataToLocalStorage("");
      expect(localStorageData["uf_pkce_code_challenge"]).toBeFalsy();
      expect(localStorageData["uf_pkce_code_challenge_expiresAt"]).toBeFalsy();
    });
  });

  describe("clearPkceDataFromLocalStorage()", () => {
    it("should clear the PKCE data from local storage", () => {
      localStorageData["uf_pkce_code_challenge"] = "some-challenge";
      localStorageData["uf_pkce_code_challenge_expiresAt"] = PAST;
      Pkce.clearPkceDataFromLocalStorage();
      expect(localStorageData["uf_pkce_code_challenge"]).toBeFalsy();
      expect(localStorageData["uf_pkce_code_challenge_expiresAt"]).toBeFalsy();
    });
    it("should no-op if there is no PKCE data in local storage", () => {
      Pkce.clearPkceDataFromLocalStorage();
      expect(localStorageData["uf_pkce_code_challenge"]).toBeFalsy();
      expect(localStorageData["uf_pkce_code_challenge_expiresAt"]).toBeFalsy();
    });
  });

  describe("setupPkce", () => {
    beforeEach(() => {
      window.history.pushState({}, "Title", "/login");
    });

    it("should set the codeChallenge from query params, if it's the only query param", () => {
      window.history.pushState(
        {},
        "Title",
        "/some/path?code_challenge=test-challenge"
      );
      Pkce.setupPkce();
      expect(Pkce.store.codeChallenge).toEqual("test-challenge");
    });

    it("should set the codeChallenge from query params, with a more complex url", () => {
      window.history.pushState(
        {},
        "Title",
        "/some/path?query=param&query2=param2&code_challenge=test-challenge&query3=param3#anchor"
      );
      Pkce.setupPkce();
      expect(Pkce.store.codeChallenge).toEqual("test-challenge");
    });

    it("should set the codeChallenge from query params, even if an unexpired one is in localStorage", () => {
      localStorageData["uf_pkce_code_challenge"] = "existing-challenge";
      localStorageData["uf_pkce_code_challenge_expiresAt"] = (
        NOW + 10000
      ).toString();
      window.history.pushState(
        {},
        "Title",
        "/some/path?code_challenge=new-challenge"
      );
      Pkce.setupPkce();
      expect(localStorageData["uf_pkce_code_challenge"]).toEqual(
        "new-challenge"
      );
      expect(
        localStorageData["uf_pkce_code_challenge_expiresAt"].toString()
      ).toEqual(FUTURE);
      expect(Pkce.store.codeChallenge).toEqual("new-challenge");
    });

    it("should set the codeChallenge from localStorage, if an unexpired one is present", () => {
      localStorageData["uf_pkce_code_challenge"] = "existing-challenge";
      localStorageData["uf_pkce_code_challenge_expiresAt"] = FUTURE;

      window.history.pushState({}, "Title", "/some/path");
      Pkce.setupPkce();
      expect(localStorageData["uf_pkce_code_challenge"]).toEqual(
        "existing-challenge"
      );
      expect(localStorageData["uf_pkce_code_challenge_expiresAt"]).toEqual(
        FUTURE
      );
      expect(Pkce.store.codeChallenge).toEqual("existing-challenge");
    });

    it("should clear the codeChallenge from localStorage if it is expired", () => {
      localStorageData["uf_pkce_code_challenge"] = "old-challenge";
      localStorageData["uf_pkce_code_challenge_expiresAt"] = PAST;
      Pkce.setupPkce();
      expect(localStorageData["uf_pkce_code_challenge"]).toBeFalsy();
      expect(localStorageData["uf_pkce_code_challenge_expiresAt"]).toBeFalsy();
      expect(Pkce.store.codeChallenge).toEqual("");
    });

    it("should clear stray data from localStorage if there is no codeChallenge to read", () => {
      // expiresAt is the only possibly stray data, though if it's present without a codeChallenge,
      // something unexpected has happened
      localStorageData["uf_pkce_code_challenge_expiresAt"] = FUTURE;
      Pkce.setupPkce();
      expect(localStorageData["uf_pkce_code_challenge"]).toBeFalsy();
      expect(localStorageData["uf_pkce_code_challenge_expiresAt"]).toBeFalsy();
      expect(Pkce.store.codeChallenge).toEqual("");
    });
  });

  describe("getPkceRequestQueryParams", () => {
    it("should return a URLSearchParams with code_challenge if one is present", () => {
      Pkce.store.codeChallenge = "another-challenge";
      const params = Pkce.getPkceRequestQueryParams();
      expect(params["code_challenge"]).toEqual("another-challenge");
    });

    it("should return an empty URLSearchParams with code_challenge if one is not present", () => {
      Pkce.store.codeChallenge = "";
      const params = Pkce.getPkceRequestQueryParams();
      expect(params["code_challenge"]).toBeFalsy();
    });
  });

  describe("defaultHandlePkceRequired", () => {
    beforeEach(() => {
      vi.stubGlobal("location", { assign: vi.fn() });
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    })
    it("should redirect if PKCE is in use and and authorization code is returned", () => {
      Pkce.store.codeChallenge = "test-challenge";
      Pkce.defaultHandlePkceRequired(
        "auth-code",
        "https://www.example.com/redirect"
      );
      expect(window.location.assign).toHaveBeenCalledWith(
        "https://www.example.com/redirect?authorization_code=auth-code"
      );
    });

    it("should not redirect if no URL is given", () => {
      Pkce.store.codeChallenge = "test-challenge";
      Pkce.defaultHandlePkceRequired("auth-code", "");
      expect(window.location.assign).not.toBeCalled();
    });

    it("should not redirect if no authorization code is given", () => {
      Pkce.store.codeChallenge = "test-challenge";
      Pkce.defaultHandlePkceRequired("", "https://www.example.com/redirect");
      expect(window.location.assign).not.toBeCalled();
    });

    it("should redirect to mobile app deep link-ish URLs", () => {
      Pkce.store.codeChallenge = "test-challenge";
      Pkce.defaultHandlePkceRequired("auth-code", "my-app:/some/redirect");
      expect(window.location.assign).toHaveBeenCalledWith(
        "my-app:/some/redirect?authorization_code=auth-code"
      );
    });
  });
});
