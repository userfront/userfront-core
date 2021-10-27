import { resetStore } from "./config/utils.js";
import Userfront from "../src/index.js";
import Iframe from "../src/iframe.js";

const tenantId = "abcdefg";

describe("iframe tests", () => {
  afterEach(() => {
    resetStore(Userfront);
  });

  it("init should not add an iframe", () => {
    Userfront.init(tenantId);
    const frame = document.getElementsByTagName("iframe")[0];
    expect(frame).toBeFalsy();
  });

  // TODO re-enable the tests below once the iframe is re-established

  xit("init should add an iframe with src of auth.userfront.net", () => {
    Userfront.init(tenantId);
    const frame = document.getElementsByTagName("iframe")[0];
    expect(frame).toBeTruthy();
    expect(frame.src).toMatch(/^https:\/\/auth.userfront.net/);
    expect(frame.style.display).toEqual("none");
  });

  xit("init should not add duplicate iframe when one exists", () => {
    // Clear the local iframe variable, but keep the iframe on the page
    Iframe.__set__("iframe", undefined);

    const beforeCount = document.getElementsByTagName("iframe").length;
    expect(beforeCount).toEqual(1);

    Userfront.init(tenantId);

    const afterCount = document.getElementsByTagName("iframe").length;
    expect(afterCount).toEqual(1);
  });

  xit("should not throw an error if document is not present", () => {
    delete global.document;
    try {
      Userfront.init(tenantId);
    } catch (error) {
      // Userfront.init should not throw an error here, to this catch
      // will only run if the test has failed.
      expect(error).toBeFalsey();
    }
    // Expect should not have been called above
    expect.assertions(0);
  });
});
