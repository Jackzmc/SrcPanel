# Panel Plugins

## Compilation

The latest compiled plugins for 1.12.x, 1.13.x can be found under my forgejo's instances actions page [https://git.jackz.me/jackz/sourcemod-plugins/actions?workflow=&actor=0&status=1](https://git.jackz.me/jackz/sourcemod-plugins/actions?workflow=&actor=0&status=1). Click on the top commit and on the left sidebar you'll see the 3 different versions.

## Plugin List

  * [panel_core](#panel_core) - Core plugin for admin panel and live view
  * [panel_activitymonitor](#panel_activitymonitor) - Records actions taken in game
  * [panel_bans](#panel_bans) - Synced bans among servers and panel
  * [panel_notes](#panel_notes) - Add notes to players

## Dependencies
This is a list of most common dependencies, independent if they are used for a certain plugin.
Check the plugin info for an exact list.

* [Left 4 Dhooks Direct](https://forums.alliedmods.net/showthread.php?t=321696)

### Development Dependencies
Most L4D2 plugins use my own include: `jutils.inc`, it's provided in this repo.
Some do require newer includes for my modified plugins (such as my improved survivor identity fix)

## Descriptions

### panel_core

TODO

### panel_activitymonitor

TODO

### panel_bans
This plugin will store bans in a database and read from it on connect. This allows you to easily have bans global between servers.
It will automatically intercept any ban that calls OnBanIdentity or OnBanClient (so sm_ban will work normally)
Note: Will not record any admins being banned.

* **Convars:**
  * `sm_globalbans_kick_type <0/1/2>`
    * 0 = Do not kick, just notify
    * 1 = Kick if banned (default)
    * 2 = Kick if cannot reach database

### panel_notes

Simply lets you add notes to any player, and includes reputation summary and automatic actions (for my other plugins). When a player joins, all admins will see their notes. 

[Docs for Automatic Actions](https://admin.jackz.me/docs/notes)

* **Commands:**
  * `sm_note <player> <message>` - Add notes to player, message does not need to be surrounded with quotes
  * `sm_notedisconnected` - Shows menu of all players that have disconnected, allowing you to add a note.
  * `sm_notes <player>` - Show the notes for player

