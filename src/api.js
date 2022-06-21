import axios from "axios";
import { store } from "./store.js";

// Replace multiple slashes // with single slash / (except in the protocol)
function reduceSlashes(str) {
  return str.replace(/([^:]\/)\/+/g, "$1");
}

/**
 * Perform a GET request
 * @param {String} path
 * @param {Object} options
 * @returns {Object} response body
 */
export async function get(path, options) {
  const url = reduceSlashes(`${store.baseUrl}${path}`);
  return axios.get(url, options);
}

/**
 * Perform a POST request
 * @param {String} path
 * @param {Object} payload
 * @param {Object} options
 * @returns {Object} response body
 */
export async function post(path, payload, options) {
  const url = reduceSlashes(`${store.baseUrl}${path}`);
  return axios.post(url, payload, options);
}

/**
 * Perform a PUT request
 * @param {String} path
 * @param {Object} payload
 * @param {Object} options
 * @returns {Object} response body
 */
export async function put(path, payload, options) {
  const url = reduceSlashes(`${store.baseUrl}${path}`);
  return axios.put(url, payload, options);
}

export default {
  get,
  post,
  put,
};
