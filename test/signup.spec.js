import Userfront from "../src/index.js";
import { signup } from "../src/signup.js";
import { signupWithPassword } from "../src/password.js";
import { signonWithSso } from "../src/sso.js";
import { sendPasswordlessLink } from "../src/link.js";
import { sendVerificationCode } from "../src/verificationCode.js";
import { defaultHandleRedirect } from "../src/url.js";

// Mock all methods to be called
jest.mock("../src/password.js");
jest.mock("../src/link.js");
jest.mock("../src/sso.js");
jest.mock("../src/verificationCode.js");
jest.mock("../src/url.js");

const tenantId = "abcd9876";

describe("signup()", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
    jest.resetAllMocks();
  });

  it(`{ method: undefined } should throw an error`, () => {
    expect(signup()).rejects.toEqual(
      new Error(`Userfront.signup called without "method" property.`)
    );
    expect(defaultHandleRedirect).not.toHaveBeenCalled();
  });

  describe(`{ method: "password" }`, () => {
    it(`should call signupWithPassword()`, () => {
      const email = "user@example.com";
      const password = "some-password123";
      const combos = [
        { email, password },
        {
          email,
          username: "user-name",
          name: "First Last",
          data: {
            custom: "data",
          },
          password,
        },
        { email, password, redirect: "/custom" },
        { email, password, redirect: false },
      ];

      // Test login for each combo
      combos.forEach((combo) => {
        // Call login for the combo
        Userfront.signup({ method: "password", ...combo });

        // Assert that signupWithPassword was called correctly
        combo.userData = combo.data;
        delete combo.data;
        expect(signupWithPassword).toHaveBeenCalledWith(combo);
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
        Userfront.signup(combo);

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
        Userfront.signup({ method: "passwordless", ...combo });

        // Assert that sendPasswordlessLink was called
        combo.userData = combo.data;
        delete combo.data;
        expect(sendPasswordlessLink).toHaveBeenCalledWith(combo);
      });
    });
  });

  describe(`{ method: "verificationCode" }`, () => {
    it(`should call sendVerificationCode()`, () => {
      const email = "user@example.com";
      const phoneNumber = "+15558884433";
      const combos = [
        { channel: "email", email },
        { channel: "sms", email, phoneNumber },
        {
          channel: "email",
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
        Userfront.signup({ method: "verificationCode", ...combo });

        // Assert that sendVerificationCode was called
        expect(sendVerificationCode).toHaveBeenCalledWith(combo);
      });
    });
  });
});
