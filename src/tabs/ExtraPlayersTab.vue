<template>
<div class="container">
  <div class="columns">
    <div class="column is-8">
      <div class="content">
        <p>Only the main server (“Improved”) supports more than 4 players for campaign. By default, up to 12 people can join, first 4 by lobby, the rest by direct connection (the “connect lgs.jackz.me” command).</p>
        <p>If you want to make it easier you can set up an 8 player lobby using this addon & then follow steps:
        <a href="https://steamcommunity.com/sharedfiles/filedetails/?id=2276071285">https://steamcommunity.com/sharedfiles/filedetails/?id=2276071285</a>
        </p>
        <ol>
            <li>In the main menu, select mutations -> change mutation</li>
            <li>Select ‘8 Player Lobby’ & Create a new lobby</li>
            <li>
                Click on edit game settings and change the game type to campaign<br>
                <em>This makes it so that only you need download the addon to play</em>
            </li>
            <li>Set the server the lobby connects to by typing this in console:</li>
            <li>mm_dedicated_force_servers 45.33.30.87</li>
        </ol>
        <p>You can even have two separate lobbies of 8 and 8 connect and they will merge into the server!</p>
        <article class="message is-warning">
            <div class="message-body">
                <p>
                <b>Note: </b>If the server does not have a map downloaded, it will fail to find a server to join.
                </p>
            </div>
        </article>
      </div>
    </div>
    <div class="column">
      <a class="button" href="https://steamcommunity.com/sharedfiles/filedetails/?id=2276071285">8 Player Lobby Addon - Workshop Page</a>
    </div>
  </div>

</div>
</template>

<script>
export default {
  data() {
    return {
    }
  },
  computed: {

  },
  methods: {

  },
  created() {
  }
}
</script>
