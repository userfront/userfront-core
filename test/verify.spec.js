import axios from "axios";
import jwt from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";

import utils from "./utils";
import Userfront from "../src/index.js";
import { apiUrl } from "../src/constants.js";

// prettier-ignore
const publicKey = "-----BEGIN PUBLIC KEY-----MFwwDQYJKovIhvcNAQEBBQADSwAwSAJBAMcUP/uWxcSaY40nmh6gmgCBxMQA5XD7YS2UOq+Vd8zKA7QjUUHY+besrZ3Dzol/BCrHne6npLjr4deX1IQw/VkCAwEAAQ==-----END PUBLIC KEY-----"
const jwkId = "foo-bar-baz-qux";
const tenantId = "abcdefg";
Userfront.init(tenantId);

jest.mock("axios");
jest.mock("jwks-rsa", () => {
  return {
    __esModule: true,
    JwksClient: jest.fn(),
  };
});

describe("verifyToken", () => {
  Userfront.setCookiesAndTokens = Userfront.__get__("setCookiesAndTokens");

  beforeAll(() => {
    Userfront.init(tenantId);

    // Create and set access & ID tokens
    Userfront.setCookiesAndTokens({
      access: {
        value: utils.createAccessToken(),
      },
      id: {
        value: utils.createIdToken(),
      },
      refresh: {
        value: "",
      },
    });

    // Mock request of /jwks/{mode}
    axios.get.mockImplementationOnce(() =>
      Promise.resolve({
        keys: [
          {
            kid: jwkId,
            kty: "RSA",
            use: "sig",
            alg: "RS256",
            n: "zLjFN9nN67jL/pwGtB",
            e: "AQAB",
          },
        ],
      })
    );

    jwt.verify = jest.fn();
    // Return decoded with token `kid`
    jwt.decode = jest.fn(() => {
      return {
        header: {
          alg: "RS256",
          typ: "JWT",
          kid: jwkId,
        },
        payload: {},
        signature: "mock-signature",
      };
    });
  });

  it("should call /jwks/{mode} endpoint and verify token", async () => {
    // Mock JwksClient constructor & instance calls
    // Implementation flow:
    // 1. const client = new JwksClient()
    // 2. const key = client.getSigningKey()
    // 3. const publicKey = key.getPublicKey()
    const getPublicKey = jest.fn(() => publicKey);
    const getSigningKey = jest.fn(() => {
      return { getPublicKey };
    });
    JwksClient.mockImplementation(() => {
      return { getSigningKey };
    });

    await Userfront.verifyToken(Userfront.store.accessToken);

    // Assert decoding and fetching of JWKS
    expect(jwt.decode).toHaveBeenCalledTimes(1);
    expect(jwt.decode).toHaveBeenCalledWith(Userfront.store.accessToken, {
      complete: true,
    });
    expect(JwksClient).toHaveBeenCalledTimes(1);
    expect(JwksClient).toHaveBeenCalledWith({
      jwksUri: `${apiUrl}tenants/${tenantId}/jwks/${Userfront.store.mode}`,
      requestHeaders: { origin: window.location.origin },
    });
    expect(getSigningKey).toHaveBeenCalledTimes(1);
    expect(getSigningKey).toHaveBeenCalledWith(jwkId);
    expect(getPublicKey).toHaveBeenCalledTimes(1);
    expect(getPublicKey).toHaveReturnedWith(publicKey);

    // Assert verification
    expect(jwt.verify).toHaveBeenCalledTimes(1);
    expect(jwt.verify).toHaveBeenCalledWith(
      Userfront.store.accessToken,
      publicKey
    );
  });
});
