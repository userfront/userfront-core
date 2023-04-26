import Cookies from "js-cookie";
import { removeCookie } from "./cookies.js";
import { getJwtPayload } from "./utils.js";
import { update, hasRole } from "./user.js";
import { updatePassword } from "./password.js";
import { getTotp } from "./totp.js";
import { refresh } from "./refresh.js";
import { makeFriendlyStore } from "./store.utils.js";

// The store object that will eventually be exported
const store = {
  mode: "live",
  tenantId: ""
};


/*
 * TOKEN COOKIE HELPERS
 * Helpers for cookie names and options
 */

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

/*
 * Default cookie options (secure, sameSite, expiry) by type and name
 */
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

/* Currently defined cookie options by cookie name
 * example:
 *   cookieOptions = {
 *     "access.abcd1234": {
 *       secure: "true",
 *       sameSite: "Lax",
 *       expiry: 14
 *     }
 *   }
 * 
 * Usually we're only dealing with one set of tokens, so there
 * will only be entries for "access.tenantId", "id.tenantId", and "refresh.tenantId",
 * and it's more convenient to read/write with getCookieOptionsByTokenType()
 * and setCookieOptionsByTokenType().
 */ 
const cookieOptions = {}

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

/* NOTES ON STORE STRUCTURE AND GET/SET VALUE CLASSES
 *
 * Values in the store that are derived or computed, or where
 * additional work is needed to get/set/delete the value, are
 * tracked with "get/set value classes" below.
 * 
 * These classes all implement the same interface:
 */

/**
 * Interface for get/set value classes
 * @interface GetSetValue
 * 
 * Get the current value
 * @function
 * @name GetSetValue#get
 * @returns {any} The current value, or undefined if it's not set
 * 
 * Set the value.
 * For a read-only value, this is a no-op that will return undefined and log a warning.
 * @function
 * @name GetSetValue#set
 * @param {any} value Value to set
 * @returns {any} The value that was set
 * 
 * Delete the value.
 * For a read-only value, this is a no-op.
 * Intended to be proxied to the delete operator, but does not necessarily implement
 * the delete operator's contract:
 *   delete store.someValue; // proxied to underlying.someValue.delete()
 *   console.log("someValue" in store); // may still be true
 * This interface not designed for use cases where there's a distinction between
 * store.someValue === undefined and !("someValue" in store)
 * @function
 * @name GetSetValue#delete
 */


/*
 * TOKEN STORE IMPLEMENTATION
 * Interact with tokens, backed by cookies
 */

/**
 * An interface for a value stored in cookies, with fallback to memory outside the browser
 * @implements {GetSetValue}
 */
export class TokenCookieStoredValue {
  /**
   * Define an interface for a JWT token, backed by cookies (or in-memory outside a browser context).
   * Always refers to the current tenant's tokens (via store.tenantId).
   * @param {string?} tokenType if a JWT token, its type: access, id, refresh
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
 * @implements {GetSetValue}
 */
export class ComputedValue {
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

/*
 * TOKEN STORE DEFINITION
 */

// The underlying token store, with tokens stored in cookies and the token names as computed values
const tokenStore = {
  accessToken: new TokenCookieStoredValue("access"),
  idToken: new TokenCookieStoredValue("id"),
  refreshToken: new TokenCookieStoredValue("refresh"),
  accessTokenName: new ComputedValue(getTokenCookieName("access")),
  idTokenName: new ComputedValue(getTokenCookieName("id")),
  refreshTokenName: new ComputedValue(getTokenCookieName("refresh"))
}

/**
 * Create store.tokens and add methods to it
 * 
 * makeFriendlyStore() proxies operators to methods:
 *   const x = store.tokens.accessToken -> tokenStore.accessToken.get()
 *   store.tokens.accessToken = x -> tokenStore.accessToken.set(x)
 *   delete store.tokens.accessToken -> tokenStore.accessToken.delete()
 */
store.tokens = makeFriendlyStore(tokenStore);
store.tokens.refresh = refresh;

/*
 * USER STORE IMPLEMENTATION
 * Interact with user data, backed by token store (which is backed by cookies)
 */

/**
 * Interface for a read-only value derived from a token's TokenCookieStoredValue
 * @implements {GetSetValue}
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

/*
 * USER STORE DEFINITION
 */

// The underlying user store, with fields computed from the id token at time of access
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

/**
 * Create store.user and add methods to it
 * 
 * makeFriendlyStore() proxies operators to methods:
 *   const x = store.user.email -> userStore.email.get()
 *   store.user.email = x -> userStore.email.set(x)
 *   delete store.user.email -> userStore.email.delete()
 */
store.user = makeFriendlyStore(userStore);
store.user.update = update;
store.user.hasRole = hasRole;
store.user.updatePassword = updatePassword;
store.user.getTotp = getTotp;

export { store };
