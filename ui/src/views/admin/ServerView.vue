<template>
<div class="has-background-light pt-0">
<nav class="container mb-3 is-fluid">
  <div class="block pt-5">
    <router-link to="/admin/servers" class="">🠐 back to servers list</router-link>
  </div>
  <div class="columns">
    <div class="column is-8" v-if="serverInfo">
      <div class="box has-background-primary-90">
        <h3 class="title is-3">
          {{serverInfo.name}}
          <div class="tags is-pulled-right inline">
            <template v-if="status">
              <span class="tag is-danger is-medium has-tooltip-danger no-border" v-if="error || status.error" data-tooltip="An error occurred while fetching the server's status"><Icon icon="fa-exclamation-triangle">Error</Icon></span>
              <span class="tag is-success  is-medium" v-else-if="status.online">Online</span>
              <span class="tag is-danger  is-medium" v-else>Offline</span>
            </template>
            <span class="tag is-medium" v-else><Icon icon="fa-spinner" spin></Icon></span>
            <span data-tooltip="Server ID" class="tag is-info is-medium no-border">{{serverInfo.id}}</span>
          </div>
        </h3>
        <h4 class="subtitle is-4">
          {{serverInfo.domain}}:{{serverInfo.port}}
          <Icon icon="fa-copy" data-tooltip="Copy to clipboard" @click="copyAddress"></Icon>
        </h4>
        <div class="level">
          <div class="level-left">
            <div class="tags">
              <span v-for="tag in serverInfo.tags" :key="tag" class="tag is-dark" data-tooltip="Server tag">{{tag}}</span>
            </div>
          </div>
          <div class="level-right">
            <div class="buttons">
              <template v-if="isLiveViewActive || serverInfo.features.plugin || serverInfo.features.rcon">
                <a v-if="serverInfo.features.systemd && (!status || !status.online)" @click="performAction('start')" class="button is-success is-small">Start Server</a>
                <template v-if="serverInfo.status?.online">
                  <button :data-tooltip="action.description" :disabled="actionRunning" v-for="(action, i) in actions" :key="i" @click="performAction(action.command)" class="button is-dark is-small" :style="{'background-color': action.color}">{{ action.name }}</button>
                </template>
              </template>
              <Icon v-else icon="fa-plug-circle-minus" data-tooltip="No connection to plugin, cannot perform actions at this time">Actions Unavailable</Icon>
            </div>
          </div>
        </div>
      </div>
      <div class="tabs is-large">
        <ul>
          <li v-for="(data, id) in TABS" :key="id"  :class="{'is-active': tab === id}">
            <router-link
              :to="{params:{tab: id, id: serverInfo.id }}"
              v-if="isTabEnabled(data)"
            >
              {{data.name}}&nbsp;
              <span class="tag is-info is-small" v-if="data.tag">{{ data.tag }}</span>
            </router-link>
          </li>
        </ul>
      </div>
      <div v-if="tab === 'overview'" class="box">
        <template v-if="status">
          <div class="notification is-danger has-text-centered" v-if="!status.online">
            The server is offline or is unreachable.
            <span class="is-inline is-pulled-right no-border" data-tooltip="Time until next refresh">
              <Icon icon="fa-spinner" spin v-if="nextRefreshCountdown == 0"></Icon>
              <span v-else>{{ nextRefreshCountdown }}s</span>
            </span>
          </div>
          <p class="has-text-centered subtitle is-4 my-6 has-text-danger" v-else-if="status.error">{{  status.error }}</p>
          <template v-else>
            <span class="is-inline is-pulled-right no-border pr-4" data-tooltip="Time until next refresh" style="width:10px">
              <Icon icon="fa-spinner" spin v-if="nextRefreshCountdown == 0"></Icon>
              <span v-else>{{ nextRefreshCountdown }}s</span>
            </span>
            <table class="table is-fullwidth is-size-4" v-if="status.data">
              <tr v-if="serverInfo.type === 'source'">
                <th>Map</th>
                <td v-if="mapInfo">
                  <h4 class="title is-4">{{mapInfo.name}}
                    <span class="is-inline is-pulled-right has-text-weight-normal is-size-6">{{ status.data.map }}</span>
                  </h4>
                  <p>Chapter {{ mapInfo.chapterId }} - {{ mapInfo.chapterName }}</p>
                </td>
                <td v-else-if="status.data.map">{{ status.data.map }}</td>
                <td v-else><em data-tooltip="Unknown">-</em></td>
              </tr>
              <tr v-if="serverInfo.type === 'source'">
                <th>Gamemode</th>
                <td v-if="status.data.gamemode" :data-tooltip="status.data.gamemode">
                  {{ formatGamemode(status.data.gamemode) }}
                </td>
                <td v-else><em data-tooltip="Unknown">-</em></td>
              </tr>
              <tr>
                <th>Uptime</th>
                <td v-if="uptime">{{ uptimeDuration }}</td>
                <td v-else><em data-tooltip="Unknown">-</em></td>
              </tr>
              <tr>
                <th>Players ({{status.data.players.length}} / {{status.data.maxplayers}})</th>
                <td >
                  <ul v-if="status.data.players.length > 0">
                    <li v-for="player in status.data.players" :key="player">
                      {{ player }}
                    </li>
                  </ul>
                  <em v-else>no players online</em>
                </td>
              </tr>
              <tr>
                <th>Type</th>
                <td>{{ serverInfo.type }}</td>
              </tr>
              <tr>
                <th style="border-style: none">Features</th>
                <td style="border-style: none">
                  <div class="tags">
                    <span class="tag" v-for="(t,feat) in serverInfo.features" :key="feat">
                      <template v-if="feat">{{ feat }}</template>
                    </span>
                  </div>
                </td>
              </tr>
            </table>
            <br>
          </template>
        </template>
        <article class="message is-danger" v-else-if="error">
          <div class="message-header">
            <p><Icon icon="fa-exclamation-triangle">An error occurred while fetching server information</Icon></p>
          </div>
          <div class="message-body">
            {{ error }}
          </div>
        </article>
        <p class="has-text-centered subtitle is-4 my-6" v-else><Icon icon="fa-spinner" spin>Waiting for server status...</Icon></p>
      </div>
      <div v-else-if="tab === 'live'" class="box">
        <span class="tag is-pulled-right is-danger" v-if="isLiveViewActive" data-tooltip="Connected to server, receiving live data">Live</span>
        <div class="notification is-danger has-text-centered" v-else-if="liveStatusNextRetryTime !== undefined">
          Lost connection with live server. Retrying in {{ nextLiveRetryTime }} seconds
          <span class="is-inline is-pulled-right no-border" v-if="nextLiveRetryTime <= 1">
            <Icon icon="fa-spinner" spin></Icon>
          </span>
        </div>
          <!-- show notice that server is offline, but only if there is also no live data -->
        <!-- server might be shown offline but actually is online and sending data (eg. map transitions) -->
        <div class="notification is-danger has-text-centered" v-else-if="!status?.online && !liveStatus">
          The server is offline or is unreachable.
        </div>
        <div class="list has-visible-pointer-controls" v-if="liveStatus && Object.values(liveStatus.clients).length > 0">
          <template v-for="player in livePlayers" :key="player.userid">
            <div class="list-item" v-if="true">
              <div class="list-item-image">
                <figure class="image is-48x48">
                  <img :src="getIconUrl(player)" />
                </figure>
              </div>
              <div class="list-item-content">
                <div v-if="player.survivor" :class="['list-item-title', {'has-text-danger': !player.isAlive }]">
                  <div class="progressbar" style="width:50%"  v-if="player.isAlive" :data-label="player.totalHealth + ' HP'">
                    <div :class="['permhealth',getHealthClass(player.totalHealth)]" :style="{width: player.survivor.permHealth + '%' }"></div>
                    <div :class="['temphealth',getHealthClass(player.totalHealth)]" :style="{width: player.survivor.tempHealth + '%' }"></div>
                  </div>
                  <div class="progressbar mt-1" style="width:50%" :data-label="player.survivor.flowPercent + '% Chapter Progress'">
                    <div class="flow-progress" :style="{width: player.survivor.flowPercent + '%'}"></div>
                  </div>
                  <UserComponent :class="{'has-text-crossed': !player.isAlive}" :user="player as User" />
                  &nbsp;<span class="tag is-warning is-small" v-if="player.state == ClientState.Idle">Idle</span>
                  &nbsp;<span class="has-text-info is-small" v-else-if="player.steamid === 'BOT'">[BOT]</span>
                </div>
                <div v-else-if="player.infected" :class="['list-item-title', {'has-text-crossed': !player.isAlive }]">
                  <div class="progressbar" style="width:50%"  v-if="player.isAlive" :data-label="player.infected.health + '/' + player.infected.maxHealth + ' HP'">
                    <div :class="['permhealth',getHealthClass(100 * player.totalHealth)]" :style="{width: (player.totalHealth) + '%' }"></div>
                  </div>
                  {{ player.name }}
                  &nbsp;<span class="has-text-info is-small" v-if="player.steamid === 'BOT'">[BOT]</span>
                </div>
                <div class="list-item-description has-text-black" v-if="player.survivor">
                  <template v-if="player.isAlive">
                    <div class="tags">
                      <span class="tag">{{ PlayerMoveString[player.survivor.move] }}</span>
                      <span class="tag is-info" v-if="player.survivor.action">{{ PlayerGameActionString[player.survivor.action] }}</span>
                      <span class="tag is-primary" v-for="state in getPlayerStates(player)" :key="state">
                        {{ state }}
                      </span>
                      <span class="tag is-dark" v-for="item in getPlayerWeaponNames(player)" :key="item">
                        {{ item }}
                      </span>
                    </div>
                  </template>
                  <span v-else>Dead</span>
                </div>
                <div class="list-item-description has-text-black" v-else-if="player.infected">
                  <div class="tags">
                  </div>
                  <span v-if="player.infected.pinnedPlayer">Pinned <b>{{ player.infected.pinnedPlayer?.name }}</b></span>
                </div>
              </div>
              <div class="list-item-controls">
                <div class="buttons is-right">
                  <button class="button is-inverted is-outlined is-black" @click="toggleDetails(player)">
                    <Icon icon-class="is-small has-text-black" :icon="showDetailsId && showDetailsId === player.userid ? 'fa-chevron-up' : 'fa-chevron-down'" />
                  </button>
                </div>
              </div>
            </div>
            <div class="list-item  px-0 mx-0 my-0 py-0" v-if="showDetailsId && showDetailsId === player.userid">
              <div class="list-item-content has-background-light-gray">
                <table class="table is-bordered is-fullwidth">
                  <tbody>
                    <tr>
                      <th data-tooltip="Since player has joined the game">Campaign Playtime</th>
                      <!-- joinTime should be defined here -->
                      <td>{{ getDuration(player.timestamp) }}</td>
                    </tr>
                    <tr>
                      <th>SteamID / UserId</th>
                      <td>{{ player.steamid }} / #{{ player.userid }}</td>
                    </tr>
                    <template v-if="'survivor' in player && player.survivor">
                    <tr>
                      <th>Flow Progress</th>
                      <td>{{ player.survivor.flowPercent }}%</td>
                    </tr>
                    </template>
                    <tr>
                      <th>Actions</th>
                      <td><div class="buttons">
                        <a class="button is-warning has-tooltip-danger" @click="kickPlayer(player)">Kick</a>
                      </div></td>
                    </tr>
                    <tr>
                      <th>Raw</th>
                      <td><pre>{{JSON.stringify(player, null, 2)}}</pre></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>
        </div>
        <div v-else-if="liveStatus?.game?.state == GameState.Transitioning">
          <p class="has-text-centered is-size-5">The next chapter is loading</p>
        </div>
        <div v-else-if="liveStatus?.game?.state == GameState.Hibernating">
          <p class="has-text-centered is-size-5">Server is currently hibernating</p>
        </div>
        <div v-else-if="liveStatus">
          <p class="has-text-centered title is-4">No players online</p>
          <p class="has-text-centered subtitle">Waiting for players to connect</p>
        </div>
        <div v-else>
          <h4 class="has-text-centered is-size-4">Waiting for live data....</h4>
          <br><br>
          <div class="box has-text-centered has-background-warning-light">
            <p class="subtitle is-6">Live view may not be supported on this server, or the server is offline.</p>
            <p class="subtitle is-6">This will automatically update when data is available.</p>
          </div>
        </div>
      </div>
      <div v-else-if="tab === 'configs'" class="">
        <div class="card" v-if="cfg.selected && !cfg.loading">
          <header class="card-header">
            <p class="card-header-title">{{ cfgParentFolder }}<span class="has-text-weight-light">{{ cfg.selected.filename }}</span></p>
          </header>
          <div class="card-content" v-if="cfg.selected">
            <template v-if="cfg.json">
              <Field label="Cvars">
                <div class="columns " v-for="entry in cfg.json" :key="entry.command">
                  <div class="column is-5">
                    <input class="input is-expanded" type="text" :value="entry.cvar ?? entry.command" />
                  </div>
                  <div class="column is-6">
                    <input v-if="entry.type === 'string'" class="input" type="text" :value="entry.value" />
                    <input v-else-if="entry.type === 'number'" class="input" type="number" :value="entry.value" />
                    <em v-else-if="entry.type === 'hidden'">(hidden)</em>
                  </div>
                  <div class="column is-1">
                    <span v-if="entry.type === 'string'" class="tag is-primary is-large" data-tooltip="String">S</span>
                    <span v-if="entry.type === 'number'" class="tag is-info is-large" data-tooltip="Number">N</span>
                  </div>
                </div>
                <!-- <span class="has-text-dark">{{entry.cvar ?? entry.command}}</span>
                        <span :class="{'config-string': entry.type === 'string', 'has-text-info': entry.type === 'number'}">
                          {{entry.value}}
                        </span> -->
              </Field>
              <Field label="Add New Cvar">
                <div class="columns">
                  <div class="column">
                    <input class="input" type="text" />
                  </div>
                  <div class="column">
                    <input class="input" type="text" />
                  </div>
                </div>
              </Field>
              <Field label="Add New Command">
                <div class="columns">
                  <div class="column">
                    <input class="input" type="text" />
                  </div>
                  <div class="column">
                    <input class="input" type="text" />
                  </div>
                </div>
              </Field>
            </template>
            <pre class="box" v-if="cfg.raw">
            {{ cfg.raw }}
            </pre>
          </div>
        </div>
        <div class="box" v-else>
          <p class="has-text-centered subtitle is-4 my-6" v-if="cfg.loading"><Icon icon="spinner" spin>Loading configs</Icon></p>
          <p class="has-text-centered subtitle is-5 my-6" v-else>Select a config file on the right to view its content</p>
        </div>
      </div>
      <div v-else-if="tab === 'console'" class="box">
        <Console :server="serverInfo" />
      </div>
    </div>
    <div class="column is-8" v-else-if="error">
      <div class="box">
        <article class="message is-danger" v-if="error && !serverInfo">
          <div class="message-header">
            <p>
              <Icon icon="fa-exclamation-triangle" icon-class="has-text-white">Could not fetch server information</Icon>
            </p>
          </div>
          <div class="message-body">
            <div class="content">
              <p>An error occurred while trying to fetch server information from the admin panel. Please try again later.
              </p>
              <p>Error Data:
              <pre>{{ error }}</pre>
              </p>
            </div>
            <p><a class="button is-info" @click="init">Retry</a></p>
          </div>
        </article>
      </div>
    </div>
    <div class="column is-8" v-else>
      <div class="box has-background-primary-90 has-text-centered">
        <h4 class='title is-4 my-6'>
          <Icon icon="spinner" spin>Fetching server information</Icon>
        </h4>
      </div>
      <div class="block">
        <div class="skeleton-lines">
          <div></div>
          <div></div>
        </div>
      </div>
      <div class="box">
        <div class="skeleton-block" style="height:500px">

        </div>
      </div>
    </div>

    <div class="column" v-if="serverInfo">
      <div class="field">
        <label class="label">View another server:&nbsp;</label>
        <div class="select">
          <select @change="onSelectNewServer">
            <option default v-if="!serverIds">Loading servers...</option>
            <option v-for="server2 in serverIds" :key="server2.id" :value="server2.id" :selected="server2.id == serverInfo.id">
              {{server2.name}}
            </option>
          </select>
        </div>
      </div>
      <div class="box" v-if="tab === 'overview' || tab === 'live'">
        <span class="is-inline is-pulled-right no-border pr-4" data-tooltip="Time until next refresh" style="width:10px">
          <Icon icon="fa-spinner" spin v-if="nextRefreshCountdown == 0"></Icon>
          <span v-else>{{ nextRefreshCountdown }}s</span>
        </span>
        <h4 class="title is-5">Recent Activity</h4>
        <template v-if="activities">
          <table v-if="activities.length > 0" class="table is-fullwidth">
            <thead>
              <tr>
                <th>Message</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="activity in activities" :key="activity.id">
                <LogMessage :log="activity" :priv-user="privUser" />
                <td>{{ new Date(activity.timestampRaw * 1000).toLocaleTimeString()}}</td>
              </tr>
            </tbody>
          </table>
          <div class="box has-background-info-light" v-else>No recent activity has been recorded</div>
        </template>
        <div class="box has-background-warning-light" v-else>Recent activities is not supported on this server</div>
      </div>
      <div class="box" v-if="tab === 'live'">
        <!-- <span class="tag is-pulled-right is-danger has-tooltip-left" v-if="isLiveViewActive" data-tooltip="Connected to server, receiving live data">Live</span> -->
        <h4 class="title is-5">Game Info</h4>
        <table class="table is-fullwidth" v-if="liveStatus?.game">
          <tbody>
            <tr>
              <th>Campaign</th>
              <td class="has-text-right">{{ formatCampaign(liveStatus.game.map) }}</td>
            </tr>
            <tr>
              <th>Gamemode</th>
              <td class="has-text-right">{{ formatGamemode(liveStatus.game.gamemode) }}</td>
            </tr>
            <tr>
              <th>Difficulty</th>
              <td class="has-text-right">{{ DIFFICULTY_NAME[liveStatus.game.difficulty] }}</td>
            </tr>
            <tr v-if="liveStatus.finale && liveStatus.finale.stage !== FinaleStage.Unknown">
              <th>Finale Info</th>
              <td class="has-text-right" v-if="liveStatus.finale.escapeInProgress">Escaping</td>
              <td class="has-text-right" v-else>{{ FinaleStageName[liveStatus.finale.stage] }}</td>
            </tr>
            <tr>
              <th>Server Uptime</th>
              <td class="has-text-right" v-if="liveStatus.game.startTime">{{ getDuration(liveStatus.game.startTime) }}</td>
              <td v-else>-</td>
            </tr>
            <tr>
              <th>Campaign Duration</th>
              <td class="has-text-right" v-if="liveStatus.game.campaignStartTime">{{ getDuration(liveStatus.game.campaignStartTime) }}</td>
              <td v-else>-</td>
            </tr>
            <tr>
              <th>Last Update</th>
              <td class="has-text-right">
                <p>{{ lastLiveUpdateTime }}</p>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else>Game data will appear here when live data is available</p>
      </div>
      <div v-else-if="tab === 'configs'" class="box">
        <h5 class="title is-5 mb-2">Config Files</h5>
        <FolderBrower v-if="serverConfigs" @select="onCfgChosen" :paths="serverConfigs"/>
        <div class="box has-background-danger-light" v-else>
          <p class="subtitle has-text-centered is-6 ">Not available for this server</p>
        </div>
      </div>
      <div v-else-if="tab === 'console'" class="box">
        <h5 class="title is-5">Console Help Information</h5>
        <p>
          Commands that you would use in chat such as <code>/slay</code> (or publicly <code>!slay</code>) use the <code>sm_</code> prefix in the console.
          An example command <code>/slay jockey</code> would be <code>sm_slay jockey</code>.
        </p>
        <br>
        <p>
          Unknown commands will be shown as <span class="has-text-danger">red</span>, where known commands will show as white. Some commands may not be marked as known, but you can still attempt to enter them.
        </p>
        <br>
        <p>
          Some commands were not decided to run from console and can't be used, this includes any command that shows a menu (/fta, /notesdisconnected, etc).
        </p>
      </div>
        <article class="message is-warning" v-if="tab === 'console'">
        <div class="message-header">
          <p>Notice</p>
        </div>
        <div class="message-body">
          Please note that the console access gives you full access to the server and as such every command you run will be logged. Every command you use will be ran as "Console", not identified to you in-game in any way. Console access is a privilege, don't abuse it.
        </div>
      </article>
    </div>
    <div class="column" v-else-if="!error">
      <div class="field">
        <label class="label">View another server:&nbsp;</label>
        <div class="select">
          <select @change="onSelectNewServer">
            <option default v-if="!serverIds">Loading servers...</option>
            <option v-for="server2 in serverIds" :key="server2.id" :value="server2.id"
              :selected="server2.id == route.params.id">
              {{server2.name}}
            </option>
          </select>
        </div>
      </div>
      <div class="box">
        <div>
          <h4 class="title is-4">Recent Activity</h4>
          <div class="skeleton-block" style="height:280px"></div>
        </div>
      </div>
    </div>
  </div>
</nav>
</div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { ref, computed, onUnmounted, onBeforeUnmount, onMounted } from 'vue';
import FolderBrower from'@/components/FolderBrowser.vue'
import { PlayerData, PrivilegedUser } from '@/js/User';
import { parseLog, getRelDate, request } from '@/js/util';
import LogMessage from "@/components/LogMessage.vue";
import { useNotification } from "@kyvg/vue3-notification";
import Field from '@/components/Field.vue';
import { SurvivorId, FinaleStage, PlayerState, PlayerGameAction, PlayerMove, InfectedClass, LiveDataCache, LiveRecord, updateLiveCache, LiveSurvivor, LiveInfected, LiveRecordType, GameDifficulty, CommandResultType, GameState, ClientState, LiveClient } from '../../../../common-types/Live';
import { UserPrivilegeCode } from '../../../../common-types/Privileges';
import { formatDate, getDuration } from '../../js/util.js';
import UserComponent, { User } from '@/components/UserComponent.vue';
import Console from '@/components/server/Console.vue'
import { ServerData, ServerInfo, ServerDetailed } from '../../../../common-types/Server';

const FinaleStageName: Record<FinaleStage, string> = {
    [FinaleStage.Gauntlet]: "Gauntlet",
    [FinaleStage.Unknown]: "Unknown",
    [FinaleStage.Gauntlet2]: "Gauntlet",
    [FinaleStage.HordeWave1]: "Horde Wave",
    [FinaleStage.FirstBoss]: "First Tank",
    [FinaleStage.GauntletHorde]: "Gauntlet: Horde",
    [FinaleStage.GauntletHordeBonusTime]: "Gauntlet: Over Time",
    [FinaleStage.GauntletHordeBossIncoming]: "Gauntlet: Tank Incoming",
    [FinaleStage.GauntletBoss]: "Gauntlet: Tank",
    [FinaleStage.GauntletEscape]: "Gauntlet: Escape",
    [FinaleStage.GauntletStart]: "Gauntlet",
    [FinaleStage.HordeWave2]: "Horde Wave",
    [FinaleStage.FinalBoss]: "Final Boss",
    [FinaleStage.CustomPanic]: "Panic",
    [FinaleStage.CustomTank]: "Tank",
    [FinaleStage.CustomScripted]: "Scripted",
    [FinaleStage.CustomDelay]: "Intermission",
    [FinaleStage.CustomClearout]: "Clearout",
    [FinaleStage.HordeEscape]: "Horde Escape",
}

const PlayerGameActionString: Record<PlayerGameAction, string> = {
  [PlayerGameAction.BeingHealed]: "Being Healed",
  [PlayerGameAction.None]: "None",
  [PlayerGameAction.Healing]: "Healing",
  [PlayerGameAction.AmmoPack]: "Deploying Ammo Pack",
  [PlayerGameAction.DefibDefibing]: "Defibbing",
  [PlayerGameAction.GettingDefibed]: "Being Defibbed",
  [PlayerGameAction.DeployIncendiary]: "Deploying Fire Ammo",
  [PlayerGameAction.DeployExplosive]: "Deploying Explosive Ammo",
  [PlayerGameAction.PouringGas]: "Pouring Gascan",
  [PlayerGameAction.Cola]: "Using Cola",
  [PlayerGameAction.Button]: "Pressing button",
  [PlayerGameAction.UsePointScript]: "Pointing",
}

const PlayerMoveString: Record<PlayerMove, string> = {
  [PlayerMove.UnderAttack]: "Pinned by Special",
  [PlayerMove.Hanging]: "Hanging",
  [PlayerMove.Incapped]: "Incapped",
  [PlayerMove.Idle]: "Standing",
  [PlayerMove.Walk]: "Walking",
  [PlayerMove.Run]: "Running",
  [PlayerMove.Crouched]: "Crouching",
  [PlayerMove.Ladder]: "Climbing",
}
const REFRESH_INTERVAL = 1000 * 15

const { notify } = useNotification();
const props = defineProps<{
  privUser: PrivilegedUser
}>()

const route = useRoute()
const router = useRouter()

const SURVIVOR_IDS = ["gambler", "producer", "coach", "mechanic", "namvet", "teenangst", "biker", "manager"]
const STATES: { [key in PlayerState]?: string } = {
  [PlayerState.BlackAndWhite]: "Black & White",
  [PlayerState.InSaferoom]: "In Saferoom",
  [PlayerState.IsCalm]: "Calm",
  [PlayerState.IsBoomed]: "Is Boomed"
}
const DIFFICULTY_NAME: { [key in GameDifficulty]?: string } = {
  [GameDifficulty.Easy]: "Easy",
  [GameDifficulty.Normal]: "Normal",
  [GameDifficulty.Advanced]: "Advanced",
  [GameDifficulty.Expert]: "Expert",
}

const TABS: Record<string, { name: string, tag?: string, permission?: string, enabled?: Function }> = {
  overview: {
    name: "Overview",
  },
  live: {
    name: "Live View",
    enabled: () => {
      return serverInfo.value?.type === "source"
    }
  },
  configs: {
    name: "Configs",
    permission: 'servers.configs.read.<id>',
    enabled: () => {
      return serverInfo.value?.features.configs
    }
  },
  console: {
    name: "Console",
    permission: "servers.action.<id>",
    enabled: () => {
      return serverInfo.value?.features.console
    }
  }
}

let starting = ref(false)
let lastRefreshTime = ref()
let serverInfo = ref<ServerInfo>()
let serverConfigs = ref()
let serverIds = ref()
let status = ref()
let liveStatus = ref<LiveDataCache>()
let liveStatusNextRetryTime = ref<number>()
let lastLiveUpdateTime = ref<string>()
let uptime = ref<number>()
let activities = ref()
let cfg = ref<{
  selected?: { filename: string, path: string }, raw?: string, json?: any, loading: boolean }
>({ loading: false })
let error = ref<string>()
let now = ref(Date.now())
let showDetailsId = ref<number>()
let shiftPressed = ref(false)
let actionRunning = ref()

const cfgParentFolder = computed(() => {
  if(!cfg.value.selected) return
  return cfg.value.selected.path.substring(0, cfg.value.selected.path.length - cfg.value.selected.filename.length)
})

const actions = computed(() => {
  if(!serverInfo.value) return []
  return serverInfo.value.actions.filter(action => shiftPressed.value || !action.isHidden)
})
const tab = computed(() => {
  return route.params.tab.length > 0 ? route.params.tab : "overview"
})
const mapInfo = computed(() => {
  if(!status.value?.data) return
  return getMapDisplay(status.value.data.map)
})
const nextRefreshCountdown = computed(() => {
  if(!lastRefreshTime.value || !now.value) return 0
  return Math.max(Math.floor(((lastRefreshTime.value + REFRESH_INTERVAL) - now.value) / 1000), 0)
})

const nextLiveRetryTime = computed(() => {
  if(liveStatusNextRetryTime.value === undefined || !now.value) return 0
  return Math.max(Math.ceil((liveStatusNextRetryTime.value - now.value) / 1000), 0)
})

function isTabEnabled(data: any): boolean {
  if(data._enabled != undefined) return data._enabled
  if(data.enabled == undefined && data.permission == undefined) {
    data._enabled = true
    return true
  }
  let enabled = false
  if(data.permission != undefined) {
    const perm = data.permission.replace(/<id>/g, serverInfo.value?.id)
    enabled = props.privUser.hasPermission(perm as UserPrivilegeCode)
  }
  if((data.permission == undefined || enabled) && data.enabled != undefined) {
    enabled = data.enabled() ?? true
  }
  data._enabled = enabled
  return enabled
}

function getPlayerWeaponNames(player: LiveClient) {
  if(!player.survivor?.items) return []
  return player.survivor.items
    .filter(item => item)
    .map(item => {
      return item.replace("weapon_", '').replace(/_/g, ' ')
    })
}

function getPlayerStates(player: LiveClient) {
  const states: string[] = []
  if(!player.survivor) return states
  for(const [state, value] of Object.entries(STATES)) {
    if(player.survivor.states & Number(state)) states.push(value)
  }
  return states
}

function getIconUrl(player: LiveClient) {
  if(!player.isAlive) return `/img/survivors/dead.png`
  if('survivor' in player && player.survivor?.survivor != undefined) {
    return `/img/survivors/${SURVIVOR_IDS[player.survivor.survivor]}.png`
  } else if('infected' in player && player.infected) {
    return `/img/survivors/${player.infected.class == InfectedClass.Tank ? 'tank' : 'infected'}.png`
  }
  return `/img/survivors/unknown.png`
}

async function onCfgChosen(entry: { path: string, filename: string }, raw = false) {
  cfg.value.selected = entry
  cfg.value.loading = true
  const response = await fetch(`/api/servers/${route.params.id}/configs?path=${cfg.value.selected.path}${raw?'&raw=1':''}`)
  cfg.value.loading = false
  if(response.ok) {
    cfg.value.json = undefined
    cfg.value.raw = undefined
    if(raw)
      cfg.value.raw = await response.text()
    else
      cfg.value.json = await response.json()
  }
}

async function onSelectNewServer(event: any) {
  await router.push({ name: 'admin-server-view', params: { tab: 'overview', id: event.target.value }})
  serverInfo.value = undefined
  activities.value = undefined
  // Delete old enables
  Object.values(TABS).map(t => (t as any)._enabled = undefined)
  init()
}
async function fetchServerInfo() {
  error.value = undefined
  const id = route.params.id
  const response = await fetch(`/api/servers/${route.params.id}`)
  if(id != route.params.id) return // Ignore changes in id
  try {
    const json = await response.json()
    if(response.ok) {
      serverInfo.value  = json as ServerInfo
      return true
    } else {
      error.value = json.message ?? json.err ?? json ?? await response.text()
      return false
    }
  } catch(err: any) {
    console.error(err)
    error.value = `${response.status} ${response.statusText}: ${err.message}`
    return false
  }
}

async function fetchServerData() {
  error.value = undefined
  const id = route.params.id
  const response = await fetch(`/api/servers/${route.params.id}/data`)
  if(id != route.params.id) return // Ignore changes in id
  try {
    const json = await response.json()
    if(response.ok) {
      const data = json as ServerDetailed
      liveStatus.value = data.live
      serverConfigs.value = data.configs
    } else {
      error.value = json.message ?? json.err ?? json ?? await response.text()
    }
  } catch(err: any) {
    console.error(err)
    error.value = `${response.status} ${response.statusText}: ${err.message}`
  }
}

let isRefreshing = false
async function fetchServerStatus() {
  const id = route.params.id
  try {
    if(id != route.params.id || isRefreshing) return // Ignore changes in id or if refreshing
    isRefreshing = true
    const response = await fetch(`/api/servers/${route.params.id}/status`)
    lastRefreshTime.value = Date.now()
    const json = await response.json()
    isRefreshing = false
    if(response.ok && json) {
      status.value = json.status
      uptime.value = json.uptime
      activities.value = json.recentActivities?.map((act: any) => parseLog(act))
    } else {
      error.value = json.message
      status.value = { error: json.message }
    }
  } catch(err: any) {
    error.value = err.message
    status.value = { error: err.message }
    isRefreshing = false
  }
}
const SERVER_CACHE_EXP_TIME = 1000 * 60 * 60 * 24 // 1 day
async function fetchServersCompact() {
  let cachedServers: any = window.localStorage?.getItem("srcds_servers")
  if(cachedServers) cachedServers = JSON.parse(cachedServers)

  if(!cachedServers || Date.now() - cachedServers.timestamp > SERVER_CACHE_EXP_TIME) {
    const response = await request(`/api/servers?compact=1`)
    if(response?.ok) {
      const json = await response.json()
      cachedServers = {
        timestamp: Date.now(),
        data: json
      }
      window.localStorage.setItem("srcds_servers", JSON.stringify(cachedServers))
    }
  }
  serverIds.value = cachedServers.data
}

async function kickPlayer(player: LiveClient) {
  const reason = prompt(`Enter a reason to kick \"${player.name}\":`)
  if(!reason) {
    return notify({
      type: "warning",
      text: "Kick Cancelled (no reason provided)"
    })
  }
  await performAction(`builtin:kick #${player.userid}`)
}

async function performAction(command: string, options: Record<string, any> = {}) {
  // Ask user to confirm:
  const prefix = command.split(" ").shift()

  if(prefix === "builtin:stop" && options.force) {
    if(!confirm("You are requesting to forcefully restart the server. This should only be used in the last resort, if the server became unresponsive. This does not check for players being online. Are you sure?")) return
  }
  const response = await request(`/api/servers/${serverInfo.value!.id}/action/${command}`, {
    method: 'POST',
    credentials: 'include'
  })
  if(response?.ok) {
    const json = await response.json()
    if(json.resultType === CommandResultType.Error) {
      notify({
        type: "danger",
        title: `Action (${prefix}) Failed`,
        text: json.message
      })
    } else if(json.resultType === CommandResultType.Boolean) {
      notify({
        type: json.result ? "success" : "warn",
        title: json.result ? `Action (${prefix}) Succeeded` : `Action (${prefix}) Failed`,
        text: json.message
      })
    }
  }
}

function getHealthClass(health: number) {
  if(health > 50)
    return 'has-background-success'
  else if(health > 30) {
    return 'has-background-warning'
  } else {
    return 'has-background-danger'
  }
}
function toggleDetails(player: LiveClient) {
  console.log(showDetailsId.value, player.userid)
  if(showDetailsId.value === player.userid) {
    showDetailsId.value = undefined
  } else {
    showDetailsId.value = player.userid
  }
}
function formatCampaign(mapId: string) {
  const display = getMapDisplay(mapId)
  return display ? `${display.name} - ${display.chapterName} (${display.chapterId})` : mapId
}
function getMapDisplay(mapId: string) {
  const match = mapId.match(/c(\d{1,2})m(\d)_(.*)/)
  if(match && match.length == 4) {
    return {
      name: OfficialCampaignNames[Number(match[1]) - 1],
      chapterId: match[2],
      chapterName: match[3].charAt(0).toUpperCase() + match[3].slice(1)
    }
  }
  return null;
}

const uptimeDuration = computed(() => {
  if(!uptime.value) return
  const minutes = uptime.value / 60
  const hours = minutes / 60
  if(hours < 1) return `${Math.round(minutes)} minutes`
  const days = hours / 24
  if(days < 1) return `${Math.round(hours)} hours`
  return `${Math.round(days)} days`
})

function formatGamemode(gamemode: string) {
  let output = Gamemodes[gamemode];
  if(!output) {
    output = gamemode.charAt(0).toUpperCase() + gamemode.slice(1)
  }
  return output
}

async function copyAddress() {
  await navigator.clipboard.writeText(`connect ${serverInfo.value!.domain}:${serverInfo.value!.port}`)
  notify({
    type: "success",
    text: "Copied to clipboard"
  })
}

const Gamemodes: Record<string, string> = {
  "coop": "Campaign",
}

const OfficialCampaignNames = [
  "Dead Center",
  "Dark Carnival",
  "Swamp Fever",
  "Hard Rain",
  "The Parish",
  "The Passing",
  "The Sacrifice",
  "No Mercy",
  "Crash Course",
  "Death Toll",
  "Dead Air",
  "Blood Harvest",
  "Cold Stream",
  "The Last Stand"
]

const isLiveViewActive = computed(() => {
  if(liveStatusNextRetryTime.value) return false
  return liveReadyState.value == EventSource.OPEN
})
const livePlayers = computed(() => {
  if(!liveStatus.value?.clients) return []
  return Object.values(liveStatus.value.clients).sort((a, b) => {
    if('survivor' in a) return 1
    else if('survivor' in b) return -1
    return 0
  })
})
let errCount = 0
let liveReadyState = ref<number>(0)
let evtSource: EventSource
let retryTimeout: any
let reconnectTimeout: any

const MAX_BACKOFF = 1000 * 60 * 2

function createLiveConnection() {
  if(errCount === -1) return // Unloading, dont start new
  liveReadyState.value = EventSource.CONNECTING
  evtSource = new EventSource(`/api/servers/${route.params.id}/live`);
  evtSource.onmessage = (event) => {
    errCount = 0
    liveStatusNextRetryTime.value = undefined
    if(!event.data) return
    const json = JSON.parse(event.data)
    if(json.state) {
      if(json.state === "EXIT") {
        evtSource.close()
        return reconnect()
      }
    } else {
      const record: LiveRecord = json
      console.debug("got", LiveRecordType[record.type], record, 'pre=', Object.assign({}, liveStatus.value))
      liveStatus.value = updateLiveCache(liveStatus.value, record)
      if(record.type === LiveRecordType.Game) {
        uptime.value = (Date.now()/1000) - record.startTime
      }
      // If we have live connection, server is alive
      status.value.online = true
    }

    clearTimeout(reconnectTimeout)
    reconnectTimeout = setTimeout(() => {
      console.debug("no msg in a while, reconnecting")
      createLiveConnection()
    }, 1000 * 60)
  }
  evtSource.onopen = () => {
    liveReadyState.value = EventSource.OPEN
    liveStatusNextRetryTime.value = undefined
  }
  evtSource.onerror = reconnect;
  function reconnect() {
    errCount++
    console.error("Disconnected from live server", { errCount })
    evtSource.close()
    liveReadyState.value = EventSource.CLOSED
    // Exponentional backoff:
    const retryTime = Math.min(1000 * (Math.pow(1.5, errCount / 2) + 5), MAX_BACKOFF)
    liveStatusNextRetryTime.value = Date.now() + retryTime
    retryTimeout = setTimeout(() => {
      createLiveConnection()
    }, retryTime)
  }
}

let refreshInterval: any = 0
let nowInterval: any = 0
async function init() {
  status.value = undefined
  error.value = undefined
  clearInterval(refreshInterval)
  if(await fetchServerInfo()) {
    await Promise.any([
      fetchServerData(),
      fetchServerStatus()
    ])
    if(serverInfo.value?.type === "source")
      createLiveConnection()
  }
  refreshInterval = setInterval(fetchServerStatus, REFRESH_INTERVAL)
}

nowInterval = setInterval(() => {
  now.value = Date.now()
  if(liveStatus.value)
    lastLiveUpdateTime.value = getRelDate(liveStatus.value.lastUpdate / 1000)
}, 1000)

onMounted(async() => {
  document.addEventListener("keyup", _toggleShift)
  document.addEventListener("keydown", _toggleShift)
  errCount = 0
  await fetchServersCompact()
  await init()
})
function _toggleShift(e: any) {
  shiftPressed.value = !!e.shiftKey
}
onBeforeUnmount(() => {
  document.removeEventListener("keyup", _toggleShift)
  document.removeEventListener("keydown", _toggleShift)
  errCount = -1
  clearInterval(refreshInterval)
  clearInterval(nowInterval)
  clearTimeout(retryTimeout)
})
</script>

<style scoped>
.config-string {
  color: #628503
}
.has-text-crossed {
  text-decoration: line-through;
}
.scroll-line {
  background: linear-gradient(217deg, rgba(255,0,0,.8), rgba(255,0,0,0) 70.71%),
    linear-gradient(127deg, rgba(0,255,0,.8), rgba(0,255,0,0) 70.71%),
    linear-gradient(336deg, rgba(0,0,255,.8), rgba(0,0,255,0) 70.71%);
  top: 0;
  left: 0;
  height: 10px;
  position: fixed;
  transition: 0.5s cubic-bezier(0.075, 0.82, 0.165, 1);
}
.player-item {
  border-top: thick green;
  border-style: solid;
  border-left: 0;
  border-bottom: 0;
  border-right: 0;
}
.progressbar {
  height: 1.2em;
  width: 100%;
  background-color: #c9c9c9;
  position: relative;
}
.progressbar::before {
  content: attr(data-label);
  font-size: 0.85em;
  position: absolute;
  text-align: center;
  top: -1px;
  left: 0;
  right: 0;
}
.progressbar .permhealth {
  background-color: #7cc4ff;
  /* display: inline-block; */
  height: 100%;
  background-color: red;
  float: left;
}
.progressbar .temphealth {
  background-color: #7cc4ff;
  display: inline-block;
  height: 100%;
  opacity: 0.35;
  background-color: red;
}
.progressbar .flow-progress {
  background-color: #7cc4ff;
  display: inline-block;
  height: 100%;
  background-color: #3e8ed0;
}
</style>
