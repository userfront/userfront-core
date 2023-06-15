import { loginWithPassword } from "./password.js";
import { loginWithPasswordMigrate } from "./password.migrate.js";
import { loginWithLink, sendPasswordlessLink } from "./link.js";
import { signonWithSso } from "./sso.js";
import { loginWithTotp } from "./totp.js";
import { loginWithVerificationCode } from "./verificationCode.js";
import { completeSamlLogin } from "./saml.js";
import { setupPkce } from "./pkce.js";

/**
 * Log a user in via the provided method. This method serves to call other
 * methods, depending on the "method" parameter passed in.
 * @property {String} method
 * @property {Number} userId
 * @property {String} userUuid
 * @property {String} email
 * @property {String} username
 * @property {String} emailOrUsername
 * @property {String} phoneNumber
 * @property {String} password
 * @property {String} token
 * @property {String} uuid
 * @property {String} totpCode
 * @property {String} backupCode
 * @property {String} channel "sms" or "email"
 * @property {String} verificationCode
 * @property {String | Boolean} redirect - do not redirect if false, or redirect to given path
 * @property {Function} handleUpstreamResponse
 * @property {Function} handleMfaRequired
 * @property {Function} handlePkceRequired
 * @property {Function} handleTokens
 * @property {Function} handleRedirect
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
  // Verification code
  channel,
  verificationCode,
  // Other
  redirect,
  handleUpstreamResponse,
  handleMfaRequired,
  handlePkceRequired,
  handleTokens,
  handleRedirect,
  options,
} = {}) {
  if (!method) {
    throw new Error('Userfront.login called without "method" property.');
  }
  setupPkce();
  switch (method) {
    case "apple":
    case "azure":
    case "facebook":
    case "github":
    case "google":
    case "linkedin":
    case "okta":
      return signonWithSso({ provider: method, redirect });
    case "password":
      return loginWithPassword({
        email,
        username,
        emailOrUsername,
        password,
        redirect,
        handleUpstreamResponse,
        handleMfaRequired,
        handlePkceRequired,
        handleTokens,
        handleRedirect,
        options,
      });
    case "password-migrate":
      return loginWithPasswordMigrate({
        email,
        username,
        emailOrUsername,
        password,
        redirect,
        handleUpstreamResponse,
        handleMfaRequired,
        handlePkceRequired,
        handleTokens,
        handleRedirect,
        options,
      });
    case "passwordless":
      return sendPasswordlessLink({ email });
    case "link":
      return loginWithLink({
        token,
        uuid,
        redirect,
        handleUpstreamResponse,
        handleMfaRequired,
        handlePkceRequired,
        handleTokens,
        handleRedirect,
      });
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
        handleUpstreamResponse,
        handleMfaRequired,
        handlePkceRequired,
        handleTokens,
        handleRedirect,
      });
    case "verificationCode":
      return loginWithVerificationCode({
        channel,
        email,
        phoneNumber,
        verificationCode,
        redirect,
        handleUpstreamResponse,
        handleMfaRequired,
        handlePkceRequired,
        handleTokens,
        handleRedirect,
      });
    case "saml":
      return completeSamlLogin();
    default:
      throw new Error('Userfront.login called with invalid "method" property.');
  }
}
