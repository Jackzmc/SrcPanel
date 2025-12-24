<template>
<div class="container">
  <div class="columns is-multiline">
    <div class="column">
      <div id="add-to-chat-group" class="box content">
        <h4>Adding Players to the Chat Group</h4>
        <p>If you think someone should be invited to the <b>chat</b> group and you believe most people seem to be on the same page then you may start a discussion where everyone can vote on them being added.</p>
        <p>If anyone has something to say, they can leave a comment. Recommended to keep discussion on <b>Single Choice</b>, add "Yes" and "No" options, and keep <b>Respondants</b> <em>hidden</em>.</p>
        <p>If you add their steamid2 (STEAM_#:#:######) to description, it will show a user tooltip for them</p>

        <div class="block">
          <router-link :to="{ name: 'discuss-new', query: { title: 'Add a Player', comments: 'hide', respondants: 'hide', responses: 'hide' }}">Click here to start a discussion</router-link>
        </div>

        <h5>Critera for adding a player</h5>
        <ul>
          <li>They must have already played minimum of 25 hours on the server</li>
          <li>If they were previously discussed on, it has been a month since then the vote ended</li>
          <li>The vote must last minimum 2 weeks</li>
        </ul>
      </div>
      <div id="guidelines" class="box content">
        <h4>Command Use Guidelines</h4>
        <p>The following guidelines are intended for using commands in <b>official campaign maps</b>. In custom maps, its less of an issue.</p>
        <p>These are guidelines, not rules, as they are not intended to never allow you to do these things. There are always exceptions, these are just meant to have everyone on the same page of what is okay and what is not.</p>
        <div>
          <h6>The general principles of the guidelines:</h6>
          <ol>
            <li>Use cheats in moderation, do not abuse it, or rely on them.</li>
            <li>If it affects others or the team, it's a problem.</li>
            <li>If the team as a whole is okay with it, then it's fine. Don't do actions for what <em>you</em> want, without considering the team</li>
            <li>Finales and customs are okay to goof off a little more, but don't be excessive.</li>
          </ol>
        </div>
        <br>
        <h6>Guidelines:</h6>
        <ul>
          <li>No slaying specials
            <ul>
              <li>Especially for other players. If they want, they can do it.</li>
              <li>If you are far away, unsavable (one way drop for example), its up to you if you want to. But only in these circumstances.</li>
              <li>If you got pinned, own it, it happens.</li>
            </ul>
          </li>
          <li>
            No slaying tanks
            <ul>
              <li>Exceptions were it <em>can</em> be okay:</li>
              <li>In custom maps, sometimes they spawn horribly early</li>
              <li>In some finales, they spawn way too close to escape vehicle.</li>
            </ul>
          </li>
          <li>No killing yourself and respawning just to restore health</li>
          <li>
            No reviving yourself, especially when others are coming to help, and it's not intentional.
            <ul>
              <li>Sometimes you are AFK, or far back and screw up; it's fine to self-revive when you are far away, clearly away from
                the action and team.</li>
            </ul>
          </li>
          <li>No noclipping around, it's distracting.</li>
          <li>Hats are OK, but don’t pick up large objects that block people's views; it’s annoying. Don’t over-use hats.</li>
          <li>Spawning props, especially large physics ones that interfere with people (in the way, hurts them, etc.) is NOT ok.
          </li>
          <!-- <li>Spawning items, weapons, ammo, lasers is not ok. If it's a chaotic game, on a finale, and everyone's goofing off?
            That’s fine every once in a while.</li> -->
          <li>Teleporting players, incapped or not</li>
          <ul>
            <li>If someone is going to save them, don’t just teleport them away right in front of that person; that’s just
              annoying.</li>
            <li>If they are far away, almost impossible to get to, fine.</li>
            <li>If they aren't incapped, teleporting players forcefully (excluding exceptions), is not OK</li>
            <li>Some exceptions: Ladder bugs, glitches, saferoom warps, they ask for it</li>
          </ul>
          <li>Respawning dead players</li>
          <ul>
            <li>It should be up to the dead player themselves if they want to respawn, they can type the command themselves.</li>
            <li>Some exceptions: ladder bugs, game glitches, or playing in custom maps.</li>
          </ul>
        </ul>
      </div>
      <div id="add-to-steam-group" class="box content">
        <h4>Adding Players to the Steam Group</h4>
        <p>If you think someone should be invited to the <b>steam</b> group, as you think they have potential you may add them to the steam group at your discretion. The steam group allows us to get used to them and see if they fit.</p>
        <p>To add them, send them the group link <code>https://steamcommunity.com/groups/jackzl4d2</code> and tell them to request to join. Then someone with access must accept their invite</p>
        <p>We can also grant them some limited admin powers (chat, kick, and seeing admin activity) if we think they are a good player</p>
      </div>
      <div id="rules" class="box content">
        <h4>Rules</h4>
        <ol>
          <li>Please don't send NSFW content outside NSFW channels.</li>
          <li>Don't be a dick.</li>
          <li>Admin powers are a privilege, please be courtesy of others and not abuse them.
            <ul class="mt-0">
              <li>This includes doing things that can hinder someone's fun, such as incapping them purposefully, ruining their gameplay, etc.</li>
            </ul>
          </li>
          <li>Have fun</li>
        </ol>
      </div>
    </div>
    <div class="column is-4">
      <div class="box">
        <Field icon-left="search">
          <input type="text" class="input" placeholder="Search for an item" />
        </Field>
        <aside class="menu">
          <p class="menu-label">Procedures</p>
          <ul class="menu-list">
            <li><a>Adding Players to the Chat Group</a></li>
            <li><a>Adding Players to the Steam Group</a></li>
          </ul>
          <p class="menu-label">Rules</p>
          <ul class="menu-list">
            <li><a>General Rules</a></li>
            <li><a>Command Use Guidelines</a></li>
          </ul>
        </aside>
      </div>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import Field from '@/components/Field.vue';
import { request } from '@/js/util.js';
import { onMounted, ref } from 'vue';

const items = ref<Record<string, any>[]>([])

async function fetchContent() {
  const response = await request("/api/cms/rules_procedures")
  if(response?.ok) {
    const json = await response.json()
    items.value = json.data
  }
}

onMounted(() => {
  fetchContent()
})
</script>