import AuthManager from "../../src/modules/auth/AuthManager.js";
import type CacheManager from "../../src/modules/CacheManager.js";

console.log('data', import.meta.dirname, import.meta.filename)

export const authManager = { AdminCount: 3 } as unknown as AuthManager;

export const cacheManager = { set: () => {}, get: () => null } as unknown as CacheManager