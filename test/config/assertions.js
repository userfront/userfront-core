import { authenticationData, getMfaHeaders } from "../../src/authentication.js";

export function assertMfaStateMatches(mfaRequiredResponse) {
  expect(authenticationData.secondFactors).toEqual(
    mfaRequiredResponse.data.authentication.secondFactors
  );
  expect(authenticationData.firstFactorToken).toEqual(
    mfaRequiredResponse.data.firstFactorToken
  );
}

export function assertNoUser(user) {
  const userFields = Object.values(user).filter(
    (val) => typeof val !== "function"
  );
  expect(userFields).toEqual([]);
}

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
