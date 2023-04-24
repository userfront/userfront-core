import Cookies from "js-cookie";
// import { setUser, unsetUser } from "./user.js";
import { removeCookie } from "./cookies.js";
import { getJwtPayload } from "./utils.js";

const store = {
  user: {},
  mode: "live",
  tenantId: ""
};



/**
 * Define the store.user object based on the ID token
 */
export function setUser() {
  if (!store.tokens.idToken) {
    return console.warn("Cannot define user: missing ID token");
  }

  store.user = store.user || {};
  const idTokenPayload = getJwtPayload(store.tokens.idToken);

  // Set basic user information properties from ID token
  const propsToDefine = [
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
  for (const prop of propsToDefine) {
    if (prop === "update") return;
    store.user[prop] = idTokenPayload[prop];
  }
}

/**
 * Remove all user information
 */
export function unsetUser() {
  for (const attr in store.user) {
    if (typeof store.user[attr] !== "function") {
      delete store.user[attr];
    }
  }
}

// class SyncStoredValue {
//   get() {
//     console.error("@userfront/core SyncStoredValue: get() must be implemented.")
//   }

//   set(val) {
//     console.error("@userfront/core SyncStoredValue: set() must be implemented.")
//   }

//   delete() {
//     console.debug("@userfront/core SyncStoredValue: delete() is not implemented.")
//   }
// }

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

const getTokenCookieName = type => () => {
  if (!store.tenantId) {
    console.warn("@userfront/core getTokenCookieName: tried to get a token cookie's name without a tenant ID set.");
    return "";
  }
  return `${type}.${store.tenantId}`;
}

export function getCookieOptionsByName(cookieName, tokenType = "") {
  const storedOptions = cookieOptions[cookieName];
  if (storedOptions && type && defaultCookieOptionsByTokenType[type]) {
    return Object.assign({}, defaultCookieOptionsByTokenType[type], storedOptions);
  }
  if (storedOptions) {
    return Object.assign({}, defaultCookieOptions, storedOptions);
  }
  return Object.assign({}, defaultCookieOptions);
}

export function getCookieOptionsByTokenType(type) {
  return getCookieOptionsByName(getTokenCookieName(type), type);
}

export function setCookieOptionsByName(cookieName, options = {}) {
  if (!cookieName) {
    console.warn("@userfront/core setCookieOptionsByName: tried to set cookie options without a cookie name.");
    return;
  }
  cookieOptions[cookieName] = Object.freeze(options);
}

export function setCookieOptionsByTokenType(type, options = {}) {
  return setCookieOptionsByName(getTokenCookieName(type), options);
}

class BrowserCookieStoredValue {
  constructor(cookieName, tokenType = "", observers = {}) {
    this._useMemory = false;
    this.tokenType = tokenType;
    this.observers = observers;
    if (typeof window === "undefined") {
      console.info("@userfront/core BrowserCookieStoredValue :: tried to create cookie-backed value outside a browser. Falling back to memory-only value.")
      this._useMemory = true;
      this._val = undefined;
      return;
    }
    if (typeof cookieName === "string") {
      this.cookieName = cookieName;
    } else if (typeof cookieName === "function") {
      this.getCookieName = cookieName;
    } else {
      console.warn("@userfront/core BrowserCookieStoredValue :: tried to create cookie-backed value without a cookie name. Falling back to memory-only value.")
      this._useMemory = true;
      this._val = undefined;
    }
  }

  _getName() {
    if (this.cookieName) {
      return this.cookieName;
    } else if (this.getCookieName) {
      return this.getCookieName();
    }
  }

  _notifyObservers(operation, ...args) {
    if (typeof this.observers[operation] === "function") {
      this.observers[operation](...args);
    }
  }

  get() {
    const name = this._getName();
    if (this._useMemory || !name) {
      this._notifyObservers("get", this._val);
      return this._val;
    }
    const val = Cookies.get(name);
    this._notifyObservers("get", val);
    return val;
  }

  set(val) {
    const name = this._getName();
    if (this._useMemory) {
      this._val = val;
      this._notifyObservers("set", val);
      return val;
    }
    
    if (val == null) {
      removeCookie(name);
      this._notifyObservers("set", val);
      this._notifyObservers("delete");
      return;
    }
    const options = getCookieOptionsByName(this._getName(), this.tokenType);
    Cookies.set(name, val, options);
    this._notifyObservers("set", val);
    return val;
  }

  delete() {
    const name = this._getName();
    if (this._useMemory) {
      this._notifyObservers("delete");
      return this._val = undefined;
    }
    
    removeCookie(name);
    this._notifyObservers("delete");
  }
}

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

const tokenStore = {
  accessToken: new BrowserCookieStoredValue(getTokenCookieName("access")),
  idToken: new BrowserCookieStoredValue(getTokenCookieName("id"), { set: setUser, delete: unsetUser }),
  refreshToken: new BrowserCookieStoredValue(getTokenCookieName("refresh")),
  accessTokenName: new ComputedValue(getTokenCookieName("access")),
  idTokenName: new ComputedValue(getTokenCookieName("id")),
  refreshTokenName: new ComputedValue(getTokenCookieName("refresh"))
}

const tokensProxyConfig = {
  get(target, key) {
    if (key in tokenStore) {
      return tokenStore[key].get();
    }
    return Reflect.get(...arguments);
  },

  set(target, key, value) {
    if (key in tokenStore) {
      return tokenStore[key].set(value);
    }
    return Reflect.set(...arguments);
  },

  deleteProperty(target, key) {
    if (key in tokenStore) {
      tokenStore[key].delete();
      return true;
    }
    return Reflect.deleteProperty(...arguments);
  },

  getOwnPropertyDescriptor(target, key) {
    if (key in tokenStore) {
      return { configurable: false, enumerable: true, value: tokenStore[key].get() };
    }
    return Reflect.getOwnPropertyDescriptor(...arguments);
  },

  ownKeys(target) {
    return [
      ...Reflect.ownKeys(target),
      ...Object.keys(tokenStore)
    ];
  }
}

const tokens = new Proxy({}, tokensProxyConfig);

store.tokens = tokens;

export { store };