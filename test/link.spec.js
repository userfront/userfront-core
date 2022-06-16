import axios from "axios";

import Userfront from "../src/index.js";
import {
  createAccessToken,
  createIdToken,
  createRefreshToken,
  idTokenUserDefaults,
} from "./config/utils.js";
import { login } from "../src/login.js";
import { sendLoginLink } from "../src/link.js";
import { exchange } from "../src/refresh.js";

jest.mock("../src/refresh.js", () => {
  return {
    __esModule: true,
    exchange: jest.fn(),
  };
});
jest.mock("axios");

const tenantId = "abcd9876";
const customBaseUrl = "https://custom.example.com/api/v1/";

// Using `window.location.assign` rather than `window.location.href =` because
// JSDOM throws an error "Error: Not implemented: navigation (except hash changes)"
// JSDOM complains about this is because JSDOM does not implement methods like window.alert, window.location.assign, etc.
// https://stackoverflow.com/a/54477957
delete window.location;
window.location = {
  assign: jest.fn(),
  origin: "https://example.com",
  href: "https://example.com/login",
};

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
          to: "link-requester@example.com",
          whatever: "else",
        },
      },
    };
    // Mock the API response
    axios.post.mockImplementationOnce(() => mockResponse);

    // Call sendLoginLink()
    const res = await sendLoginLink(mockResponse.data.result.to);

    // Should have sent the proper API request
    expect(axios.post).toHaveBeenCalledWith(
      `https://api.userfront.com/v0/auth/link`,
      {
        tenantId,
        email: mockResponse.data.result.to,
      }
    );

    // Should have returned the proper value
    expect(res).toEqual(mockResponse.data);
  });

  it("should respond with link information using custom baseUrl", async () => {
    Userfront.init(tenantId, {
      baseUrl: customBaseUrl,
    });

    const mockResponse = {
      data: {
        message: "OK",
        result: {
          to: "link-requester@example.com",
          whatever: "else",
        },
      },
    };
    // Mock the API response
    axios.post.mockImplementationOnce(() => mockResponse);

    // Call sendLoginLink()
    const res = await sendLoginLink(mockResponse.data.result.to);

    // Should have sent the proper API request
    expect(axios.post).toHaveBeenCalledWith(`${customBaseUrl}auth/link`, {
      tenantId,
      email: mockResponse.data.result.to,
    });

    // Should have returned the proper value
    expect(res).toEqual(mockResponse.data);
  });

  it(`error should respond with whatever the server sends`, async () => {
    // Mock the API response
    const mockResponse = {
      response: {
        data: {
          error: "Bad Request",
          message: `That's a silly link request.`,
          statusCode: 400,
        },
      },
    };
    axios.post.mockImplementationOnce(() => Promise.reject(mockResponse));
    expect(sendLoginLink({ email: "email@example.com" })).rejects.toEqual(
      new Error(mockResponse.response.data.message)
    );
  });
});

describe("loginWithLink", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
  });

  afterEach(() => {
    window.location.assign.mockClear();
  });

  it("should login and redirect", async () => {
    // Update the userId to ensure it is overwritten
    const newUserAttrs = {
      userId: 2091,
      email: "linker@example.com",
    };
    const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
    mockResponseCopy.data.tokens.id.value = createIdToken(newUserAttrs);

    // Mock the API response
    axios.put.mockImplementationOnce(() => mockResponseCopy);

    // Call login()
    const payload = {
      token: "some-token",
      uuid: "some-uuid",
    };
    const res = await login({
      method: "link",
      ...payload,
    });

    // Should have sent the proper API request
    expect(axios.put).toHaveBeenCalledWith(
      `https://api.userfront.com/v0/auth/link`,
      {
        tenantId,
        ...payload,
      }
    );

    // Should return the correct value
    expect(res).toEqual(mockResponseCopy.data);

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponseCopy.data);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(newUserAttrs.email);
    expect(Userfront.user.userId).toEqual(newUserAttrs.userId);

    // Should have redirected correctly
    expect(window.location.assign).toHaveBeenCalledWith("/dashboard");
  });

  it("should login and redirect using custom baseUrl", async () => {
    Userfront.init(tenantId, {
      baseUrl: customBaseUrl,
    });

    // Update the userId to ensure it is overwritten
    const newUserAttrs = {
      userId: 2091,
      email: "linker@example.com",
    };
    const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
    mockResponseCopy.data.tokens.id.value = createIdToken(newUserAttrs);

    // Mock the API response
    axios.put.mockImplementationOnce(() => mockResponseCopy);

    // Call login()
    const payload = {
      token: "some-token",
      uuid: "some-uuid",
    };
    const res = await login({
      method: "link",
      ...payload,
    });

    // Should have sent the proper API request
    expect(axios.put).toHaveBeenCalledWith(`${customBaseUrl}auth/link`, {
      tenantId,
      ...payload,
    });

    // Should return the correct value
    expect(res).toEqual(mockResponseCopy.data);
  });

  it("should read token, uuid, and redirect from the URL if not present", async () => {
    // Update the userId to ensure it is overwritten
    const newUserAttrs = {
      userId: 98100,
      email: "linker-2@example.com",
    };
    const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
    mockResponseCopy.data.tokens.id.value = createIdToken(newUserAttrs);

    const query = {
      token: "some-token",
      uuid: "some-uuid",
    };

    const redirect = "/post-login";

    // Visit a URL with ?token=&uuid=&redirect=
    window.location.href = `https://example.com/login?token=${query.token}&uuid=${query.uuid}&redirect=${redirect}`;

    // Mock the API response
    axios.put.mockImplementationOnce(() => mockResponseCopy);

    // Call login()
    const res = await login({ method: "link" });

    // Should have sent the proper API request
    expect(axios.put).toHaveBeenCalledWith(
      `https://api.userfront.com/v0/auth/link`,
      {
        tenantId,
        ...query,
      }
    );

    // Should return the correct value
    expect(res).toEqual(mockResponseCopy.data);

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponseCopy.data);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(newUserAttrs.email);
    expect(Userfront.user.userId).toEqual(newUserAttrs.userId);

    // Should have redirected correctly
    expect(window.location.assign).toHaveBeenCalledWith(redirect);

    // Reset the URL
    window.location.href = `https://example.com/login`;
  });

  it("should not redirect if redirect = false", async () => {
    axios.put.mockImplementationOnce(() => mockResponse);

    // Call login()
    const payload = {
      token: "some-token",
      uuid: "some-uuid",
    };
    const res = await login({
      method: "link",
      redirect: false,
      ...payload,
    });

    // Should have sent the proper API request
    expect(axios.put).toHaveBeenCalledWith(
      `https://api.userfront.com/v0/auth/link`,
      {
        tenantId,
        ...payload,
      }
    );

    // Should return the correct value
    expect(res).toEqual(mockResponse.data);

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

    axios.put.mockImplementationOnce(() => mockMfaOptionsResponse);

    const payload = {
      token: "some-token",
      uuid: "some-uuid",
    };
    const res = await login({
      method: "link",
      ...payload,
    });

    // Should have sent the proper API request
    expect(axios.put).toHaveBeenCalledWith(
      `https://api.userfront.com/v0/auth/link`,
      {
        tenantId,
        ...payload,
      }
    );

    // Should not have set the user object, called exchange, or redirected
    expect(Userfront.user).toBeUndefined;
    expect(exchange).not.toHaveBeenCalled();
    expect(window.location.assign).not.toHaveBeenCalled();

    // Should have returned MFA options & firstFactorCode
    expect(res).toEqual(mockMfaOptionsResponse.data);
  });
});
