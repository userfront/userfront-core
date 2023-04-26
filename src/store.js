import Cookies from "js-cookie";
import { removeCookie } from "./cookies.js";
import { getJwtPayload } from "./utils.js";
import { update, hasRole } from "./user.js";
import { updatePassword } from "./password.js";
import { getTotp } from "./totp.js";
import { refresh } from "./refresh.js";

const store = {
  mode: "live",
  tenantId: ""
};

/*
 * TOKEN STORE
 * Interact with tokens, backed by cookies
 */

/*
 * Track cookie options (secure, sameSite, expiry) by type and name
 */
const cookieOptions = {}
const defaultCookieOptions = Object.freeze({
  secure: store.mode === "live",
  sameSite: "Lax"
});
const defaultRefreshTokenCookieOptions = Object.freeze({
  sameSite: "Strict"
});
const defaultCookieOptionsByTokenType = {
  access: defaultCookieOptions,
  id: defaultCookieOptions,
  refresh: defaultRefreshTokenCookieOptions
}

/**
 * Create a function that returns the name for a JWT cookie by type for the current tenant
 * @param {string} type 
 * @returns {function}
 */
const getTokenCookieName = type => () => {
  if (!store.tenantId) {
    console.warn("@userfront/core getTokenCookieName: tried to get a token cookie's name without a tenant ID set.");
    return "";
  }
  return `${type}.${store.tenantId}`;
}

/**
 * Get cookie options for a particular cookie
 * @param {string} cookieName name of cookie
 * @param {string} tokenType if a JWT cookie, the type (access, id, refresh)
 * @returns 
 */
export function getCookieOptionsByName(cookieName, tokenType = "") {
  const storedOptions = cookieOptions[cookieName];
  if (storedOptions && type && defaultCookieOptionsByTokenType[tokenType]) {
    return Object.assign({}, defaultCookieOptionsByTokenType[tokenType], storedOptions);
  }
  if (storedOptions) {
    return Object.assign({}, defaultCookieOptions, storedOptions);
  }
  return Object.assign({}, defaultCookieOptions);
}

/**
 * Get cookie options for a JWT cookie for the current tenant
 * @param {string} tokenType JWT type (access, id, refresh)
 * @returns 
 */
export function getCookieOptionsByTokenType(tokenType) {
  return getCookieOptionsByName(getTokenCookieName(tokenType), tokenType);
}

/**
 * Set cookie options for a cookie by name
 * @param {string} cookieName 
 * @param {object} options 
 * @property {string} options.secure
 * @property {string} options.sameSite
 * @property {number} options.expires
 * @property {string} options.path
 * @property {string} options.domain
 * @returns 
 */
export function setCookieOptionsByName(cookieName, options = {}) {
  if (!cookieName) {
    console.warn("@userfront/core setCookieOptionsByName: tried to set cookie options without a cookie name.");
    return;
  }
  cookieOptions[cookieName] = Object.freeze(options);
}

/**
 * Set cookie options for a JWT cookie by type, for the current tenant
 * @param {string} cookieName 
 * @param {object} options 
 * @property {string} options.secure
 * @property {string} options.sameSite
 * @property {number} options.expires
 * @property {string} options.path
 * @property {string} options.domain
 * @returns 
 */
export function setCookieOptionsByTokenType(tokenType, options = {}) {
  return setCookieOptionsByName(getTokenCookieName(tokenType), options);
}

/**
 * An interface for a value stored in cookies, with fallback to memory outside the browser
 */
class TokenCookieStoredValue {
  /**
   * 
   * @param {string | function} cookieName name of the cookie backing this store, or function that returns the name
   * @param {string?} tokenType if a JWT token, its type: access, id, refresh
   * @param {object?} observers callbacks to call on certain events
   * @property {function} observers.set
   * @property {function} observers.delete
   * @returns 
   */
  constructor(tokenType) {
    this._useMemory = false;
    if (!tokenType) {
      console.warn("@userfront/core TokenCookieStoredValue: tried to create a cookie-backed token value, but no token type was specified. Falling back to memory.")
      this._useMemory = true;
    }
    this.tokenType = tokenType.toString().trim();

    // Fall back to memory store outside of browser
    if (typeof window === "undefined") {
      console.debug("@userfront/core TokenCookieStoredValue :: tried to create cookie-backed value outside a browser. Falling back to memory-only value.")
      this._useMemory = true;
      this._val = undefined;
      return;
    }
  }

  // Get the backing cookie's name
  _getName() {
    // No name for a memory store
    if (this._useMemory) {
      return;
    }
    // No name if there's no tenant ID set
    if (!store.tenantId) {
      console.warn("@userfront/core TokenCookieStoredValue::_getName(): tried to interact with a cookie-backed token value, but store.tenantId is absent, so we don't know the cookie's name.")
      throw new Error("@userfront/core TokenCookieStoredValue::_getName(): a tenant ID is needed for this operation, but no tenant ID is set. Ensure Userfront.init(`my-tenant-id`) is called before using any other Userfront methods.")
    }

    return `${this.tokenType}.${store.tenantId.trim()}`;
  }

  /**
   * Get the current value
   * @returns {string}
   */
  get() {
    const name = this._getName();
    if (this._useMemory || !name) {
      return this._val;
    }
    const val = Cookies.get(name);
    return val;
  }

  /**
   * Set the value. Updates cookie options as needed.
   * @param {string} val 
   * @returns {string} the new value
   */
  set(val) {
    const name = this._getName();
    if (this._useMemory || !name) {
      this._val = val;
      return val;
    }
    
    if (val == null) {
      removeCookie(name);
      return;
    }
    const options = getCookieOptionsByName(this._getName(), this.tokenType);
    Cookies.set(name, val, options);
    return val;
  }

  /**
   * Delete the current value, removing it from the browser's cookies.
   */
  delete() {
    const name = this._getName();
    if (this._useMemory || !name) {
      return this._val = undefined;
    }
    
    removeCookie(name);
  }
}

/**
 * A simple interface for a computed value (matching the TokenCookieStoredValue interface)
 */
class ComputedValue {
  constructor(compute) {
    this.compute = compute;
  }

  get() {
    return this.compute();
  }

  set(val) {
    return val;
  }

  delete() { }
}

// Usage note: it's ok to add additional properties to the returned "friendly store" after creating it,
// but not to add additional properties to the underlying store.
// Good:
//   const tokenStore = { accessToken: new TokenCookieStoredValue("access") }
//   const store = makeFriendlyStore(tokenStore)
//   store.sayHi = () => console.log("hi")
//   store.sayHi() // console: hi
//
// Not good:
//   const tokenStore = {
//     accessToken: new TokenCookieStoredValue("access"),
//     sayHi: () => console.log("hi")
//   }
//   const store = makeFriendlyStore(tokenStore)
//   store.sayHi() // error: could not read property "get" of ...

/**
 * Given a store where every value is an object with get(), set() and delete() methods,
 * create a "friendly" store where `x = store.key`, `store.key = x`, and `delete store.key`
 * are proxied through to those methods, respectively. Allows defining how to get/set/delete
 * a value without exposing that to store consumers.
 * 
 * @param {object} store an object whose values are objects with get(), set() and delete() methods
 * @returns {object} an object where ordinary get, set and delete are proxied through to those methods
 */
export function makeFriendlyStore(store) {
  // The store.tokens object is a Proxy over the underlying store,
  // so it can overload the get, set etc. operations
  const proxyConfig = {
    // proxy.accessToken ->
    // store.accessToken.get()
    get(target, key) {
      if (key in store) {
        return store[key].get();
      }
      return Reflect.get(...arguments);
    },

    // proxy.accessToken = "foo" ->
    // store.accessToken.set("foo")
    set(target, key, value) {
      if (key in store) {
        store[key].set(value);
        return true;
      }
      return Reflect.set(...arguments);
    },

    // delete proxy.accessToken ->
    // store.tokens.accessToken.delete()
    deleteProperty(target, key) {
      if (key in store) {
        store[key].delete();
        return true;
      }
      return Reflect.deleteProperty(...arguments);
    },

    // The last two proxy traps are to ensure the proxy has the expected
    // behavior when a client examines or manipulates the object

    // Object.getOwnPropertyDescriptor(store.tokens, "accessToken") ->
    //   { configurable: true, enumerable: true, value: store.accessTokens.get() }
    getOwnPropertyDescriptor(target, key) {
      if (key in store) {
        return {
          configurable: true,
          enumerable: true,
          value: store[key].get()
        };
      }
      return Reflect.getOwnPropertyDescriptor(...arguments);
    },

    // Include store fields in Object.keys(proxy.tokens) and methods that rely on it
    ownKeys(target) {
      return [
        ...Reflect.ownKeys(target),
        ...Object.keys(store)
      ];
    }
  }
  return new Proxy({}, proxyConfig);
}

// The underlying token store, with tokens stored in cookies and the token names as computed values
const tokenStore = {
  accessToken: new TokenCookieStoredValue("access"),
  idToken: new TokenCookieStoredValue("id"),
  refreshToken: new TokenCookieStoredValue("refresh"),
  accessTokenName: new ComputedValue(getTokenCookieName("access")),
  idTokenName: new ComputedValue(getTokenCookieName("id")),
  refreshTokenName: new ComputedValue(getTokenCookieName("refresh"))
}

store.tokens = makeFriendlyStore(tokenStore);
store.tokens.refresh = refresh;

/**
 * Define the store.user object based on the ID token
 */
// export function setUser() {
//   if (!store.tokens.idToken) {
//     return console.warn("Cannot define user: missing ID token");
//   }

//   store.user = store.user || {};
//   const idTokenPayload = getJwtPayload(store.tokens.idToken);

//   // Set basic user information properties from ID token
//   const propsToDefine = [
//     "email",
//     "phoneNumber",
//     "username",
//     "name",
//     "image",
//     "data",
//     "confirmedAt",
//     "createdAt",
//     "updatedAt",
//     "mode",
//     "userId",
//     "userUuid",
//     "tenantId",
//     "isConfirmed",
//   ];
//   for (const prop of propsToDefine) {
//     if (prop === "update") return;
//     store.user[prop] = idTokenPayload[prop];
//   }
// }

// /**
//  * Remove all user information
//  */
// export function unsetUser() {
//   for (const attr in store.user) {
//     if (typeof store.user[attr] !== "function") {
//       delete store.user[attr];
//     }
//   }
// }

/*
 * USER STORE
 * Interact with user data, backed by token store (which is backed by cookies)
 */

class ReadonlyTokenDerivedValue {
  constructor(tokenValue, valueKey) {
    this.tokenValue = tokenValue;
    this.valueKey = valueKey;
  }

  get() {
    if (!this.tokenValue) {
      console.error(`@userfront/core ReadonlyTokenDerivedValue: Tried to get value ${this.valueKey} from a token, but the token is empty.`);
      return;
    }
    if (!this.tokenValue.get) {
      console.error(`@userfront/core ReadonlyTokenDerivedValue: Tried to get value ${this.valueKey} from a token, but the token lacks a get() method. (Be sure to initialize this with an underlying get-set stored value, not its "friendly" proxied store.)`);
    }
    const token = this.tokenValue.get();
    if (!token) {
      return undefined;
    }
    const idTokenPayload = getJwtPayload(token);
    return idTokenPayload[this.valueKey];
  }

  set(val) {
    console.warn(`@userfront/core ReadonlyTokenDerivedValue: Tried to set readonly property ${this.valueKey} of a token.`)
    return val;
  }

  delete() {
    console.warn(`@userfront/core ReadonlyTokenDerivedValue: Tried to delete readonly property ${this.valueKey} of a token.`)
  }
}

const userStore = {}
const userProps = [
  "email",
  "phoneNumber",
  "username",
  "name",
  "image",
  "data",
  "confirmedAt",
  "createdAt",
  "updatedAt",
  "mode",
  "userId",
  "userUuid",
  "tenantId",
  "isConfirmed",
];
for (const prop of userProps) {
  userStore[prop] = new ReadonlyTokenDerivedValue(tokenStore.idToken, prop)
}

store.user = makeFriendlyStore(userStore);

/**
 * Add methods to the store.user object
 */
store.user.update = update;
store.user.hasRole = hasRole;
store.user.updatePassword = updatePassword;
store.user.getTotp = getTotp;

export { store };
