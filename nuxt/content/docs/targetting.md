---
title: Player Targetting
description: General documentation for in-game commands, settings and features
updated: 2026-05-01
---

## Targetting by Name

The simpliest way to target someone is by their name. You only need to input enough of their name, that they would be uniquely identified. For example, to target a jockey, just "j" could target jockey, and jackz, but unless someone is named jock, "jock" would target the jockey.

When inputting a name and multiple targets match, the command will fail, as it doesn't know who you mean. You need to have only one target, unless you are targetting by groups. If there are more than one person with a name (such as two jockeys), you would need to target by groups, or user ids.

When entering a name with spaces, you must surround the name with quotes, to show that the name is all together.

## Targetting by Group

* **@me** - Targets yourself
* **@infected** - Targets all infected specials (tank, jockey, smoker, etc)
* **@dead** - Targets all dead players on your team
* **@alive** - Targets all alive players on your team
* **@[infected name]** - Targets all of that type (example: @jockey)
* **@[survivor name]** - Targets all of that type (example: @zoey)
* **@bots** - Targets all bots (selects both surivor bots and infected bots!)
* **@survivors** - Targets all survivors
* **@all** - Targets ALL PLAYERS (selects all players, bots, including special infected)
* **@sb** - Targets a random survivor bot

## Targetting by User ID

In some cases, the user has a nickname you cannot type yourself (special characters), or many players share the same name. In these cases, you can target them by their User ID.

You can find their userID by typing in your console the command **status**. This will result in this ugly output of connected players

```
# userid name uniqueid connected ping loss state rate
# 20 1 "Jackzie ❤" STEAM_1:0:49243767 36:45 97 0 active 20000
  ^  ^ client / entity index
  ∟ user id
```

The **first number** is their user id. To use it, simply use **#NUMBERHERE** _(in this example, #20)_ in replacement of their name. User ID won't change until the user disconnects from the server, or a new map starts.

Example: `sm_slay #20`