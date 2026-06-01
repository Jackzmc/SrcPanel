---
title: Player Notes
description: Information about the player notes feature
updated: 2026-05-01
---

Admins may leave small notes on a player, which all admins will see when said player connects. This is a useful feature to let other admins what to expect when people join such as trolls, newer players, friends, or good players. 

## Usage

There are two ways to add a note for a player in-game:

* [If still connected:]{.text-info.font-semibold} `/note playername "your note in quotes"`
  1. **Tip:** You don't need to enter their full name, just enough characters to uniquely target them.
  2. **Tip:** You can put the player's name in spaces as well, ex: "disgruntled pea"

* [If disconnected:]{.text-info.font-semibold} `/notedisconnected
 Opens up a list of previous players. Select the player's name, and then send a chat message to create the note message.

## Note Actions

Another feature of player notes is the ability to activate automatic actions that occur when the player joins. This can do things such as automatically muting the player (from voice chat or vocalizing), punishing them, or make them immune to automatic systems (auto reverse ff, teamkiller detection).

These actions must be the only content in the note, and must take the form of `@action.key.value`.
The action field is required, and the key/value fields may be optional () 

### Current Actions

The following actions exist:
* **@fta.[Troll_Name]{.text-info}** - Applies a troll, use underscores for the troll name as they will be replaced with spaces
(`Vomit Player` -> `Vomit_Player`)
* **@fta.[Troll_Name]{.text-info}.[\[Flags\]]{.text-success}** - The same as above, but with a specified numerical flag(s) value(s). This is an advanced feature which can apply certain settings to a troll as well.
* **@ignore.rff** - Makes the player automatically ignored for automatic reverse friendly fire damage.
* **@ignore.tk** - Makes the player ignored for automatic teamkiller detection.
* **@slap.[Delay]{.text-info}** - Slaps the player, with a specified delay in seconds

