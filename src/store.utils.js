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
