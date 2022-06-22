import { signupWithPassword } from "./password.js";
import { signonWithSso } from "./sso.js";
import { sendPasswordlessLink } from "./link.js";
import { sendVerificationCode } from "./verificationCode.js";

/**
 * Register a user via the provided method. This method serves to call other
 * methods, depending on the "method" parameter passed in.
 * @param {String} method
 * @param {String} email
 * @param {String} username
 * @param {String} phoneNumber
 * @param {String} name
 * @param {Object} data - Object for custom user fields
 * @param {String} password
 * @param {String} channel "sms" or "email"
 * @param {String} redirect - do not redirect if false, or redirect to given path
 */
export async function signup({
  method,
  email,
  username,
  phoneNumber,
  name,
  data,
  password,
  channel,
  redirect,
} = {}) {
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
      return signonWithSso({ provider: method, redirect });
    case "password":
      return signupWithPassword({
        username,
        name,
        email,
        password,
        userData: data,
        redirect,
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
