import { makeFriendlyStore } from "../src/store.utils";

// Toy implementation of the GetSetValue interface
class Value {
  constructor() {
    this._val = undefined;
  }
  get() {
    return this._val;
  }
  set(val) {
    this._val = val;
    return val;
  }
  delete() {
    this._val = undefined;
  }
}

describe("/store.utils.js", () => {
  it("should proxy property reads", () => {
    const store = {
      someKey: new Value()
    };
    store.someKey._val = "foo";

    const proxied = makeFriendlyStore(store);

    expect(proxied.someKey).toEqual("foo");
  });
  it("should proxy property writes", () => {
    const store = {
      someKey: new Value()
    };
    store.someKey._val = "before";

    const proxied = makeFriendlyStore(store);
    proxied.someKey = "after";

    expect(proxied.someKey).toEqual("after");
  });
  it("should proxy the delete operator, setting value to undefined", () => {
    const store = {
      someKey: new Value()
    };
    store.someKey._val = "defined";

    const proxied = makeFriendlyStore(store);
    delete proxied.someKey;

    expect(proxied.someKey).toEqual(undefined);
  });
  it("should provide property descriptors for store values", () => {
    const store = {
      someKey: new Value()
    };
    store.someKey._val = "foo";

    const proxied = makeFriendlyStore(store);
    const descriptor = Object.getOwnPropertyDescriptor(proxied, "someKey");

    expect(descriptor).toBeDefined();
    expect(descriptor.configurable).toEqual(true);
    expect(descriptor.enumerable).toEqual(true);
    expect(descriptor.value).toEqual("foo");
  });
  it("should include store values in keys", () => {
    const store = {
      someKey: new Value()
    };
    store.someKey._val = "foo";

    const proxied = makeFriendlyStore(store);

    expect(Object.keys(proxied)).toContain("someKey");
  })
  it("should not interfere with setting, reading, and deleting an additional value", () => {
    const store = {
      someKey: new Value()
    };
    store.someKey._val = "foo";
    
    const proxied = makeFriendlyStore(store);
    proxied.anotherKey = "bar";

    expect(proxied.anotherKey).toBeDefined();
    expect(proxied.anotherKey).toEqual("bar");
    expect(Object.getOwnPropertyDescriptor(proxied, "anotherKey")).toBeDefined();
    expect(Object.keys(proxied)).toContain("anotherKey");

    delete proxied.anotherKey;

    expect(proxied.anotherKey).not.toBeDefined();
    expect(Object.keys(proxied)).not.toContain("anotherKey");
  });
})