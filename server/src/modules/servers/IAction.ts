import { CommandResultType } from "@srcpanel/common/Live";
import User from "../users/User.js";

export interface ActionResponse {
    type: CommandResultType,
    result: number | boolean,
    message?: string
}
export interface IAction {
    /**
     * Perform an action on server
     * @param command command to run
     * @param namespace namespace to run on ('builtin' for panel plugin)
     * @param runAsUser optionally, attempts to run command as user, checking for panel permissions (not game permission)
     */
    performAction(command: string, namespace: string, runAsUser: User): Promise<ActionResponse>;
}

/**
    * Converts built in command to actual command for given server. 
    * This allows different game support if the command is different. (minecraft uses "stop" instead of "exit")
    * @param command the built in command, without namespace
    * @returns null for unknown built in
    */
export function getFallbackCommandForBuiltin(command: string): string | null {
    switch(command) {
    case "stop": {
        return "exit"
    }
    case "request_stop": {
        return "sm_panel_request_stop"
    }
    case "kick": {
        return "sm_kick"
    }
    case "ban": {
        return "sm_ban"
    }
    case "unreserve": {
        return "sm_unreserve"
    }
    default: return null
    }
}