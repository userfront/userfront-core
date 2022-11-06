import { store } from "./store.js";
import { get } from "./api.js";

export const mfaData = {
  firstFactors: [],
  secondFactors: [],
  firstFactorToken: null
}

function factorToString({ strategy, channel }) {
  return `${channel}:${strategy}`;
}

export async function updateFirstFactors() {
  if (!store.tenantId) {
    return mfaData.firstFactors = [];
  }
  const authFlow = await get(`/tenants/${store.tenantId}/flows/default`);
  if (!authFlow) {
    return null;
  }
  return mfaData.firstFactors = authFlow.firstFactors.map(factor => factorToString(factor));
}

export function isMfaRequired() {
  return !!mfaData.firstFactorToken;
}

export function handleMfaRequired(response) {
  if (!response.isMfaRequired) {
    return;
  }
  mfaData.secondFactors = response.authentication.secondFactors.map(factor => factorToString(factor));
  mfaData.firstFactorToken = response.firstFactorToken;
}

export function getMfaHeaders() {
  if (mfaData.firstFactorToken) {
    return {
      authorization: `Bearer ${mfaData.firstFactorToken}`
    }
  }
  return {}
}

export function clearMfa() {
  mfaData.secondFactors = [];
  mfaData.firstFactorToken = null;
}

export function resetMfa() {
  clearMfa();
  mfaData.firstFactors = [];
}
