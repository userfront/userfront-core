import Userfront from "../src/index.js";
import api from "../src/api.js";
import {
  createAccessToken,
  createIdToken,
  createRefreshToken,
  idTokenUserDefaults,
  mockWindow,
} from "./config/utils.js";
import {
  sendLoginLink,
  loginWithLink,
  sendPasswordlessLink,
} from "../src/link.js";
import { exchange } from "../src/refresh.js";

jest.mock("../src/refresh.js");
jest.mock("../src/api.js");

mockWindow({
  origin: "https://example.com",
  href: "https://example.com/login",
});

const tenantId = "abcd9876";

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

describe("sendLoginLink", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
  });

  it("should respond with link information", async () => {
    const mockResponse = {
      data: {
        message: "OK",
        result: {
          email: "link-requester@example.com",
          whatever: "else",
        },
      },
    };
    // Mock the API response
    api.post.mockImplementationOnce(() => mockResponse);

    // Call sendLoginLink()
    const data = await sendLoginLink(mockResponse.data.result.email);

    // Should have sent the proper API request
    expect(api.post).toHaveBeenCalledWith(`/auth/link`, {
      tenantId,
      email: mockResponse.data.result.email,
    });

    // Should have returned the proper value
    expect(data).toEqual(mockResponse.data);
  });

  it(`error should respond with whatever the server sends`, async () => {
    // Mock the API response
    const mockResponse = {
      data: {
        error: "Bad Request",
        message: `That's a silly link request.`,
        statusCode: 400,
      },
    };
    api.post.mockImplementationOnce(() => Promise.reject(mockResponse));
    expect(() => sendLoginLink({ email: "email@example.com" })).rejects.toEqual(
      mockResponse
    );
  });
});

describe("sendPasswordlessLink", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
  });

  it("should send a request and respond with OK", async () => {
    // Mock the API response
    const mockResponse = {
      data: {
        message: "OK",
        result: {
          email: "link-registered@example.com",
          whatever: "else",
        },
      },
    };
    api.post.mockImplementationOnce(() => mockResponse);

    // Call sendPasswordlessLink()
    const payload = {
      email: mockResponse.data.result.email,
      name: idTokenUserDefaults.name,
      username: idTokenUserDefaults.username,
      data: idTokenUserDefaults.res,
      options: {
        custom: "option",
      },
    };
    const data = await sendPasswordlessLink({
      email: payload.email,
      name: payload.name,
      username: payload.username,
      userData: payload.res,
      options: payload.options,
    });

    // Should have sent the proper API request
    expect(api.post).toHaveBeenCalledWith(`/auth/link`, {
      tenantId,
      ...payload,
    });

    // Should have returned the response exactly
    expect(data).toEqual(mockResponse.data);
  });

  it("should respond with whatever error the server sends", async () => {
    // Mock the API response
    const mockResponseErr = {
      data: {
        error: "Bad Request",
        message: `That's a dumb email address.`,
        statusCode: 400,
      },
    };
    api.post.mockImplementationOnce(() => Promise.reject(mockResponseErr));
    expect(
      sendPasswordlessLink({
        email: "valid@example.com",
      })
    ).rejects.toEqual(mockResponseErr);
  });
});

describe("loginWithLink", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
    window.location.assign.mockClear();
  });

  it("should login and redirect", async () => {
    // Update the userId to ensure it is overwritten
    const newAttrs = {
      userId: 2091,
      email: "linker@example.com",
    };
    const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
    mockResponseCopy.data.tokens.id.value = createIdToken(newAttrs);

    // Mock the API response
    api.put.mockImplementationOnce(() => mockResponseCopy);

    // Call loginWithLink()
    const payload = {
      token: "some-token",
      uuid: "some-uuid",
    };
    const data = await loginWithLink(payload);

    // Should have sent the proper API request
    expect(api.put).toHaveBeenCalledWith(`/auth/link`, {
      tenantId,
      ...payload,
    });

    // Should return the correct value
    expect(data).toEqual(mockResponseCopy.data);

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponseCopy.data);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(newAttrs.email);
    expect(Userfront.user.userId).toEqual(newAttrs.userId);

    // Should have redirected correctly
    expect(window.location.assign).toHaveBeenCalledWith("/dashboard");
  });

  it("should read token, uuid, and redirect from the URL if not present", async () => {
    // Update the userId to ensure it is overwritten
    const newAttrs = {
      userId: 98100,
      email: "linker-2@example.com",
    };
    const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
    mockResponseCopy.data.tokens.id.value = createIdToken(newAttrs);

    const query = {
      token: "some-token",
      uuid: "some-uuid",
    };

    const redirect = "/post-login";

    // Visit a URL with ?token=&uuid=&redirect=
    window.location.href = `https://example.com/login?token=${query.token}&uuid=${query.uuid}&redirect=${redirect}`;

    // Mock the API response
    api.put.mockImplementationOnce(() => mockResponseCopy);

    // Call loginWithLink()
    const data = await loginWithLink();

    // Should have sent the proper API request
    expect(api.put).toHaveBeenCalledWith(`/auth/link`, {
      tenantId,
      ...query,
    });

    // Should return the correct value
    expect(data).toEqual(mockResponseCopy.data);

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponseCopy.data);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(newAttrs.email);
    expect(Userfront.user.userId).toEqual(newAttrs.userId);

    // Should have redirected correctly
    expect(window.location.assign).toHaveBeenCalledWith(redirect);

    // Reset the URL
    window.location.href = `https://example.com/login`;
  });

  it("should not redirect if redirect = false", async () => {
    api.put.mockImplementationOnce(() => mockResponse);

    // Call loginWithLink()
    const payload = {
      token: "some-token",
      uuid: "some-uuid",
    };
    const data = await loginWithLink({
      redirect: false,
      ...payload,
    });

    // Should have sent the proper API request
    expect(api.put).toHaveBeenCalledWith(`/auth/link`, {
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

  it("should return MFA options if tenant requires", async () => {
    exchange.mockClear();

    const mockMfaOptionsResponse = {
      data: {
        mode: "live",
        allowedStrategies: ["verificationCode"],
        allowedChannels: ["sms"],
        firstFactorCode: "204a8def-651c-4ab2-9ca0-1e3fca9e280a",
      },
    };

    api.put.mockImplementationOnce(() => mockMfaOptionsResponse);

    const payload = {
      token: "some-token",
      uuid: "some-uuid",
    };
    const data = await loginWithLink(payload);

    // Should have sent the proper API request
    expect(api.put).toHaveBeenCalledWith(`/auth/link`, {
      tenantId,
      ...payload,
    });

    // Should not have set the user object, called exchange, or redirected
    expect(Userfront.user).toBeUndefined;
    expect(exchange).not.toHaveBeenCalled();
    expect(window.location.assign).not.toHaveBeenCalled();

    // Should have returned MFA options & firstFactorCode
    expect(data).toEqual(mockMfaOptionsResponse.data);
  });
});
