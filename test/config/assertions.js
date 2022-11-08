import { mfaData, factorToString } from "../../src/mfa.js";

export function assertMfaStateMatches(mfaRequiredResponse) {
  expect(mfaData.secondFactors).toEqual(mfaRequiredResponse.data.authentication.secondFactors.map(factorToString))
  expect(mfaData.firstFactorToken).toEqual(mfaRequiredResponse.data.firstFactorToken)
}

export function assertNoUser(user) {
  const userFields = Object.values(user).filter(val => typeof val !== "function");
  expect(userFields).toEqual([]);
}

export const mfaHeaders = expect.objectContaining({ headers: { authorization: expect.stringMatching(/^Bearer uf_test_first_factor/) } })
export const noMfaHeaders = expect.not.objectContaining({ headers: { authorization: expect.stringMatching(/^Bearer uf_test_first_factor/) } })

export const withMfaHeaders = (options = {}) => {
  return {
    ...options,
    headers: getMfaHeaders()
  }
}

export const withoutMfaHeaders = (options) => {
  if (!options) {
    return noMfaHeaders;
  }
  return options
}