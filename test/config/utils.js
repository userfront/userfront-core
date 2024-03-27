import { isTestHostname } from "../../src/mode.js";
import { authenticationData } from "../../src/authentication.js";
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
  "email",
  "phoneNumber",
  "name",
  "username",
  "image",
  "data",
  "isEmailConfirmed",
  "isPhoneNumberConfirmed",
  "confirmedEmailAt",
  "confirmedPhoneNumberAt",
  "isMfaRequired",
  "createdAt",
  "updatedAt",
  "isConfirmed", // Deprecated
];

// Properties on both tokens
const sharedTokenProperties = {
  user: {
    mode: "test",
    userId: 33,
    tenantId: "abcd1234",
    userUuid: "c38d7119-4dca-403c-bc3c-a008c5115b5c",
    isEmailConfirmed: true,
    isPhoneNumberConfirmed: false,
    isConfirmed: true, // Deprecated
  },
  token: {
    sessionId: "7b794d68-dc94-4829-bd68-596c5d2693b5",
    iat: parseInt(new Date().getTime() / 1000),
    exp: parseInt(new Date().getTime() / 1000) + 86400, // 1 day
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
  phoneNumber: "+15558912810",
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
  isMfaRequired: false,
  confirmedEmailAt: `${new Date()}`,
  confirmedPhoneNumberAt: `${new Date()}`,
  createdAt: `${new Date()}`,
  updatedAt: `${new Date()}`,
  ...sharedTokenProperties.user,
};

export const testRsaPrivateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA3AhgADWThK/HXiFLyKtYp03U37RaxcxVZ/NAQ74Rnd+zSf4j
ZAg/damYzugvm2Byc1Wbug/Q1gKQHOrjdJkwe/jVhJFSz8cTurnrNIX4AizBalck
zs7I2OM2ETsIuIQ4UJeqKwDXKKAv5Wd/k/XCRH+6cWT4vIYwnHLZhe0zauQ1Tq/W
i5mFu0uj9VqASb4skCMCxpt05ADvyJFvLy4ccm6nS5KYX73oDg1pgOa38z2zKuwM
dc1wJb6ZDqQS6FfC5zPpZ1siFD+pDfeRSI2sxn1y5xw43wR1cpqVvZqzemeT5QpY
DQos4Ld4JQU6D8y99m/9/riIn7DvtsOb4LYVEQIDAQABAoIBAQCf9Ya1ID3qTE/H
4rTRYZ/FoROMvfTvryi3tWOW2+q6txIETLk107kutOjeInXZozgRGL9peG3950cV
fr102pkgxzmScoOdgcCaEucm++3cxuSlhky//ByPcD6yMBSa76RxEpEnSikg47Nu
NtvMmPFuEt1b6mfZxkQ4uFXiwxqKLZvUOnJqiluluhpfGrGuzzR6VN1ysv1J5733
rFKoIIeiYwRBuhZxpzvpq5xxY8JzKAA+6OI5F7qQWkPRjgDa1OKtDlAS/tSLPkTq
ldxdEnEkeP3Xq9l/pIjP4y3Asb6P9kSs/T5w5r9hkTq9hUuQoBr+n0+OJZt0NLtn
flAH6nhBAoGBAPvINpOHb0471UYG6o/dwhTdpHohk1tPzOX52B8htDrQY3rTPiga
wkMHeWIjO4iBHKuGmaWIuNpIygXQWnqtfUGbjg0jMa52bE3KyKMO75Wk9PolbPgg
ZW9b6oSIO7PsWr+G5qlPqGmZidXw0YyRavjxBcNXsv1BjDtYMQmMK8J9AoGBAN+4
AJDbj5uW0MlNePC8cuMCoit/Wj7HLbLZ3cX7Gqt6I43Df7PYEf0ZG4d1DTxu6db3
eKGtNwpEcD5Tk7XMpqKOSqOgOKDC+LBC+ZdbbpnbDAQtKSHGvAlabtP0cbjxK4+N
Tj3DLbS0Sym461lL2rCWoQYdyMadDTcQx/ZNby0lAoGANpO5sNUEvZKesmVBZxoM
vfUleAvbI0nzAk7cGDN4G9+cEL3FlW/neBwgpbM5bmd+TXgJyiYO29I3aHc3hawh
oJ0Vd6ePV1/4Lgys3RuZt3hgWfDO5CIxmqfz9/KH7oJnUWjuivjnaqyLgkKHSc8j
vv6P3z4dYGRa/2oohwdJXQkCgYBoHZYF1GjNHC8mwCtcvhcplvwqCibRuJiH9+TC
Us5ip4EMZMN1y0Tz6U9qhwsV6Phi1uEJPTe0S42BNBw2K3wRgu8xn0s7ZgGe5kyK
KD8c01iQSQQvd/Hi2HdjpQuX6oU/VZ/oFoGa651fWXQOJsMsE630zr+1zzlrOyAU
fI0VEQKBgDDHVwSAhy5H1NALplMaWlwzHwxBjn9FieZ0ZMa/LyYXrM2qdwrfHwJb
kLKTCR2A1UYxpMpuPlCjIPcsjzjZMGlYg3bZasEbYa2h3dbGWZJ0tzsMSnizvoz0
O5sLOCrWgV4ftiKZftIWYGpPqN089HmDky040mVbA82zlDlvrT47
-----END RSA PRIVATE KEY-----`;

export const testRsaPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3AhgADWThK/HXiFLyKtY
p03U37RaxcxVZ/NAQ74Rnd+zSf4jZAg/damYzugvm2Byc1Wbug/Q1gKQHOrjdJkw
e/jVhJFSz8cTurnrNIX4AizBalckzs7I2OM2ETsIuIQ4UJeqKwDXKKAv5Wd/k/XC
RH+6cWT4vIYwnHLZhe0zauQ1Tq/Wi5mFu0uj9VqASb4skCMCxpt05ADvyJFvLy4c
cm6nS5KYX73oDg1pgOa38z2zKuwMdc1wJb6ZDqQS6FfC5zPpZ1siFD+pDfeRSI2s
xn1y5xw43wR1cpqVvZqzemeT5QpYDQos4Ld4JQU6D8y99m/9/riIn7DvtsOb4LYV
EQIDAQAB
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

export function createFirstFactorToken() {
  // The first factor token is arbitrary and opaque from the client's perspective
  return "uf_test_first_factor_207a4d56ce7e40bc9dafb0918fb6599a";
}

export function createMfaRequiredResponse({
  mode,
  firstFactor,
  secondFactors,
}) {
  const _firstFactor = firstFactor || {
    strategy: "password",
    channel: "email",
  };
  const _secondFactors = secondFactors || [
    {
      strategy: "totp",
      channel: "authenticator",
      isConfiguredByUser: false,
    },
    {
      strategy: "verificationCode",
      channel: "sms",
      isConfiguredByUser: false,
    },
  ];
  const response = {
    mode: mode || "live",
    message: "MFA required",
    isMfaRequired: true,
    isEmailConfirmed: true,
    isPhoneNumberConfirmed: false,
    firstFactorToken: createFirstFactorToken(),
    authentication: {
      firstFactor: _firstFactor,
      secondFactors: _secondFactors,
    },
  };
  return { data: response };
}

export function setMfaRequired() {
  authenticationData.secondFactors = [
    {
      strategy: "totp",
      channel: "authenticator",
      isConfiguredByUser: false,
    },
    {
      strategy: "verificationCode",
      channel: "sms",
      isConfiguredByUser: false,
    },
  ];
  authenticationData.firstFactorToken = createFirstFactorToken();
}

export function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

export function mockWindow({ origin, href }) {
  // Using `window.location.assign` rather than `window.location.href =` because
  // JSDOM throws an error "Error: Not implemented: navigation (except hash changes)"
  // JSDOM complains about this is because JSDOM does not implement methods like window.alert, window.location.assign, etc.
  // https://stackoverflow.com/a/54477957
  delete window.location;
  window.location = {
    assign: vi.fn(),
    origin,
    href,
  };
}

export default {
  accessTokenUserDefaults,
  defaultIdTokenProperties,
  idTokenUserDefaults,
  sharedTokenProperties,
};
