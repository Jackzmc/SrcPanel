import TaskManager from "#/modules/tasks/TaskManager.js";
import AuthManager from "../../src/modules/auth/AuthManager.js";

console.log('data', import.meta.dirname, import.meta.filename)

export const taskManager = new TaskManager({ resolution: 1000 * 60, tasksPerTick: 0 }) /* make this never run */

export const authManager = { AdminCount: 3 } as unknown as AuthManager;
