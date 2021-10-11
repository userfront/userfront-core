import { isTestHostname } from "../../src/mode.js";

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
    userUuid: "c38d7119-4dca-403c-bc3c-a008c5115b5c",
    isConfirmed: true,
  },
  token: {
    sessionId: "7b794d68-dc94-4829-bd68-596c5d2693b5",
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

function createAccessToken(payload = {}) {
  const jwtPayload = {
    ...accessTokenUserDefaults,
    ...sharedTokenProperties.token,
    ...payload,
  };
  return jwt.sign(jwtPayload, randomString());
}

function createIdToken(payload = {}) {
  const jwtPayload = {
    ...idTokenUserDefaults,
    ...sharedTokenProperties.token,
    ...payload,
  };
  return jwt.sign(jwtPayload, randomString());
}

function createRefreshToken(payload = {}) {
  const jwtPayload = {
    type: "refresh",
    ...accessTokenUserDefaults,
    ...sharedTokenProperties.token,
    ...payload,
  };
  delete jwtPayload.authorization;
  return jwt.sign(jwtPayload, randomString());
}

function randomString() {
  return Math.random().toString().slice(2, 22);
}

export default {
  accessTokenUserDefaults,
  createAccessToken,
  createIdToken,
  createRefreshToken,
  defaultIdTokenProperties,
  idTokenUserDefaults,
  randomString,
  resetStore,
  sharedTokenProperties,
};
