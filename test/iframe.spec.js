import utils from "./config/utils.js";
import Userfront from "../src/index.js";

const tenantId = "abcdefg";

describe("iframe tests", () => {
  afterEach(() => {
    utils.resetStore(Userfront);
  });

  it("init should add an iframe with src of auth.userfront.net", () => {
    Userfront.init(tenantId);
    const frame = document.getElementsByTagName("iframe")[0];
    expect(frame).toBeTruthy();
    expect(frame.src).toMatch(/^https:\/\/auth.userfront.net/);
    expect(frame.style.display).toEqual("none");
  });

  it("init should not add duplicate iframe", () => {
    const beforeCount = document.getElementsByTagName("iframe").length;
    expect(beforeCount).toEqual(1);

    Userfront.init(tenantId);

    const afterCount = document.getElementsByTagName("iframe").length;
    expect(afterCount).toEqual(1);
  });

  it("should not throw an error if document is not present", () => {
    delete global.document;
    try {
      Userfront.init(tenantId);
    } catch (error) {
      // Userfront.init should not throw an error here, to this catch
      // will only run if the test has failed.
      expect(error).toBeFalsey();
    }
  });
});
