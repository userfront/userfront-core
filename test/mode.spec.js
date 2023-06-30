import Userfront from "../src/index.js";
import api from "../src/api.js";
import { isTestHostname, setMode, setModeSync } from "../src/mode.js";
import { authenticationData } from "../src/authentication.js";

jest.mock("../src/api.js");

const tenantId = "abcd4321";

// Delete the default window.location so that it can be reassigned
delete window.location;
window.location = new URL("https://some.exam.com/login");

describe("Mode tests", () => {
  describe("Defaults", () => {
    it("Should be 'live' by default if not a test hostname", () => {
      window.location = new URL("https://some.exam.com/login");

      Userfront.init(tenantId);
      setModeSync();

      expect(Userfront.mode.value).toEqual("live");
      expect(Userfront.mode.reason).toBe("domain");
      expect(Userfront.store.mode).toEqual("live");
    });

    it("Should be 'test' by default if a test hostname", () => {
      window.location = new URL("https://localhost:3000/login");

      Userfront.init(tenantId);
      setModeSync();

      expect(Userfront.mode.value).toEqual("test");
      expect(Userfront.mode.reason).toBe("domain");
      expect(Userfront.store.mode).toEqual("test");
    });

    it("Should be 'test' by default if http", () => {
      window.location = new URL("http://example.com/login");

      Userfront.init(tenantId);
      setModeSync();

      expect(Userfront.mode.value).toEqual("test");
      expect(Userfront.mode.reason).toBe("http");
      expect(Userfront.store.mode).toEqual("test");
    });
  });

  describe("Fetched from API", () => {
    it("Should set reason to 'domain' when setMode() returns 'live'", async () => {
      window.location = new URL("https://example.com/login");

      Userfront.init(tenantId);

      api.get.mockResolvedValue({
        status: 200,
        data: {
          mode: "live",
          authentication: {
            firstFactors: [{ channel: "email", strategy: "password" }],
            secondFactors: [],
          },
        },
      });

      await setMode();
      expect(api.get).toHaveBeenCalledWith(`/tenants/${tenantId}/mode`);

      expect(Userfront.store.mode).toEqual("live");
      expect(Userfront.mode.value).toEqual("live");
      expect(Userfront.mode.reason).toEqual("domain");
      expect(authenticationData.firstFactors).toEqual([
        { channel: "email", strategy: "password" },
      ]);
    });

    it("Should set reason to 'http' when setMode() returns 'test'", async () => {
      window.location = new URL("http://example.com/login");

      Userfront.init(tenantId);

      api.get.mockResolvedValue({
        status: 200,
        data: {
          mode: "test",
          authentication: {
            firstFactors: [{ channel: "email", strategy: "password" }],
            secondFactors: [],
          },
        },
      });

      await setMode();
      expect(api.get).toHaveBeenCalledWith(`/tenants/${tenantId}/mode`);

      expect(Userfront.store.mode).toEqual("test");
      expect(Userfront.mode.value).toEqual("test");
      expect(Userfront.mode.reason).toEqual("http");
      expect(authenticationData.firstFactors).toEqual([
        { channel: "email", strategy: "password" },
      ]);
    });

    it("Should set reason to 'domain' when setMode() returns 'test'", async () => {
      window.location = new URL("https://example.com/login");

      Userfront.init(tenantId);

      api.get.mockResolvedValue({
        status: 200,
        data: {
          mode: "test",
          authentication: {
            firstFactors: [{ channel: "email", strategy: "password" }],
            secondFactors: [],
          },
        },
      });

      await setMode();
      expect(api.get).toHaveBeenCalledWith(`/tenants/${tenantId}/mode`);

      expect(Userfront.store.mode).toEqual("test");
      expect(Userfront.mode.value).toEqual("test");
      expect(Userfront.mode.reason).toEqual("domain");
      expect(authenticationData.firstFactors).toEqual([
        { channel: "email", strategy: "password" },
      ]);
    });

    it("Should set reason to 'protocol' when setMode() returns 'test'", async () => {
      window.location = new URL("file://example.com/login");

      Userfront.init(tenantId);

      api.get.mockResolvedValue({
        status: 200,
        data: {
          mode: "test",
          authentication: {
            firstFactors: [{ channel: "email", strategy: "password" }],
            secondFactors: [],
          },
        },
      });

      await setMode();
      expect(api.get).toHaveBeenCalledWith(`/tenants/${tenantId}/mode`);

      expect(Userfront.store.mode).toEqual("test");
      expect(Userfront.mode.value).toEqual("test");
      expect(Userfront.mode.reason).toEqual("protocol");
      expect(authenticationData.firstFactors).toEqual([
        { channel: "email", strategy: "password" },
      ]);
    });

    it("Should not fail if a default authentication object is not present", async () => {
      window.location = new URL("https://example.com/login");

      Userfront.init(tenantId);

      api.get.mockResolvedValue({
        status: 200,
        data: {
          mode: "live",
        },
      });

      await setMode();
      expect(api.get).toHaveBeenCalledWith(`/tenants/${tenantId}/mode`);

      expect(Userfront.store.mode).toEqual("live");
      expect(Userfront.mode.value).toEqual("live");
      expect(Userfront.mode.reason).toEqual("domain");
      expect(authenticationData.firstFactors).toEqual([]);
    });
  });
});

describe("isTestHostname", () => {
  expect(isTestHostname("example.com")).toEqual(false);
  expect(isTestHostname("another.one.org")).toEqual(false);
  expect(isTestHostname("localhost:3000")).toEqual(true);
  expect(isTestHostname("192.168.1.1")).toEqual(true);
  expect(isTestHostname("10.0.0.1")).toEqual(true);
});
