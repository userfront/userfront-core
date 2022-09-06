import Cookies from "js-cookie";
import Userfront from "../src/index.js";
import {
  createAccessToken,
  createIdToken,
  createRefreshToken,
  addMinutes,
} from "./config/utils.js";
import * as Refresh from "../src/refresh.js";
import { store } from "../src/store.js";

jest.mock("../src/refresh.js");

const tenantId = "abcd4321";
const mockAccessToken = createAccessToken();
const mockIdToken = createIdToken();

describe("Userfront.tokens helpers", () => {
  beforeAll(() => {
    // Set mock cookies
    Cookies.set(`id.${tenantId}`, mockIdToken, {});
    Cookies.set(`access.${tenantId}`, mockAccessToken, {});
    // Initialize Userfront
    Userfront.init(tenantId);
  });

  it("tokens.accessToken should give JWT access token", () => {
    expect(Userfront.tokens.accessToken).toEqual(mockAccessToken);
  });

  it("tokens.idToken should give JWT ID token", () => {
    expect(Userfront.tokens.idToken).toEqual(mockIdToken);
  });

  it("tokens.accessTokenName should give name of access token", () => {
    expect(Userfront.tokens.accessTokenName).toEqual(`access.${tenantId}`);
  });

  it("tokens.idTokenName should give name of ID token", () => {
    expect(Userfront.tokens.idTokenName).toEqual(`id.${tenantId}`);
  });

  it("tokens.refresh should equal the refresh method", () => {
    expect(Userfront.tokens.refresh).toEqual(Refresh.refresh);
  });
});
