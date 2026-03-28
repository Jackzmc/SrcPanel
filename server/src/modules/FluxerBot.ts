import { CategoryChannel, Client, Guild, GuildMember, User, VoiceChannel } from '@fluxerjs/core';
import ServerManager from './servers/ServerManager';
import { GatewayVoiceStateUpdateDispatchData, APIGuildMember, ChannelType, GatewayOpcodes, GatewayPresenceUpdateData } from '@fluxerjs/types'
import { VoiceUser } from '../../../common-types/Server.js';
import CacheManager from './CacheManager.js';

import Logger from '../logger.js'
const log = Logger.child({ name: "fluxer" })

const CATEGORY_ID = process.env.FLUXER_VOICELINK_CATEGORY_ID
if (!CATEGORY_ID) {
  throw new Error("FLUXER_VOICELINK_CATEGORY_ID not set")
}

interface ChannelData {
  groupId: string,
  serverId: string,
  channelInviteLink?: string
}

export class FluxerBot {
  #client: Client
  #token: string
  #servers: ServerManager
  #cache: CacheManager
  #channelData: Map<string, ChannelData>
  #oldState: Map<APIGuildMember, GatewayVoiceStateUpdateDispatchData> = new Map()

  #category: CategoryChannel
  #guild: Guild

  constructor(serverManager: ServerManager, cacheManager: CacheManager, discordToken: string) {
    this.#cache = cacheManager
    this.#token = discordToken
    this.#servers = serverManager
    this.#client = new Client({
      intents: 0,
      presence: {
        status: "idle",
        custom_status: {
          text: "Starting up"
        },
      }
    })
    this.#channelData = new Map()
  }

  async init() {
    await this.#client.login(this.#token)

    // TODO: check voice members on start
    this.#client.events.VoiceStateUpdate((data) => {
      if (data.guild_id != this.#category.guildId) return

      const newState = data
      if (!newState.member) return
      const oldState = this.#oldState.get(newState.member!)
      this.#oldState.set(newState.member, newState)
      if (!oldState) return

      if (newState.channel_id == oldState.channel_id) return // incase we didnt get mapping, just prevent other state changes
      // Fetch the servers that the channels map to
      const channelData = [
        oldState.channel_id ? this.#channelData.get(oldState.channel_id) : null,
        newState.channel_id ? this.#channelData.get(newState.channel_id) : null,
      ]
      const [oldStateServer, newStateServer] = channelData.map(data => data ? this.#servers.getServer(data.serverId) : null)

      const member = FluxerBot.toPanelUser(newState.member)

      if (newStateServer && (!oldStateServer || oldStateServer.id != newStateServer.id)) {
        // User connected or switched channels
        // Mark new as connected, old as disconnected
        newStateServer.markVoiceConnection(member, true)
        // log.debug(`informing ${newStateServer.name} client connected`)
        if (oldStateServer) {
          oldStateServer.markVoiceConnection(member, false)
          // log.debug(`informing ${oldStateServer.name} client disconnected`)
        }
      } else if (!newStateServer && oldStateServer) {
        // User disconnected (from voice)
        oldStateServer.markVoiceConnection(member, false)
        // log.debug(`informing ${oldStateServer.name} client disconnected`)
      }
    })
    await this.load()

    this.#client.events.Ready(async () => {
      const category = await this.#client.channels.fetch(CATEGORY_ID!)
      if (!(category instanceof CategoryChannel)) {
        throw new Error("Category ID does not map to a category channel")
      }

      this.#category = category
      const guild = await this.#client.guilds.fetch(category.guildId) as Guild
      this.#guild = guild

      await this.updateChannels()

      this.setPresence({
        status: "online",
        custom_status: {
          text: "Killing zombies"
        }
      })

      log.info("Bot initalized")
    })
  }

  setPresence(presence: GatewayPresenceUpdateData) {
    log.debug({ presence }, 'set presence')
    this.#client.sendToGateway(0, {
      op: GatewayOpcodes.PresenceUpdate,
      d: presence
    });
  }

  async #findExisting(reverseMap: Map<string, string>) {
    // Delete any non existent servers and create reverse mapping
    const channels = this.#guild.channels
    for (const [id, channel] of channels.entries()) {
      // Check if child of category
      if (channel.parentId != this.#category.id) continue

      if (channel.type != ChannelType.GuildVoice) {
        log.warn({ id: channel.id, name: channel.name }, "skipping non-voice channel in category")
        // channel.delete("GAME_TO_VOICE_LINK_INVALID_CHANNEL")
        continue
      }

      const data = this.#channelData.get(id)
      if (data?.serverId) {
        const group = this.#servers.getGroup(data.groupId)
        const server = group?.getServer(data.serverId)
        if (server) {
          if (channel.name != server.name) {
            await channel.edit({
              name: server.name ?? server.id
            })
          }
          reverseMap.set(data.serverId, id)
          log.debug(`found channel ${channel.id} --> server ${server.id}`)
          if (!data.channelInviteLink) {
            const invite = await channel.createInvite()
            data.channelInviteLink = invite.url
          }
          continue
        }
      }
      // Server does not exist, delete channel
      await channel.delete()
    }
  }

  async #createMissing(reverseMap: Map<string, string>) {
    // Create any missing servers
    let pos = 0
    for (const server of this.#servers.getAll()) {
      const channelId = reverseMap.get(server.id)
      let channel: VoiceChannel | null = null
      if (channelId) {
        channel = await this.#client.channels.resolve(channelId) as VoiceChannel | null
      }
      if (!channel) {
        // If there's no channel for this server, create it
        channel = await this.#guild.createChannel({
          name: server.name ?? server.id,
          type: ChannelType.GuildVoice,
          parent_id: this.#category.id,
        }) as unknown as VoiceChannel /* discord.js type failures */;
        if (!channel) throw new Error("Could not create channel (channel null)")
        log.debug({ id: channel.id, type: channel.type }, 'create channel')
        const invite = await channel.createInvite()
        this.#channelData.set(channel.id, {
          groupId: server.group.Id,
          serverId: server.id,
          channelInviteLink: invite.url
        })
        log.info(`created channel ${channel.id} --> server ${server.id}`)
      }
      // TODO: refactor for efficiency
      await this.#guild.setChannelPositions([
        {
          id: channel.id,
          position: pos,
          parent_id: this.#category.id,
        }
      ])
      pos++
    }
  }

  async updateChannels() {
    if (!process.env.FLUXER_VOICELINK_CATEGORY_ID) {
      return log.warn("Voice <==> Server link not available: no FLUXER_VOICELINK_CATEGORY_ID")
    }
    const category = await this.#client.channels.fetch(process.env.FLUXER_VOICELINK_CATEGORY_ID as string)
    if (!category) throw new Error("Category not found")
    if (!(category instanceof CategoryChannel)) {
      throw new Error("Category ID is not a category channel")
    }

    const reverseMap = new Map<string, string>()

    await this.#findExisting(reverseMap)
    await this.#createMissing(reverseMap)

    await this.save()
  }

  async save() {
    await this.#cache.set("fluxer.voice_chnl_map", JSON.stringify(Object.fromEntries(this.#channelData.entries())))
  }

  async load() {
    try {
      const content = await this.#cache.get<string>("fluxer.voice_chnl_map")
      if (!content) return {}
      this.#channelData = new Map(Object.entries(JSON.parse(content)))
    } catch (err) {
      if (err.code !== "ENOENT") {
        log.warn("Error loading channel mapping:\n", err)
        // log.warn("[Discord] Force recreating channels")
        // await this.updateChannels()
      }
    }
  }

  static toPanelUser(member: APIGuildMember): VoiceUser {
    return {
      id: member.user.id,
      name: member.nick ?? member.user.username
    }
  }
}
