import { authenticationData } from "../../src/authentication.js";
import { getMfaHeaders } from "../../src/mfa.js";

/**
 * Assert that authenticationData matches the secondFactors
 * and the firstFactorToken
 * @param {Object} response
 */
export function assertAuthenticationDataMatches(response) {
  // secondFactors
  expect(authenticationData.secondFactors).toEqual(
    response.data.authentication.secondFactors
  );
  // firstFactorToken
  expect(authenticationData.firstFactorToken).toEqual(
    response.data.firstFactorToken
  );
}

export const pkceParams = (codeChallenge) =>
  expect.objectContaining({
    params: {
      code_challenge: expect.stringContaining(codeChallenge),
    },
  });

export const mfaHeaders = expect.objectContaining({
  headers: {
    authorization: expect.stringMatching(/^Bearer uf_test_first_factor/),
  },
});
export const noMfaHeaders = expect.not.objectContaining({
  headers: {
    authorization: expect.stringMatching(/^Bearer uf_test_first_factor/),
  },
});

export const withMfaHeaders = (options = {}) => {
  return {
    ...options,
    headers: getMfaHeaders(),
  };
};

export const withoutMfaHeaders = (options) => {
  if (!options) {
    return noMfaHeaders;
  }
  return options;
};
