import Userfront from "../src/index.js";

import { login } from "../src/login.js";
import { loginWithPassword } from "../src/password.js";
import { loginWithPasswordMigrate } from "../src/password.migrate.js";
import { sendPasswordlessLink, loginWithLink } from "../src/link.js";
import { signonWithSso } from "../src/sso.js";
import { loginWithTotp } from "../src/totp.js";
import { loginWithVerificationCode } from "../src/verificationCode.js";
import { completeSamlLogin } from "../src/saml.js";
import { defaultHandleRedirect } from "../src/url.js";

// Mock all methods to be called
jest.mock("../src/password.js");
jest.mock("../src/password.migrate.js");
jest.mock("../src/link.js");
jest.mock("../src/sso.js");
jest.mock("../src/totp.js");
jest.mock("../src/verificationCode.js");
jest.mock("../src/saml.js");
jest.mock("../src/url.js");

const tenantId = "abcd9876";

describe("login()", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
    jest.resetAllMocks();
  });

  it(`{ method: undefined } should throw an error`, () => {
    expect(login()).rejects.toEqual(
      new Error(`Userfront.login called without "method" property.`)
    );
    expect(defaultHandleRedirect).not.toHaveBeenCalled();
  });

  describe(`{ method: "password" }`, () => {
    it(`should call loginWithPassword()`, () => {
      const email = "user@example.com";
      const password = "some-password123";
      const handleUpstreamResponse = jest.fn();
      const handleTokens = jest.fn();
      const handleRedirect = jest.fn();
      const combos = [
        { email, password },
        { username: "user-name", password },
        { username: "user-name", password, handleUpstreamResponse },
        { username: "user-name", password, handleTokens },
        { username: "user-name", password, handleRedirect },
        { emailOrUsername: email, password },
        { email, password, redirect: "/custom" },
        { email, password, redirect: false, options: { noResetEmail: true } },
      ];

      // Test login for each combo
      combos.forEach((combo) => {
        // Call login for the combo
        Userfront.login({ method: "password", ...combo });

        // Assert that loginWithPassword was called correctly
        expect(loginWithPassword).toHaveBeenCalledWith(combo);
      });
    });
  });

  describe(`{ method: "password-migrate" }`, () => {
    it(`should call loginWithPasswordMigrate()`, () => {
      const email = "user@example.com";
      const password = "some-password123";
      const handleUpstreamResponse = jest.fn();
      const handleTokens = jest.fn();
      const handleRedirect = jest.fn();
      const combos = [
        { email, password },
        { username: "user-name", password },
        { username: "user-name", password, handleUpstreamResponse },
        { username: "user-name", password, handleTokens },
        { username: "user-name", password, handleRedirect },
        { emailOrUsername: email, password },
        { email, password, redirect: "/custom" },
        { email, password, redirect: false, options: { noResetEmail: true } },
      ];

      // Test login for each combo
      combos.forEach((combo) => {
        // Call login for the combo
        Userfront.login({ method: "password-migrate", ...combo });

        // Assert that loginWithPassword was called correctly
        expect(loginWithPasswordMigrate).toHaveBeenCalledWith(combo);
      });
    });
  });

  describe(`{ method: "google" } and other SSO providers`, () => {
    it(`should call signonWithSso()`, () => {
      const combos = [
        { method: "apple" },
        { method: "azure" },
        { method: "facebook" },
        { method: "github" },
        { method: "google", redirect: "/after-google" },
        { method: "linkedin", redirect: false },
        { method: "okta" },
      ];

      // Test login for each provider
      combos.forEach((combo) => {
        // Call login for the combo
        Userfront.login(combo);

        // Assert that signonWithSso was called correctly
        expect(signonWithSso).toHaveBeenCalledWith({
          provider: combo.method,
          redirect: combo.redirect,
        });
      });
    });
  });

  describe(`{ method: "passwordless" }`, () => {
    it(`should call sendPasswordlessLink()`, () => {
      const email = "user@example.com";
      const combos = [
        { email },
        {
          email,
          name: "First Last",
          username: "user-name",
          data: {
            custom: "data",
          },
        },
      ];

      // Test login for each combo
      combos.forEach((combo) => {
        // Call login for the combo
        Userfront.login({ method: "passwordless", ...combo });

        // Assert that sendPasswordlessLink was called with only the email
        expect(sendPasswordlessLink).toHaveBeenCalledWith({
          email: combo.email,
        });
      });
    });
  });

  describe(`{ method: "link" }`, () => {
    it(`should call loginWithLink()`, () => {
      const token = "some-token";
      const uuid = "some-uuid";
      const handleUpstreamResponse = jest.fn();
      const handleTokens = jest.fn();
      const handleRedirect = jest.fn();
      const combos = [
        { token, uuid },
        { token, uuid, handleUpstreamResponse },
        { token, uuid, handleTokens },
        { token, uuid, handleRedirect },
        { token, uuid, redirect: "/custom" },
        { token, uuid, redirect: false },
      ];

      // Test login for each combo
      combos.forEach((combo) => {
        // Call login for the combo
        Userfront.login({ method: "link", ...combo });

        // Assert that loginWithLink was called
        expect(loginWithLink).toHaveBeenCalledWith(combo);
      });
    });
  });

  describe(`{ method: "totp" }`, () => {
    const codeAttrs = [{ totpCode: "991234" }, { backupCode: "11111-aaaaa" }];
    const identifierAttrs = [
      { userId: 222 },
      { userUuid: "326381e1-30b8-4280-93b6-ea27b2078966" },
      { emailOrUsername: "myusername" },
      { email: "user@example.com" },
      { username: "ausername" },
      { phoneNumber: "+15558675309" },
    ];
    // Loop over all input combos and ensure that loginWithTotp is called correctly for each
    codeAttrs.map((codeAttr) => {
      identifierAttrs.map((identifierAttr) => {
        it(`should call loginWithTotp with ${codeAttr} and ${identifierAttr}`, () => {
          // Call login for the combo
          Userfront.login({ method: "totp", ...codeAttr, ...identifierAttr });

          // Assert that loginWithTotp was called correctly
          expect(loginWithTotp).toHaveBeenCalledWith({
            ...codeAttr,
            ...identifierAttr,
          });
        });
      });
    });
  });

  describe(`{ method: "verificationCode" }`, () => {
    const handleUpstreamResponse = jest.fn();
    const handleTokens = jest.fn();
    const handleRedirect = jest.fn();
    const combos = [
      {
        channel: "sms",
        phoneNumber: "+15552223344",
        verificationCode: "456123",
        handleUpstreamResponse,
      },
      {
        channel: "email",
        email: "user@example.com",
        verificationCode: "456123",
        handleTokens,
      },
      {
        channel: "sms",
        phoneNumber: "+15552223344",
        verificationCode: "456123",
        redirect: false,
      },
      {
        channel: "email",
        email: "user@example.com",
        verificationCode: "456123",
        redirect: "/custom",
        handleRedirect,
      },
    ];
    // Loop over all input combos and ensure that loginWithTotp is called correctly for each
    combos.map((combo) => {
      it(`should call loginWithVerificationCode() with channel=${combo.channel}`, () => {
        // Call login for the combo
        Userfront.login({ method: "verificationCode", ...combo });

        // Assert that loginWithTotp was called correctly
        expect(loginWithVerificationCode).toHaveBeenCalledWith(combo);
      });
    });
  });

  describe(`{ method: "saml"}`, () => {
    it(`should call loginWithSaml()`, () => {
      // Call login for the combo
      Userfront.login({ method: "saml" });

      // Assert that loginWithLink was called
      expect(completeSamlLogin).toHaveBeenCalledWith();
    });
  });
});
