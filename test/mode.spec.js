const chai = require("chai");
const expect = chai.expect;

const { isTestHostname } = require("../index.js");

describe("Mode tests", () => {
  it("isTestHostname", () => {
    expect(isTestHostname("example.com")).to.equal(false);
    expect(isTestHostname("another.one.org")).to.equal(false);
    expect(isTestHostname("localhost:3000")).to.equal(true);
    expect(isTestHostname("192.168.1.1")).to.equal(true);
    expect(isTestHostname("10.0.0.1")).to.equal(true);
  });
});
