import { REST } from '@discordjs/rest';
import { ChannelType, GatewayIntentBits, Routes } from 'discord-api-types/v10';
import { BaseGuildVoiceChannel, CategoryChannel, Client, createChannel, GuildMember, TextChannel, User, VoiceBasedChannel, VoiceChannel } from 'discord.js';
import ServerManager from './servers/ServerManager';
import { readFile, writeFile } from 'fs/promises';
import { VoiceUser } from '../../../common-types/Server.js';

interface ChannelData {
    serverId: string,
    channelInviteLink?: string
}

export class DiscordBot {
    #client: Client
    #token: string
    #servers: ServerManager

    #savePath: string

    #channelData: Map<string, ChannelData>
    constructor(serverManager: ServerManager, savePath: string, discordToken: string) {
        this.#token = discordToken
        this.#servers = serverManager
        this.#client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] })
        // this.#channelServerMap = new Map()
        this.#savePath = savePath
        this.#channelData = new Map()
    }

    async init() {
        await this.#client.login(this.#token)
        // TODO: check voice members on start
        this.#client.on("voiceStateUpdate", (oldState,newState) => {
            if(!newState.member) return
            // Fetch the servers that the channels map to
            const channelData = [
                oldState.channelId ? this.#channelData.get(oldState.channelId) : null,
                newState.channelId ? this.#channelData.get(newState.channelId) : null, 
            ]
            const [oldStateServer, newStateServer] = channelData.map(data => data ? this.#servers.getServer(data.serverId) : null)

            if(newStateServer && (!oldStateServer || oldStateServer.id != newState.id)) {
                // User connected or switched channels
                // Mark new as connected, old as disconnected
                newStateServer.markVoiceConnection(DiscordBot.toPanelUser(newState.member), true)
                // console.debug(`informing ${newStateServer.name} client connected`)
                if(oldStateServer) {
                    oldStateServer.markVoiceConnection(DiscordBot.toPanelUser(newState.member), false)
                    // console.debug(`informing ${oldStateServer.name} client disconnected`)
                }
            } else if(!newStateServer && oldStateServer) {
                // User disconnected (from voice)
                oldStateServer.markVoiceConnection(DiscordBot.toPanelUser(newState.member), false)
                // console.debug(`informing ${oldStateServer.name} client disconnected`)
            }
        })
        await this.load()

        this.#client.on("ready", async() => {
            await this.updateChannels()
            console.info("[Discord] Bot initalized")
        })
    }

    async updateChannels() {
        if(!process.env.DISCORD_VOICELINK_CATEGORY_ID) {
            return console.warn("[Discord] Voice <==> Server link not available: no DISCORD_VOICELINK_CATEGORY_ID")
        }
        const category = await this.#client.channels.fetch(process.env.DISCORD_VOICELINK_CATEGORY_ID as string)
        if(!category) throw new Error("Category not found")
        if(!(category instanceof CategoryChannel)) {
            throw new Error("Category ID is not a category channel")
        }

        // Delete any non existent servers and create reverse mapping
        const reverseMap = new Map<string, string>()
        for(const [id, channel] of category.children.cache.entries()) {
            if(channel.type != ChannelType.GuildVoice) continue
            const data = this.#channelData.get(id)
            if(data?.serverId) {
                const server = this.#servers.getServer(data.serverId)
                if(server) {
                    if(channel.name != server.name)
                        channel.setName(server.name ?? server.id)
                    reverseMap.set(data.serverId, id)
                    console.debug(`[Discord] found channel ${channel.id} --> server ${server.id}`)
                    if(!data.channelInviteLink) {
                        const invite = await channel.createInvite()
                        data.channelInviteLink = invite.url
                    }
                    continue
                }
            }
            // Server does not exist, delete channel
            await channel.delete("GAME_TO_VOICE_LINK_UPDATE")
        }

        // Create any missing servers
        let pos = 0
        for(const server of this.#servers.getAll()) {
            let channelId = reverseMap.get(server.id)
            let channel: VoiceChannel | null = null
            if(channelId) {
                // Don't fetch() as it should be cached from above
                channel = this.#client.channels.resolve(channelId) as VoiceChannel|null
            }
            if(!channel) {
                // If there's no channel for this server, create it
                channel = await category.children.create({
                    name: server.name ?? server.id,
                    type: ChannelType.GuildVoice
                })
                const invite = await channel.createInvite()
                this.#channelData.set(channel.id, {
                    serverId: server.id,
                    channelInviteLink: invite.url
                })
                console.debug(`[Discord] created channel ${channel.id} --> server ${server.id}`)
            }
            channel.setPosition(pos)
            pos++
        }
        
        await this.save()
    } 

    async save() {
        await writeFile(this.#savePath, JSON.stringify(Object.fromEntries(this.#channelData.entries())))
    }

    async load() {
        try {
            const content = await readFile(this.#savePath, 'utf-8')
            this.#channelData = new Map(Object.entries(JSON.parse(content)))
        } catch(err) {
            if(err.code !== "ENOENT") {
                console.warn("[Discord] Error loading channel mapping:\n", err)
                // console.warn("[Discord] Force recreating channels")
                // await this.updateChannels()
            }
        }
    }

    static toPanelUser(member: GuildMember | User): VoiceUser {
        return {
            id: member.id,
            name: member.displayName
        }
    }
}