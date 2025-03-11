import { REST } from '@discordjs/rest';
import { GatewayIntentBits, Routes } from 'discord-api-types/v10';
import { Client, GuildMember, User } from 'discord.js';
import ServerManager from './servers/ServerManager';

export interface DiscordUser {
    id: string,
    name: string,
    // avatarUrl?: string
}

export class DiscordBot {
    #client: Client
    #token: string
    #servers: ServerManager

    #channelServerMap: Record<string, string> // <Discord channel Id, Server Id>
    constructor(serverManager: ServerManager, discordToken: string) {
        this.#token = discordToken
        this.#servers = serverManager
        this.#client = new Client({ intents: [GatewayIntentBits.Guilds] })
    }

    async init() {
        await this.#client.login(this.#token)
        this.#client.on("voiceStateUpdate", (oldState,newState) => {
            if(!newState.channelId || !newState.member) return
            const serverId = this.#channelServerMap[newState.channelId]
            if(serverId) {
                const server = this.#servers.getServer(serverId)
                if(!server) {
                    console.warn('[Discord] Could not find server: ', serverId)
                    return
                }
                
                if(!oldState.channelId && newState.channelId) {
                    server.markVoiceConnection(DiscordBot.toPanelUser(newState.member), true)
                    // Connected
                } else if(oldState.channelId && !newState.channelId) {
                    // Disconnected
                    server.markVoiceConnection(DiscordBot.toPanelUser(newState.member), false)
                }
            }
        })
    }

    static toPanelUser(member: GuildMember | User): DiscordUser {
        return {
            id: member.id,
            name: member.displayName
        }
    }
}