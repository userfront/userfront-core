import { mfaData, getMfaHeaders } from "../../src/mfa.js";

export function assertMfaStateMatches(mfaRequiredResponse) {
  expect(mfaData.secondFactors).toEqual(mfaRequiredResponse.authorization.secondFactors)
  expect(mfaData.firstFactorToken).toEqual(mfaRequiredResponse.firstFactorToken)
}

export function assertMfaHeadersPresent(mockApiFn) {
  expect(mfaData.firstFactorToken).not.toBeNull();
  expect(mockApiFn.mock.lastCall[2]).toEqual({
    headers: {
      authorization: `Bearer ${mfaData.firstFactorToken}`
    }
  })
}

export function assertMfaHeadersAbsent(mockApiFn) {
  const options = mockApiFn.mock.lastcall[2]
  const mfaHeaders = getMfaHeaders();
  if (mfaHeaders.authorization) {
    if (options.headers && options.headers.authorization) {
      expect(options.headers.authorization).not.toEqual(mfaHeaders.authorization)
    }
  }
}