import { isTestHostname } from "../src/utils.js";

describe("Mode tests", () => {
  it("isTestHostname", () => {
    expect(isTestHostname("example.com")).toEqual(false);
    expect(isTestHostname("another.one.org")).toEqual(false);
    expect(isTestHostname("localhost:3000")).toEqual(true);
    expect(isTestHostname("192.168.1.1")).toEqual(true);
    expect(isTestHostname("10.0.0.1")).toEqual(true);
  });
});
