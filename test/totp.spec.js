import Userfront from "../src/index.js";
import api from "../src/api.js";
import {
  createAccessToken,
  createIdToken,
  createRefreshToken,
  idTokenUserDefaults,
} from "./config/utils.js";
import { setCookie, removeAllCookies } from "../src/cookies.js";
import { handleRedirect } from "../src/url.js";
import { loginWithTotp } from "../src/totp.js";
import { exchange } from "../src/refresh.js";

jest.mock("../src/api.js");
jest.mock("../src/refresh.js");
jest.mock("../src/url.js");

const tenantId = "abcd9876";

describe("loginWithTotp()", () => {
  // Mock API login response
  const mockResponse = {
    data: {
      tokens: {
        access: { value: createAccessToken() },
        id: { value: createIdToken() },
        refresh: { value: createRefreshToken() },
      },
      nonce: "nonce-value",
      redirectTo: "/dashboard",
    },
  };
  beforeEach(() => {
    Userfront.init(tenantId);
    jest.resetAllMocks();
  });

  it("should login with totpCode", async () => {
    // To ensure they are updated on client
    const newAttrs = {
      email: "totp-user-updated@example.com",
      username: "totp-user-updated",
    };
    const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
    mockResponseCopy.data.tokens.id.value = createIdToken(newAttrs);

    // Mock the API response
    api.post.mockImplementationOnce(() => mockResponseCopy);

    // Call loginWithTotp()
    const payload = {
      userId: 555,
      totpCode: "123456",
    };
    const data = await loginWithTotp(payload);

    // Should have sent the proper API request
    expect(api.post).toHaveBeenCalledWith(`/auth/totp`, {
      tenantId,
      ...payload,
    });

    // Should return the correct value
    expect(data).toEqual(mockResponseCopy.data);

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponseCopy.data);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(newAttrs.email);
    expect(Userfront.user.username).toEqual(newAttrs.username);

    // Should redirect correctly
    expect(handleRedirect).toHaveBeenCalledWith({
      redirect: undefined,
      data: mockResponseCopy.data,
    });
  });

  it("should login with backupCode", async () => {
    // To ensure they are updated on client
    const newAttrs = {
      email: "totp-user-updated@example.com",
      username: "totp-user-updated",
    };
    const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
    mockResponseCopy.data.tokens.id.value = createIdToken(newAttrs);

    // Mock the API response
    api.post.mockImplementationOnce(() => mockResponseCopy);

    // Call loginWithTotp()
    const payload = {
      userId: 555,
      backupCode: "aaaaa-11111",
    };
    const data = await loginWithTotp(payload);

    // Should have sent the proper API request
    expect(api.post).toHaveBeenCalledWith(`/auth/totp`, {
      tenantId,
      ...payload,
    });

    // Should return the correct value
    expect(data).toEqual(mockResponseCopy.data);

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponseCopy.data);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(newAttrs.email);
    expect(Userfront.user.username).toEqual(newAttrs.username);

    // Should redirect correctly
    expect(handleRedirect).toHaveBeenCalledWith({
      redirect: undefined,
      data: mockResponseCopy.data,
    });
  });

  it("should login with explicit redirect", async () => {
    api.post.mockImplementationOnce(() => mockResponse);

    const redirect = "/totp-custom";

    // Call loginWithTotp()
    const payload = {
      userId: 123,
      totpCode: "123456",
    };
    const data = await loginWithTotp({
      redirect,
      ...payload,
    });

    // Should have sent the proper API request
    expect(api.post).toHaveBeenCalledWith(`/auth/totp`, {
      tenantId,
      ...payload,
    });

    // Should return the correct value
    expect(data).toEqual(mockResponse.data);

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponse.data);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(idTokenUserDefaults.email);
    expect(Userfront.user.userId).toEqual(idTokenUserDefaults.userId);

    // Should redirect correctly
    expect(handleRedirect).toHaveBeenCalledWith({
      redirect,
      data: mockResponse.data,
    });
  });

  it("should login with redirect = false", async () => {
    api.post.mockImplementationOnce(() => mockResponse);

    // Call loginWithTotp()
    const payload = {
      userId: 123,
      totpCode: "123456",
    };
    const data = await loginWithTotp({
      redirect: false,
      ...payload,
    });

    // Should have sent the proper API request
    expect(api.post).toHaveBeenCalledWith(`/auth/totp`, {
      tenantId,
      ...payload,
    });

    // Should return the correct value
    expect(data).toEqual(mockResponse.data);

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponse.data);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(idTokenUserDefaults.email);
    expect(Userfront.user.userId).toEqual(idTokenUserDefaults.userId);

    // Should redirect correctly
    expect(handleRedirect).toHaveBeenCalledWith({
      redirect: false,
      data: mockResponse.data,
    });
  });
});

describe("user.getTotp()", () => {
  // Mock API TOTP response
  const mockResponse = {
    data: {
      totpSecret: "AAAAAAAA12LU7ISQ",
      qrCode: "data:image/png;base64...",
      backupCodes: ["60bb6-9393a", "1b8ef-e3e4b", "1488f-7cd2e"],
    },
  };

  const accessToken = createAccessToken();

  beforeEach(() => {
    Userfront.init(tenantId);
    // Log the user in
    setCookie(accessToken, { secure: "true", sameSite: "Lax" }, "access");
    jest.resetAllMocks();
  });

  it("should request the user's TOTP information", async () => {
    // Mock the API response
    api.get.mockImplementationOnce(() => mockResponse);

    // Call user.getTotp()
    const data = await Userfront.user.getTotp();

    // Should have sent the proper API request
    expect(api.get).toHaveBeenCalledWith(`/auth/totp`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(data).toEqual(mockResponse.data);
  });

  it("should throw an error if the user is not logged in", async () => {
    // Log the user out
    removeAllCookies();

    // Call user.getTotp()
    expect(() => Userfront.user.getTotp()).rejects.toThrowError(
      "getTotp() was called without a JWT access token"
    );
  });
});
