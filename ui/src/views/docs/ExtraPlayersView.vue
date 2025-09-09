<template>
<div class="container">
  <div class="columns">
    <div class="column is-8">
      <div class="content">
        <p>Only servers tagged with <span class="tag is-dark">5+</span> support more than 4 players in campaign. Upto 14ish people can join, the first 4 via lobby, the rest from direct connect <code>connect l4d2.jackz.me</code> or via the steam group</p>
        <h5 class="title is-5">8-Player Lobby Setup Instructions</h5>
        <p>If you want to make it easier for everyone to join, you can set up an 8 player lobby using <a
          href="https://steamcommunity.com/sharedfiles/filedetails/?id=2276071285">8 Player Lobby Addon</a> & then follow the steps below.</p>
        <p>It is not necessary to make an 8 player lobby, any lobby will work, this just allows more than 4 people to be in a lobby.The 5+ servers are always 5+ capable, even without this addon.</p>

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
              <p><code>mm_dedicated_force_servers 147.135.1.163:27015</code></p>
              <p><em>The above IP is for the main 5+ server</em></p>
            </li>
        </ol>
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
