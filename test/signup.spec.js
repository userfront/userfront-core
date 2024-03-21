import { vi } from "vitest";

import Userfront from "../src/index.js";
import { signup } from "../src/signup.js";
import { signupWithPassword } from "../src/password.js";
import { signonWithSso } from "../src/sso.js";
import { sendPasswordlessLink } from "../src/link.js";
import { sendVerificationCode } from "../src/verificationCode.js";
import { defaultHandleRedirect } from "../src/url.js";

// Mock all methods to be called
vi.mock("../src/password.js");
vi.mock("../src/link.js");
vi.mock("../src/sso.js");
vi.mock("../src/verificationCode.js");
vi.mock("../src/url.js");

const tenantId = "abcd9876";

describe("signup()", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
    vi.resetAllMocks();
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

  describe(`{ method: "custom" }`, () => {
    it(`should call signonWithSso() with provider ID`, () => {
      // Call signup with the custom provider's ID
      const providerId = "fake-provider-id";
      Userfront.signup({ method: "custom", providerId });

      // Assert that signonWithSso was called correctly
      expect(signonWithSso).toHaveBeenCalledWith({
        provider: "custom",
        providerId,
      });
    });

    it(`should call signonWithSso() with redirect`, () => {
      // Call signup with the custom provider's ID & redirect
      const providerId = "fake-provider-id-1";
      const redirect = "/custom-path";
      Userfront.signup({ method: "custom", redirect, providerId });

      // Assert that signonWithSso was called correctly
      expect(signonWithSso).toHaveBeenCalledWith({
        provider: "custom",
        redirect,
        providerId,
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
