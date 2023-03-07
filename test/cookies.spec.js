/**
 * @jest-environment jsdom
 * @jest-environment-options { "url": "https://has.some.sub.domains.com/" }
 */

import Cookie from "js-cookie";
import Userfront from "../src/index.js";
import { removeAllCookies } from "../src/cookies.js";

const tenantId = "abcd4321";
Userfront.init(tenantId);

describe("removeAllCookies", () => {
  it("should remove all possible variants (based on path and domain) of all access, ID, and refresh cookies", async () => {
    // Navigate to custom path
    window.history.pushState({}, "", "/custom/path");

    // Define all domains and paths
    const domains = [undefined, location.hostname, `.${location.hostname}`];
    const paths = [undefined, location.pathname, "/"];
    const names = [
      `access.${tenantId}`,
      `id.${tenantId}`,
      `refresh.${tenantId}`,
    ];

    // Set up tests and make assertions for all domains and paths
    domains.map((domain) => {
      paths.map((path) => {
        const options = {};
        if (domain) options.domain = domain;
        if (path) options.path = path;

        // Cookies should not exist before the test
        names.map((name) => {
          expect(Cookie.get(name, options)).toBeFalsy();
        });

        // Add the cookies directly
        names.map((name) => {
          Cookie.set(
            name,
            `{\n\tname: ${name},\n\tdomain: ${domain},\n\tpath: ${path}\n}`,
            options
          );
        });

        // Call removeAllCookies
        removeAllCookies();

        // Cookies should all have been removed
        names.map((name) => {
          expect(Cookie.get(name, options)).toBeFalsy();
        });
      });
    });
  });
});
