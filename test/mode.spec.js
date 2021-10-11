import axios from "axios";
import Userfront from "../src/index.js";
import { isTestHostname, setMode, setModeSync } from "../src/mode.js";

jest.mock("axios");
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

      axios.get.mockResolvedValue({
        status: 200,
        data: {
          mode: "live",
        },
      });

      await setMode();
      expect(Userfront.store.mode).toEqual("live");
      expect(Userfront.mode.value).toEqual("live");
      expect(Userfront.mode.reason).toEqual("domain");
    });

    it("Should set reason to 'http' when setMode() returns 'test'", async () => {
      window.location = new URL("http://example.com/login");

      Userfront.init(tenantId);

      axios.get.mockResolvedValue({
        status: 200,
        data: {
          mode: "test",
        },
      });

      await setMode();
      expect(Userfront.store.mode).toEqual("test");
      expect(Userfront.mode.value).toEqual("test");
      expect(Userfront.mode.reason).toEqual("http");
    });

    it("Should set reason to 'domain' when setMode() returns 'test'", async () => {
      window.location = new URL("https://example.com/login");

      Userfront.init(tenantId);

      axios.get.mockResolvedValue({
        status: 200,
        data: {
          mode: "test",
        },
      });

      await setMode();
      expect(Userfront.store.mode).toEqual("test");
      expect(Userfront.mode.value).toEqual("test");
      expect(Userfront.mode.reason).toEqual("domain");
    });

    it("Should set reason to 'protocol' when setMode() returns 'test'", async () => {
      window.location = new URL("file://example.com/login");

      Userfront.init(tenantId);

      axios.get.mockResolvedValue({
        status: 200,
        data: {
          mode: "test",
        },
      });

      await setMode();
      expect(Userfront.store.mode).toEqual("test");
      expect(Userfront.mode.value).toEqual("test");
      expect(Userfront.mode.reason).toEqual("protocol");
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
