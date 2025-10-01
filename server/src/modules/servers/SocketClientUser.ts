import { WebSocket } from "@fastify/websocket";
import User from "../../modules/users/User.js";
import { ServerOutPacket, ServerOutPayload } from '../../../../common-types/ServerWebsocket';
import { FastifyRequest } from "fastify";

export default class SocketClientUser {
    #socket: WebSocket
    #user: User
    // eslint-disable-next-line no-unused-private-class-members
    #req: FastifyRequest
    constructor(socket: WebSocket, user: User, req: FastifyRequest) {
        this.#socket = socket;
        this.#user = user;
        this.#req = req
    }

    get socket() {
        return this.#socket;
    }

    get user() {
        return this.#user;
    }

    sendPacket(packet: ServerOutPacket) {
        this.socket.send(JSON.stringify(packet));
    }
    
    sendPayload(payload: ServerOutPayload) {
        this.sendPacket({
            millis: Date.now(),
            ...payload,
        });
    }

    sendError(errorCode: string, message?: string) {
        this.sendPayload({
            type: "error",
            error: errorCode,
            message
        })
    }

    
}