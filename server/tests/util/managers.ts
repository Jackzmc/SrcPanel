import TaskManager from "#/modules/tasks/TaskManager.js";
import ConfigManager from "#/modules/ConfigManager.js";
import path from "node:path";
import AuthManager from "../../src/modules/auth/AuthManager.js";

console.log('data', import.meta.dirname, import.meta.filename)
const CONFIG_FOLDER = path.join(import.meta.dirname, "../data")

export const taskManager = new TaskManager({ resolution: 1000 * 60, tasksPerTick: 0 }) /* make this never run */

export const configManager = await ConfigManager.Load(CONFIG_FOLDER)

export const authManager = { AdminCount: 3 } as unknown as AuthManager;
