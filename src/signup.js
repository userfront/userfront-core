import { signupWithPassword } from "./password.js";
import { signonWithSso } from "./sso.js";
import { sendPasswordlessLink } from "./link.js";
import { sendVerificationCode } from "./verificationCode.js";
import { setupPkce } from "./pkce.js";

/**
 * Register a user via the provided method. This method serves to call other
 * methods, depending on the "method" parameter passed in.
 * @property {String} method
 * @property {String} email
 * @property {String} username
 * @property {String} phoneNumber
 * @property {String} name
 * @property {Object} data - Object for custom user fields
 * @property {String} password
 * @property {String} channel "sms" or "email"
 * @property {String} providerId ID of custom SSO provider
 * @property {String} redirect - do not redirect if false, or redirect to given path
 * @property {Function} handleUpstreamResponse
 * @property {Function} handleMfaRequired
 * @property {Function} handlePkceRequired
 * @property {Function} handleTokens
 * @property {Function} handleRedirect
 * @property {Object} options
 * @property {Boolean} options.noSignupEmail
 *  By default, Userfront sends a welcome and signup email when registering a new user.
 *  Set options.noSignupEmail = true to override this behavior.
 */
export async function signup({
  method,
  email,
  username,
  phoneNumber,
  name,
  data,
  password,
  // Verification code
  channel,
  // Custom SSO
  providerId,
  // Misc.
  redirect,
  handleUpstreamResponse,
  handleMfaRequired,
  handlePkceRequired,
  handleTokens,
  handleRedirect,
  options,
} = {}) {
  setupPkce();
  if (!method) {
    throw new Error('Userfront.signup called without "method" property.');
  }
  switch (method) {
    case "apple":
    case "azure":
    case "facebook":
    case "github":
    case "google":
    case "linkedin":
    case "okta":
      return signonWithSso({ provider: method, redirect });
    case "custom":
      return signonWithSso({ provider: method, redirect, providerId });
    case "password":
      return signupWithPassword({
        username,
        name,
        email,
        password,
        userData: data,
        redirect,
        handleUpstreamResponse,
        handleMfaRequired,
        handlePkceRequired,
        handleTokens,
        handleRedirect,
        options,
      });
    case "passwordless":
      return sendPasswordlessLink({ email, name, username, userData: data });
    case "verificationCode":
      return sendVerificationCode({
        channel,
        email,
        phoneNumber,
        name,
        username,
        data,
      });
    default:
      throw new Error(
        'Userfront.signup called with invalid "method" property.'
      );
  }
}
