import { ChannelType, GatewayIntentBits } from 'discord-api-types/v10';
import { CategoryChannel, Client, GuildMember, User, VoiceChannel } from 'discord.js';
import ServerManager from './servers/ServerManager';
import { readFile, unlink } from 'fs/promises';
import { VoiceUser } from '../../../common-types/Server.js';
import CacheManager from './CacheManager.js';

interface ChannelData {
    groupId: string,
    serverId: string,
    channelInviteLink?: string
}

export class DiscordBot {
    #client: Client
    #token: string
    #servers: ServerManager
    #cache: CacheManager

    #savePath: string

    #channelData: Map<string, ChannelData>
    constructor(serverManager: ServerManager, cacheManager: CacheManager, savePath: string, discordToken: string) {
        this.#cache = cacheManager
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

    async #findExisting(category: CategoryChannel, reverseMap: Map<string, string>) {
        // Delete any non existent servers and create reverse mapping
        for(const [id, channel] of category.children.cache.entries()) {
            if(channel.type != ChannelType.GuildVoice) continue
            const data = this.#channelData.get(id)
            if(data?.serverId) {
                const group = this.#servers.getGroup(data.groupId)
                const server = group?.getServer(data.serverId)
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
    }

    async #createMissing(category: CategoryChannel, reverseMap: Map<string, string>) {
        // Create any missing servers
        let pos = 0
        for(const server of this.#servers.getAll()) {
            const channelId = reverseMap.get(server.id)
            let channel: VoiceChannel | null = null
            if(channelId) {
                // Don't fetch() as it should be cached from above
                channel = this.#client.channels.resolve(channelId) as VoiceChannel|null
            }
            if(!channel) {
                // If there's no channel for this server, create it
                channel = await category.children.create({
                    name: server.name ?? server.id,
                    type: ChannelType.GuildVoice,
                }) as unknown as VoiceChannel /** bad types in discord.js -_- */
                if(!channel) throw new Error("Could not create channel (channel null)")
                const invite = await channel.createInvite()
                this.#channelData.set(channel.id, {
                    groupId: server.group.Id,
                    serverId: server.id,
                    channelInviteLink: invite.url
                })
                console.debug(`[Discord] created channel ${channel.id} --> server ${server.id}`)
            }
            channel.setPosition(pos)
            pos++
        }
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

        const reverseMap = new Map<string, string>()

        await this.#findExisting(category, reverseMap)


        
        
        await this.save()
    } 

    async save() {
        await this.#cache.set("discord.voice_chnl_map", JSON.stringify(Object.fromEntries(this.#channelData.entries())))
    }

    async load() {
        try {
            const content = await this.#cache.get<string>("discord.voice_chnl_map")
            if(!content) return {}
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