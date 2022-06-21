import axios from "axios";
import Userfront from "../src/index.js";
import { get, post, put } from "../src/api.js";

jest.mock("axios");

const tenantId = "abcd9876";
Userfront.init(tenantId);

const mockErrorResponse = {
  response: {
    data: {
      error: "Bad Request",
      message: `Something went wrong`,
      statusCode: 400,
    },
  },
};

describe("API methods", () => {
  beforeEach(() => {
    Userfront.init(tenantId);
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("get", () => {
    it("should call axios.get with the correct URL", () => {
      get("/custom");
      expect(axios.get).toHaveBeenCalledWith(
        "https://api.userfront.com/v0/custom",
        undefined
      );
    });

    it("should call axios.get with a custom baseUrl", () => {
      const baseUrl = "https://custom.example.com/api/v1/";
      const path = "custom/path/abc";
      Userfront.init(tenantId, { baseUrl });
      get(path);
      expect(axios.get).toHaveBeenCalledWith(`${baseUrl}${path}`, undefined);
    });

    it("should return axios error", () => {
      axios.get.mockImplementationOnce(() => Promise.reject(mockErrorResponse));
      expect(() => get("/error")).rejects.toEqual(mockErrorResponse);
    });
  });

  describe("post", () => {
    it("should call axios.post with the correct URL", () => {
      const payload = { foo: "bar" };
      post("/custom", payload);
      expect(axios.post).toHaveBeenCalledWith(
        "https://api.userfront.com/v0/custom",
        payload,
        undefined
      );
    });

    it("should call axios.post with a custom baseUrl", () => {
      const baseUrl = "https://custom.example.com/post/v1/";
      const path = "another/custom/path";
      const payload = { another: "custom" };
      Userfront.init(tenantId, { baseUrl });
      post(path, payload);
      expect(axios.post).toHaveBeenCalledWith(
        `${baseUrl}${path}`,
        payload,
        undefined
      );
    });

    it("should return axios error", () => {
      axios.post.mockImplementationOnce(() =>
        Promise.reject(mockErrorResponse)
      );
      expect(() => post("/error")).rejects.toEqual(mockErrorResponse);
    });
  });

  describe("put", () => {
    it("should call axios.put with the correct URL", () => {
      const payload = { foo: "bar" };
      put("/custom", payload);
      expect(axios.put).toHaveBeenCalledWith(
        "https://api.userfront.com/v0/custom",
        payload,
        undefined
      );
    });

    it("should call axios.put with a custom baseUrl", () => {
      const baseUrl = "https://custom.example.com/post/v1/";
      const path = "another/custom/path";
      const payload = { another: "custom" };
      Userfront.init(tenantId, { baseUrl });
      put(path, payload);
      expect(axios.put).toHaveBeenCalledWith(
        `${baseUrl}${path}`,
        payload,
        undefined
      );
    });

    it("should return axios error", () => {
      axios.put.mockImplementationOnce(() => Promise.reject(mockErrorResponse));
      expect(() => put("/error")).rejects.toEqual(mockErrorResponse);
    });
  });
});
