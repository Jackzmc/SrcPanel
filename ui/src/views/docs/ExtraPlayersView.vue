<template>
<div class="container">
  <div class="columns">
    <div class="column is-8">
      <div class="content">
        <p>Only servers tagged with <span class="tag is-dark">5+</span> support more than 4 players in campaign. Upto 16ish people can join, the first 4 via lobby, the rest from direct connect <code>connect l4d2.jackz.me</code></p>
        <h5 class="title is-5">8-Player Lobby Setup Instructions</h5>
        <p>If you want to make it easier you can set up an 8 player lobby using this addon & then follow the steps below:
        <a href="https://steamcommunity.com/sharedfiles/filedetails/?id=2276071285">https://steamcommunity.com/sharedfiles/filedetails/?id=2276071285</a>
        </p>
        <ol>
            <li>In the main menu, select Mutations -> Change Mutation</li>
            <li>Select <b>8 Player Lobby</b></li>
            <li>Create a new lobby</li>
            <li>
                Click on <b>Edit Game Settings</b> and change <b>Gamemode</b> to <b>Campaign</b><br>
                <em>This makes it so that only the host (you) need to download the lobby addon</em>
            </li>
            <li>
              Set the server the lobby connects to by typing this in console:
              <p><code>mm_dedicated_force_servers 74.91.114.239</code></p>
              <p><em>The above IP is for the main 5+ server</em></p>
            </li>
        </ol>
        <p>You can even have two separate lobbies of 8 and 8 connect and they will merge into the server!</p>
        <article class="message is-warning">
            <div class="message-body">
                <p>
                <b>Note: </b>If the server does not have a custom map downloaded & installed, it will fail to find a server to join.
                </p>
            </div>
        </article>
      </div>
      <h4 class="title is-4">Tutorial Video</h4>
      <video src="https://i.jackz.me/2023/09/Irritatingsezq3.mp4" controls />
    </div>
    <div class="column">
      <p><a class="button" href="https://steamcommunity.com/sharedfiles/filedetails/?id=2276071285">8 Player Lobby Addon - Workshop Page</a></p>
      <br>
      <p><b>Note: </b>In the case that a player cannot join due to the server being "full", they need to wait for the game to start (all players to have loaded in) OR press the <b>Unreserve</b> button on the servers page to unreserve it early</p>
    </div>
  </div>

</div>
</template>
