import { isTestHostname } from "../../src/utils.js";

function resetStore(Userfront) {
  Userfront.store = {
    mode: isTestHostname() ? "test" : "live",
  };
}

import jwt from "jsonwebtoken";

const defaultIdTokenProperties = [
  "mode",
  "userId",
  "tenantId",
  "userUuid",
  "isConfirmed",
  "name",
  "email",
  "username",
  "image",
  "data",
  "confirmedAt",
  "createdAt",
  "updatedAt",
];

// Properties on both tokens
const sharedTokenProperties = {
  user: {
    mode: "test",
    userId: 3,
    tenantId: "abcdefgh",
    userUuid: "aaaa-bbbb-cccc-dddd",
    isConfirmed: true,
  },
  token: {
    sessionId: "bbbb-cccc-dddd-eeee",
    iat: new Date().getTime(),
    exp: new Date().getTime(),
  },
};

const accessTokenUserDefaults = {
  authorization: {
    abcdefgh: {
      roles: ["member"],
    },
  },
  ...sharedTokenProperties.user,
};

const idTokenUserDefaults = {
  name: "John Doe",
  email: "johndoe@example.com",
  username: "johndoe",
  image: "https://example.com/profile-image.png",
  data: {
    number: 16,
    color: "red",
    birthdate: `${new Date()}`,
    data: {
      country: "Monaco",
    },
    metadata: {
      lastLogin: `${new Date()}`,
    },
  },
  confirmedAt: `${new Date()}`,
  createdAt: `${new Date()}`,
  updatedAt: `${new Date()}`,
  ...sharedTokenProperties.user,
};

function createAccessToken(payload) {
  payload = payload || {
    ...accessTokenUserDefaults,
    ...sharedTokenProperties.token,
  };
  return jwt.sign(payload, randomString());
}

function createIdToken(payload) {
  payload = payload || {
    ...idTokenUserDefaults,
    ...sharedTokenProperties.token,
  };
  return jwt.sign(payload, randomString());
}

function randomString() {
  return Math.random().toString().slice(2, 22);
}

export default {
  accessTokenUserDefaults,
  createAccessToken,
  createIdToken,
  defaultIdTokenProperties,
  idTokenUserDefaults,
  randomString,
  resetStore,
  sharedTokenProperties,
};
