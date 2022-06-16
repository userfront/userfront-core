import { signupWithPassword } from "./password.js";
import { signonWithSso } from "./sso.js";
import { sendPasswordlessLink } from "./link.js";

/**
 * This file has methods for signing up and logging in
 */

/**
 * Register a user via the provided method. This method serves to call other
 * methods, depending on the "method" parameter passed in.
 * @param {String} method
 * @param {String} username
 * @param {String} name
 * @param {String} email
 * @param {String} password
 * @param {Object} data - Object for custom user fields
 * @param {String} redirect - path to redirect to, or if false, do not redirect
 */
export async function signup({
  method,
  username,
  name,
  email,
  password,
  data,
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
    default:
      throw new Error(
        'Userfront.signup called with invalid "method" property.'
      );
  }
}
