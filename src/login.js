import { loginWithPassword } from "./password.js";
import { signonWithSso } from "./sso.js";
import { loginWithLink, sendPasswordlessLink } from "./link.js";
import { loginWithTotp } from "./totp.js";
import { completeSamlLogin } from "./saml.js";

/**
 * Log a user in via the provided method. This method serves to call other
 * methods, depending on the "method" parameter passed in.
 * @param {String} method
 * @param {String} email
 * @param {String} username
 * @param {String} emailOrUsername
 * @param {String} password
 * @param {String} token
 * @param {String} uuid
 * @param {String} redirect - do not redirect if false, or redirect to given path
 */
export async function login({
  method,
  // User identifiers
  userId,
  userUuid,
  email,
  username,
  emailOrUsername,
  phoneNumber,
  // Password
  password,
  // Link
  token,
  uuid,
  // Totp
  totpCode,
  backupCode,
  // Mfa
  firstFactorCode,
  verificationCode,
  // Other
  redirect,
} = {}) {
  if (!method) {
    throw new Error('Userfront.login called without "method" property.');
  }
  switch (method) {
    case "apple":
    case "azure":
    case "facebook":
    case "github":
    case "google":
    case "linkedin":
      return signonWithSso({ provider: method, redirect });
    case "password":
      return loginWithPassword({
        email,
        username,
        emailOrUsername,
        password,
        redirect,
      });
    case "passwordless":
      return sendPasswordlessLink({ email });
    case "link":
      return loginWithLink({ token, uuid, redirect });
    case "totp":
      return loginWithTotp({
        totpCode,
        backupCode,
        userId,
        userUuid,
        emailOrUsername,
        email,
        username,
        phoneNumber,
        redirect,
      });
    case "saml":
      return completeSamlLogin();
    default:
      throw new Error('Userfront.login called with invalid "method" property.');
  }
}
