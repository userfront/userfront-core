import Userfront from "../src/index.js";
import api from "../src/api.js";
import {
  createAccessToken,
  createIdToken,
  createRefreshToken,
  idTokenUserDefaults,
  mockWindow,
} from "./config/utils.js";
import { loginWithTotp } from "../src/totp.js";
import { exchange } from "../src/refresh.js";

jest.mock("../src/api.js");
jest.mock("../src/refresh.js");

const tenantId = "abcd9876";

mockWindow({
  origin: "https://example.com",
  href: "https://example.com/login",
});

// Mock API response
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

describe("loginWithTotp()", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
  });

  afterEach(() => {
    window.location.assign.mockClear();
  });

  it("should login and redirect", async () => {
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

    // Should have redirected correctly
    expect(window.location.assign).toHaveBeenCalledWith("/dashboard");
  });

  it("should read redirect from the URL if not present", async () => {
    // To ensure they are updated on client
    const newAttrs = {
      email: "totp-2@example.com",
      username: "totp-2",
    };
    const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
    mockResponseCopy.data.tokens.id.value = createIdToken(newAttrs);

    const redirect = "/post-login";

    // Visit a URL with ?token=&uuid=&redirect=
    window.location.href = `https://example.com/login?redirect=${redirect}`;

    // Mock the API response
    api.post.mockImplementationOnce(() => mockResponseCopy);

    const payload = {
      userId: 123,
      totpCode: "456789",
    };

    // Call loginWithTotp()
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

    // Should have redirected correctly
    expect(window.location.assign).toHaveBeenCalledWith(redirect);

    // Reset the URL
    window.location.href = `https://example.com/login`;
  });

  it("should not redirect if redirect = false", async () => {
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

    // Should not have redirected
    expect(window.location.assign).not.toHaveBeenCalled();
  });
});
