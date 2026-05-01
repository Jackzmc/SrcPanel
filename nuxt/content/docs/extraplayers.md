---
title: 5+ Games
description: How to setup 5+ games, including 8 player lobbies
updated: 2026-05-01
links:
 - href: https://steamcommunity.com/sharedfiles/filedetails/?id=2276071285
   label: Addon Workshop Page
---
Only servers tagged with :u-badge[5+]{color="neutral"} support more than 4 players in campaign. Upto 14ish people can join, the first 4 via lobby, the rest from direct connect <code>connect l4d2.jackz.me</code> or via the steam group

## 8-Player Lobby Setup Instructions

If you want to make it easier for everyone to join, you can set up an 8 player lobby using [8 Player Lobby Addon](https://steamcommunity.com/sharedfiles/filedetails/?id=2276071285) & then follow the steps below.

It is not necessary to make an 8 player lobby, any lobby will work, this just allows more than 4 people to be in a lobby. The 5+ servers are always 5+ capable, even without this addon.

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

#sidebar

::u-button{href="https://steamcommunity.com/sharedfiles/filedetails/?id=2276071285",variant="outline"}
8 Player Lobby Addon - Workshop Page
::