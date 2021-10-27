import axios from "axios";
import jwt from "jsonwebtoken";
// import { JwksClient } from "jwks-rsa";

import { createAccessToken, createIdToken } from "./config/utils.js";
import Userfront from "../src/index.js";
import { apiUrl } from "../src/constants.js";

jest.mock("axios");
// jest.mock("jwks-rsa", () => {
//   return {
//     __esModule: true,
//     JwksClient: jest.fn(),
//   };
// });

// prettier-ignore
const mockPublicKey = "mock-public-key"
const jwkId = "foo-bar-baz-qux";
const tenantId = "abcdefg";

xdescribe("verifyToken", () => {
  Userfront.setCookiesAndTokens = Userfront.__get__("setCookiesAndTokens");

  beforeEach(() => {
    Userfront.__set__("setUser", jest.fn());
    Userfront.init(tenantId);

    // Create and set access & ID tokens
    Userfront.setCookiesAndTokens({
      access: {
        value: createAccessToken(),
      },
      id: {
        value: createIdToken(),
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
    const getPublicKey = jest.fn(() => mockPublicKey);
    const getSigningKey = jest.fn(() => {
      return { getPublicKey };
    });
    JwksClient.mockImplementation(() => {
      return { getSigningKey };
    });

    await Userfront.verifyToken(Userfront.tokens.accessToken);

    // Assert decoding and fetching of JWKS
    expect(jwt.decode).toHaveBeenCalledTimes(1);
    expect(jwt.decode).toHaveBeenCalledWith(Userfront.tokens.accessToken, {
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
    expect(getPublicKey).toHaveReturnedWith(mockPublicKey);

    // Assert verification
    expect(jwt.verify).toHaveBeenCalledTimes(1);
    expect(jwt.verify).toHaveBeenCalledWith(
      Userfront.tokens.accessToken,
      mockPublicKey
    );
  });

  it("should throw if no token provided", async () => {
    expect(Userfront.verifyToken()).rejects.toThrow("Missing token");
  });

  it("should throw if token kid is not provided", async () => {
    // Return decoded token without `kid` in header
    jwt.decode.mockImplementationOnce(() => {
      return {
        header: {
          alg: "RS256",
          typ: "JWT",
        },
        payload: {},
        signature: "mock-signature",
      };
    });

    expect(Userfront.verifyToken(Userfront.tokens.accessToken)).rejects.toThrow(
      "Token kid not defined"
    );
  });

  it("should throw if public key is not found", async () => {
    const getPublicKey = jest.fn(() => null);
    const getSigningKey = jest.fn(() => {
      return { getPublicKey };
    });
    JwksClient.mockImplementationOnce(() => {
      return { getSigningKey };
    });

    expect(Userfront.verifyToken(Userfront.tokens.accessToken)).rejects.toThrow(
      "Public key not found"
    );
  });

  it("should throw if token verification fails", async () => {
    const getPublicKey = jest.fn(() => mockPublicKey);
    const getSigningKey = jest.fn(() => {
      return { getPublicKey };
    });
    JwksClient.mockImplementation(() => {
      return { getSigningKey };
    });

    jwt.verify.mockImplementationOnce(() => {
      throw new Error("JWT malformed");
    });

    expect(Userfront.verifyToken(Userfront.tokens.accessToken)).rejects.toThrow(
      "Token verification failed"
    );
  });
});
