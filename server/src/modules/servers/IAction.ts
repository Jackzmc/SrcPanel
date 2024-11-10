import { CommandResultType } from "../../../../common-types/Live.js";

export interface ActionResponse {
    type: CommandResultType,
    result: number | boolean,
    message?: string
}
export interface IAction {
    performAction(command: string, namespace:string): Promise<ActionResponse>;
}