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
  describe("get", () => {
    it("should call axios.get with the correct URL", () => {
      get("/custom");
      expect(axios.get).toHaveBeenCalledWith(
        "https://api.userfront.com/v0/custom",
        undefined
      );
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

    it("should return axios error", () => {
      axios.put.mockImplementationOnce(() => Promise.reject(mockErrorResponse));
      expect(() => put("/error")).rejects.toEqual(mockErrorResponse);
    });
  });
});
