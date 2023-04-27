import Userfront from "../src/index.js";
import {
  getCookieOptionsByName,
  getCookieOptionsByTokenType,
  setCookieOptionsByName,
  setCookieOptionsByTokenType,
  TokenCookieStoredValue,
  ComputedValue,
  ReadonlyTokenDerivedValue,
  store,
  _resetStore,
  clearAllCookieOptions
} from "../src/store.js";
import {
  removeTokenCookies,
  setCookies,
  createAccessToken,
  createIdToken,
  createRefreshToken,
  idTokenUserDefaults,
  defaultIdTokenProperties
} from "./config/utils.js";
import Cookies from "js-cookie";

const tenantId = "store-spec-tenant";

describe("/store.js", () => {
  beforeEach(() => {
    removeTokenCookies(tenantId);
    _resetStore();
    clearAllCookieOptions();
    Userfront.init(tenantId);
  })
  describe("cookie helpers", () => {
    it("should set and get cookie options by name", () => {
      const options = {
        secure: true,
        sameSite: "None",
        expires: 1
      };

      setCookieOptionsByName("test-cookie-1", options);
      const retrieved = getCookieOptionsByName("test-cookie-1");

      expect(retrieved).toEqual(options);
    })
    it("should set and get cookie options by token type", () => {
      const options = {
        secure: false,
        sameSite: "Strict",
        expires: 2
      }

      setCookieOptionsByTokenType("access", options);
      const retrieved = getCookieOptionsByTokenType("access");

      expect(retrieved).toEqual(options);
    })
    it("should get default cookie options for access and id tokens", () => {
      const expected = {
        secure: true,
        sameSite: "Lax"
      }

      const accessOptions = getCookieOptionsByTokenType("access");
      const idOptions = getCookieOptionsByTokenType("id")

      expect(accessOptions).toEqual(expected);
      expect(idOptions).toEqual(expected);
    })
    it("should get default cookie options for refresh tokens", () => {
      const expected = {
        secure: true,
        sameSite: "Strict"
      }

      const refreshOptions = getCookieOptionsByTokenType("refresh");

      expect(refreshOptions).toEqual(expected);
    })
  })
  describe("store - tokens", () => {
    it("should get a token value from an existing cookie", () => {
      const accessToken = createAccessToken();
      const idToken = createIdToken();
      const refreshToken = createRefreshToken();
      setCookies([
        {
          name: `access.${tenantId}`,
          value: accessToken,
          options: {}
        },
        {
          name: `id.${tenantId}`,
          value: idToken,
          options: {}
        },
        {
          name: `refresh.${tenantId}`,
          value: refreshToken,
          options: {}
        }
      ]);

      expect(store.tokens.accessToken).toEqual(accessToken);
      expect(store.tokens.idToken).toEqual(idToken);
      expect(store.tokens.refreshToken).toEqual(refreshToken);
    });
    it("should set a token value to an existing cookie", () => {
      const accessToken = createAccessToken();
      const idToken = createIdToken({ data: { changed: "no" }});
      const refreshToken = createRefreshToken();
      setCookies([
        {
          name: `access.${tenantId}`,
          value: accessToken,
          options: {}
        },
        {
          name: `id.${tenantId}`,
          value: idToken,
          options: {}
        },
        {
          name: `refresh.${tenantId}`,
          value: refreshToken,
          options: {}
        }
      ]);

      const newIdToken = createIdToken({ data: { changed: "yes" }});
      store.tokens.accessToken = newIdToken;

      expect(store.tokens.accessToken).toEqual(newIdToken);
      const cookie = Cookies.get(`access.${tenantId}`);
      expect(cookie).toEqual(newIdToken);
    })
    it("should remove an existing token cookie", () => {
      const accessToken = createAccessToken();
      const idToken = createIdToken();
      const refreshToken = createRefreshToken();
      setCookies([
        {
          name: `access.${tenantId}`,
          value: accessToken,
          options: {}
        },
        {
          name: `id.${tenantId}`,
          value: idToken,
          options: {}
        },
        {
          name: `refresh.${tenantId}`,
          value: refreshToken,
          options: {}
        }
      ]);

      const existingCookie = Cookies.get(`refresh.${tenantId}`);
      expect(existingCookie).toEqual(refreshToken);

      delete store.tokens.refreshToken;

      expect(store.tokens.refreshToken).toEqual(undefined);
      const cookie = Cookies.get(`refresh.${tenantId}`);
      expect(cookie).toEqual(undefined);
    })
    it("should create a new cookie on set", () => {
      const newCookie = createAccessToken();

      const existingCookie = Cookies.get(`access.${tenantId}`);
      expect(existingCookie).toEqual(undefined);
      
      store.tokens.accessToken = newCookie;

      expect(store.tokens.accessToken).toEqual(newCookie);
      const cookie = Cookies.get(`access.${tenantId}`);
      expect(cookie).toEqual(newCookie);
    })
    it("should get undefined from a non-existent cookie", () => {
      const existingCookie = Cookies.get(`access.${tenantId}`);
      expect(existingCookie).toEqual(undefined);

      expect(store.tokens.accessToken).toEqual(undefined);
      const cookie = Cookies.get(`access.${tenantId}`);
      expect(cookie).toEqual(undefined);
    })
    it("should do nothing when deleting a non-existent cookie", () => {
      const existingCookie = Cookies.get(`access.${tenantId}`);
      expect(existingCookie).toEqual(undefined);

      delete store.tokens.accessToken;

      expect(store.tokens.accessToken).toEqual(undefined);
      const cookie = Cookies.get(`access.${tenantId}`);
      expect(cookie).toEqual(undefined);
    })
    it("should get the expected token names", () => {
      expect(store.tokens.accessTokenName).toEqual(`access.${tenantId}`);
      expect(store.tokens.idTokenName).toEqual(`id.${tenantId}`);
      expect(store.tokens.refreshTokenName).toEqual(`refresh.${tenantId}`);
    })
  })
  describe("store - user", () => {
    beforeEach(() => {
      setCookies([
        {
          name: `access.${tenantId}`,
          value: createAccessToken(),
          options: {}
        },
        {
          name: `id.${tenantId}`,
          value: createIdToken(),
          options: {}
        },
        {
          name: `refresh.${tenantId}`,
          value: createRefreshToken(),
          options: {}
        }
      ]);
    });

    for (const prop of defaultIdTokenProperties) {
      it(`should get the ${prop} user property`, () => {
        expect(store.user[prop]).toEqual(idTokenUserDefaults[prop]);
      })
      it(`should not modify ${prop} if set`, () => {
        store.user[prop] = "unexpected";
        expect(store.user[prop]).toEqual(idTokenUserDefaults[prop]);
      })
      it(`should not modify ${prop} if deleted`, () => {
        delete store.user[prop];
        expect(store.user[prop]).toEqual(idTokenUserDefaults[prop])
      })
      it(`should return undefined for ${prop} if id token is not set`, () => {
        removeTokenCookies(tenantId);
        expect(store.user[prop]).toEqual(undefined);
      })
    }
  })
  describe("store object", () => {
    it("should set the expected methods on store.tokens", () => {
      expect(store.tokens.refresh).toBeInstanceOf(Function);
    })
    it("should set the expected methods on store.user", () => {
      expect(store.user.update).toBeInstanceOf(Function);
      expect(store.user.hasRole).toBeInstanceOf(Function);
      expect(store.user.updatePassword).toBeInstanceOf(Function);
      expect(store.user.getTotp).toBeInstanceOf(Function);
    })
  })
})
