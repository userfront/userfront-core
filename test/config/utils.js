import { isTestHostname } from "../../src/mode.js";
import jwt from "jsonwebtoken";

export function resetStore(Userfront) {
  Userfront.store = {
    mode: isTestHostname() ? "test" : "live",
  };
}

export const defaultIdTokenProperties = [
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
    userId: 33,
    tenantId: "abcd1234",
    userUuid: "c38d7119-4dca-403c-bc3c-a008c5115b5c",
    isConfirmed: true,
  },
  token: {
    sessionId: "7b794d68-dc94-4829-bd68-596c5d2693b5",
    iat: new Date().getTime(),
    exp: new Date().getTime(),
  },
};

export const accessTokenUserDefaults = {
  authorization: {
    abcd1234: {
      roles: ["member"],
    },
  },
  ...sharedTokenProperties.user,
};

export const idTokenUserDefaults = {
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

export const testRsaPrivateKey = `-----BEGIN RSA PRIVATE KEY-----
MIICWwIBAAKBgQCQ6/zlOUpKt6qc2IFtz6dxg2UB+at4ZXPrGZtrX16I196AA1Jm
V1YXQCxz41Zm6dXwO390L2DoN11NV41RiCgXZZ4kPJALKod34jI6t76fdzzOwcnI
GujIXcfnve/wu2MqGuyoInPxJqugB0eSZgnIWe6QBeaJLLGvkSHWnw3zNQIDAQAB
AoGAGIcYYmNz43l6ctlh7of6uweWDOOI1fO1ztCisWWOxnJiwh/NzmxxsbW20FZl
xT1GbEZlp/Bs4mCcdf6feHEm962RpiL2pTjOlE/26XpPilnm1IbOxRO43WM4RIAl
HVnSrTYbuJeXZcQcdkP7H1s4iTYorJr9gvIwkmozaeuORHECQQDD6guJLtvC6tP+
y2mv3VOg6dE4Af4lnvDojR8Qi8619TCEESfvmWRm3xFefIzE4vSllj4BTqx6dpTW
Cr+Rm00PAkEAvV5W0S44jpMypZDhb3AwwSfp7cclNDR9iZgIRoK/iqUcj1urU8/P
Ouag7aF+a7OaZ5WmCSkI7H7CmD5qQWtDewJAZADbBJp7qQJPVlckypVyc8gGeM1j
mnaISFyIx9xllrHiovdS6FXnTy98YTu4a2PiN4f6fJZZKmXPUXbJFJ0udwJAS3qw
zAvKSznstAV9dbeYF0VbfoUkFRze9Nr+YWx4AEEzkwiMz4lDJk0K0+zMwQ0DfEov
tfL/NZSI57npDE4+xQJAWDue5qKvYVDz/tCTQMVeLjJxfPUoChTTmfn4r8zBE8bM
snfHQIyBNb+JdvsyL5iCwqKM+ZjhXissAIqWbYBdmQ==
-----END RSA PRIVATE KEY-----`;

export const testRsaPublicKey = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCQ6/zlOUpKt6qc2IFtz6dxg2UB
+at4ZXPrGZtrX16I196AA1JmV1YXQCxz41Zm6dXwO390L2DoN11NV41RiCgXZZ4k
PJALKod34jI6t76fdzzOwcnIGujIXcfnve/wu2MqGuyoInPxJqugB0eSZgnIWe6Q
BeaJLLGvkSHWnw3zNQIDAQAB
-----END PUBLIC KEY-----`;

export function createAccessToken(payload = {}) {
  const jwtPayload = {
    ...accessTokenUserDefaults,
    ...sharedTokenProperties.token,
    ...payload,
  };
  return jwt.sign(jwtPayload, testRsaPrivateKey, { algorithm: "RS256" });
}

export function createIdToken(payload = {}) {
  const jwtPayload = {
    ...idTokenUserDefaults,
    ...sharedTokenProperties.token,
    ...payload,
  };
  return jwt.sign(jwtPayload, testRsaPrivateKey, { algorithm: "RS256" });
}

export function createRefreshToken(payload = {}) {
  const jwtPayload = {
    type: "refresh",
    ...accessTokenUserDefaults,
    ...sharedTokenProperties.token,
    ...payload,
  };
  delete jwtPayload.authorization;
  return jwt.sign(jwtPayload, testRsaPrivateKey, { algorithm: "RS256" });
}

export default {
  accessTokenUserDefaults,
  defaultIdTokenProperties,
  idTokenUserDefaults,
  sharedTokenProperties,
};
