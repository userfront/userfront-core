/**
 * Create a user object based on tokens
 * @param {Object} tokens
 * @property {Object} idToken Decoded ID token
 * @property {Object} accessToken Decoded access token
 * @returns {Object}
 */
export default (tokens = {}) => {
  const { idToken, accessToken } = tokens;
  if (!idToken || !accessToken) {
    throw new Error("User error: Missing token information");
  }

  const user = {};

  // Set basic user information properties from ID token
  for (const prop of [
    "email",
    "username",
    "name",
    "image",
    "confirmedAt",
    "createdAt",
    "updatedAt",
  ]) {
    user[prop] = idToken[prop];
  }

  // Unnest user data properties if present
  for (const prop of Object.keys(idToken.data)) {
    user[prop] = idToken.data[prop];
  }

  // Set user authorization properties from access token
  for (const prop of ["userId", "authorization"]) {
    user[prop] = accessToken[prop];
  }

  return user;
};
