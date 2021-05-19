import axios from "axios";
import { apiUrl } from "./constants.js";

/**
 * Create a resource object to interact with Userfront API.
 * @param {Object} options
 * @property {String} options.tenantId Tenant ID resource belongs to
 * @property {String} [options.basePath] Base path of resource
 * @property {String} options.path Sub-path of resource
 * @property {String|Number} options.id Identifier of resource
 * @property {Function} options.afterCreate Function to call after create()
 * @property {Function} options.afterRead Function to call after read()
 * @property {Function} options.afterUpdate Function to call after update()
 * @property {Function} options.afterDelete Function to call after delete()
 */
export default (options = {}) => {
  const {
    tenantId,
    basePath = `${apiUrl}tenants/${tenantId}`,
    path,
    id,
  } = options;
  if (!tenantId) {
    throw new Error("API resource error: Missing tenant ID");
  }
  if (!path) {
    throw new Error("API resource error: Missing path");
  }

  return {
    async create() {},
    async read() {},
    async update(updates) {
      if (!id) {
        throw new Error("API resource update error: Missing ID");
      }

      try {
        await axios.put(`${basePath}${path}/${id}`, updates);
      } catch (error) {
        throw new Error(error.message);
      }

      if (options.afterUpdate && typeof options.afterUpdate === "function") {
        options.afterUpdate();
      }
    },
    async delete() {},
  };
};
