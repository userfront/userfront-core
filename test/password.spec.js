import Userfront from "../src/index.js";
import api from "../src/api.js";
import {
  createAccessToken,
  createIdToken,
  createRefreshToken,
  idTokenUserDefaults,
} from "./config/utils.js";
import { exchange } from "../src/refresh.js";
import { signupWithPassword, loginWithPassword } from "../src/password.js";
import { handleRedirect } from "../src/url.js";

jest.mock("../src/api.js");
jest.mock("../src/refresh.js");
jest.mock("../src/url.js");

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

describe("signupWithPassword()", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
    jest.resetAllMocks();
  });

  it("should send a request, set access and ID cookies, and initiate nonce exchange", async () => {
    // Mock the API response
    api.post.mockImplementationOnce(() => mockResponse);

    // Call signupWithPassword()
    const payload = {
      email: idTokenUserDefaults.email,
      name: idTokenUserDefaults.name,
      userData: idTokenUserDefaults.data,
      password: "something",
    };
    const data = await signupWithPassword(payload);

    // Should have sent the proper API request
    expect(api.post).toHaveBeenCalledWith(`/auth/create`, {
      tenantId,
      email: payload.email,
      name: payload.name,
      data: payload.userData,
      password: payload.password,
    });

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponse.data);

    // Should have returned the proper value
    expect(data).toEqual(mockResponse.data);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(payload.email);
    expect(Userfront.user.userId).toEqual(idTokenUserDefaults.userId);

    // Should call handleRedirect correctly
    expect(handleRedirect).toHaveBeenCalledWith({
      redirect: payload.redirect,
      data: mockResponse.data,
    });
  });

  it("should sign up and redirect to provided path", async () => {
    // Mock the API response
    api.post.mockImplementationOnce(() => mockResponse);

    // Call signupWithPassword()
    const payload = {
      email: idTokenUserDefaults.email,
      password: "something",
      redirect: "/custom",
    };
    const data = await signupWithPassword(payload);

    // Should have sent the proper API request
    expect(api.post).toHaveBeenCalledWith(`/auth/create`, {
      tenantId,
      email: payload.email,
      password: payload.password,
    });

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponse.data);

    // Should have returned the proper value
    expect(data).toEqual(mockResponse.data);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(payload.email);
    expect(Userfront.user.userId).toEqual(idTokenUserDefaults.userId);

    // Should call handleRedirect correctly
    expect(handleRedirect).toHaveBeenCalledWith({
      redirect: payload.redirect,
      data: mockResponse.data,
    });
  });

  it("should sign up and not redirect if redirect = false", async () => {
    // Update the userId to ensure it is overwritten
    const newAttrs = {
      userId: 891,
      email: "another@example.com",
    };
    const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
    mockResponseCopy.data.tokens.id.value = createIdToken(newAttrs);

    // Mock the API response
    api.post.mockImplementationOnce(() => mockResponseCopy);

    // Call signupWithPassword() with redirect = false
    const payload = {
      email: newAttrs.email,
      password: "something",
    };
    await signupWithPassword({
      redirect: false,
      ...payload,
    });

    // Should have sent the proper API request
    expect(api.post).toHaveBeenCalledWith(`/auth/create`, {
      tenantId,
      ...payload,
    });

    // Should have called exchange() with the API's response
    expect(exchange).toHaveBeenCalledWith(mockResponseCopy.data);

    // Should have set the user object
    expect(Userfront.user.email).toEqual(payload.email);
    expect(Userfront.user.userId).toEqual(newAttrs.userId);

    // Should call handleRedirect correctly
    expect(handleRedirect).toHaveBeenCalledWith({
      redirect: false,
      data: mockResponseCopy.data,
    });
  });

  it("should respond with whatever error the server sends", async () => {
    // Mock the API response
    const mockResponse = {
      response: {
        data: {
          error: "Bad Request",
          message: `That's a dumb email address.`,
          statusCode: 400,
        },
      },
    };
    api.post.mockImplementationOnce(() => Promise.reject(mockResponse));
    expect(
      signupWithPassword({
        email: "valid@example.com",
        password: "somevalidpassword",
      })
    ).rejects.toEqual(new Error(mockResponse.response.data.message));
  });
});

describe("loginWithPassword()", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
    jest.resetAllMocks();
  });

  describe("with username & password", () => {
    it("should send a request, set access and ID cookies, and initiate nonce exchange", async () => {
      // Mock the API response
      api.post.mockImplementationOnce(() => mockResponse);

      // Call loginWithPassword()
      const payload = {
        emailOrUsername: idTokenUserDefaults.email,
        password: "something",
      };
      const data = await loginWithPassword(payload);

      // Should have sent the proper API request
      expect(api.post).toHaveBeenCalledWith(`/auth/basic`, {
        tenantId,
        ...payload,
      });

      // Should have returned the proper value
      expect(data).toEqual(mockResponse.data);

      // Should have called exchange() with the API's response
      expect(exchange).toHaveBeenCalledWith(mockResponse.data);

      // Should have set the user object
      expect(Userfront.user.email).toEqual(payload.emailOrUsername);
      expect(Userfront.user.userId).toEqual(idTokenUserDefaults.userId);

      // Should call handleRedirect correctly
      expect(handleRedirect).toHaveBeenCalledWith({
        redirect: payload.redirect,
        data: mockResponse.data,
      });
    });

    it("should login and not redirect if redirect = false", async () => {
      // Update the userId to ensure it is overwritten
      const newAttrs = {
        userId: 1009,
        email: "someone-else@example.com",
      };
      const mockResponseCopy = JSON.parse(JSON.stringify(mockResponse));
      mockResponseCopy.data.tokens.id.value = createIdToken(newAttrs);

      // Mock the API response
      api.post.mockImplementationOnce(() => mockResponseCopy);

      // Call loginWithPassword() with redirect = false
      const payload = {
        email: newAttrs.email,
        password: "something",
      };
      const data = await loginWithPassword({
        redirect: false,
        ...payload,
      });

      // Should have sent the proper API request
      expect(api.post).toHaveBeenCalledWith(`/auth/basic`, {
        tenantId,
        emailOrUsername: payload.email,
        password: payload.password,
      });

      // Should have called exchange() with the API's response
      expect(exchange).toHaveBeenCalledWith(mockResponseCopy.data);

      // Should have returned the proper value
      expect(data).toEqual(mockResponseCopy.data);

      // Should have set the user object
      expect(Userfront.user.email).toEqual(payload.email);
      expect(Userfront.user.userId).toEqual(newAttrs.userId);

      // Should call handleRedirect correctly
      expect(handleRedirect).toHaveBeenCalledWith({
        redirect: false,
        data: mockResponseCopy.data,
      });
    });

    it("should login and redirect to a provided path", async () => {
      api.post.mockImplementationOnce(() => mockResponse);

      // Call loginWithPassword() with redirect = false
      const payload = {
        emailOrUsername: idTokenUserDefaults.email,
        password: "something",
      };
      await loginWithPassword({
        redirect: false,
        ...payload,
      });

      // Should have sent the proper API request
      expect(api.post).toHaveBeenCalledWith(`/auth/basic`, {
        tenantId,
        ...payload,
      });

      // Should have called exchange() with the API's response
      expect(exchange).toHaveBeenCalledWith(mockResponse.data);

      // Should have set the user object
      expect(Userfront.user.email).toEqual(payload.emailOrUsername);
      expect(Userfront.user.userId).toEqual(idTokenUserDefaults.userId);

      // Should call handleRedirect correctly
      expect(handleRedirect).toHaveBeenCalledWith({
        redirect: false,
        data: mockResponse.data,
      });
    });

    it("should respond with whatever error the server sends", async () => {
      // Mock the API response
      const mockResponse = {
        response: {
          data: {
            error: "Bad Request",
            message: `That's a dumb email address.`,
            statusCode: 400,
          },
        },
      };
      api.post.mockImplementationOnce(() => Promise.reject(mockResponse));
      expect(
        loginWithPassword({
          email: "valid@example.com",
          password: "somevalidpassword",
        })
      ).rejects.toEqual(new Error(mockResponse.response.data.message));
    });
  });
});
