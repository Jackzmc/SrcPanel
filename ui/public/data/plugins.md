## TKStopper

The current system only applies for this condition:

1. A non-admin survivor attacks another survivor.
2. The victim is a real player OR an idle player bot.

There are three scenarios that can affect damage dealt / reversed:

1. If within first 2 minutes of joining, no damage is dealt to either victim or attacker. This prevents the next person to join being punished.
2. If during the finale vehicle arrival, they do 0x damage to victim and take 2x reverse friendly fire
3. If neither #1 or #2, then any reverse friendly fire damage is applied.

In addition, no friendly fire damage can be dealt in saferooms.

During any of the above three conditions, if they deal (or attempt to deal) over 75 HP in 15 seconds they will be instantly banned for a set period of time (60 minutes). If they are for sure a team killer, it can be extended to a permanent ban.

### Auto Reverse-FF

The automatic reverse friendly fire system works as followed:

Everytime a friendly fire is inflicted as a survivor, first any previously earned reverse ff rate is subtracted based on minutes since last ff and a decreasing rate cvar, which default is 0.02:

`rffRate[attacker] -= minutes * rffDecrementRate`

Then, the increment scale (default is 0.01) cvar is applied, multiplied by the damage dealt:

` rffRate[attacker] += rffIncrementScale * dmg`

Then that new rate is multiplied against damage again `rffRate[attacker] * dmg` for the amount of damage they themselves take (the friendly fire attacker), and the victim of the friendly fire takes a perpendicular amount of damage (as the attacker friendly fire more, the victim receives less)

The goal of this system is to not punish accidental friendly fire (as it slowly is forgiven, based on time.) and to punish those that constantly, although typically unintentionally, with a slowly increasing punishment which they are in control of.

#### Side notes

When a teamkiller is detected (see above section), the attacker earns 2x increment scale, making them quickly get reverse-ff hard.

## Crescendo Stopper

This plugin prevents the activation of buttons ahead of the team. It will prevent players from starting crescendos (and some small other activities as a side effect) until a certain threshold of the team has reached the area.

Flow is an internal system in l4d2 that measures how far along a survivor is in a map. The plugin caches the highest flow rate the survivor has achieved. (Therefore players need to be at the button only once)
If a button press activates a horde, then the next button press will be allowed.

The algorithm for detecting if the button should be pressable or not is as followed:

1. All alive, survivors are checked for their flow. They are added to a total flow value if their flow is less than the button activator's flow
    `player flow < (activator flow - threshold)`
2. If the amount of survivors added to total is 0, allow the button press
   * Everyone is ahead of or at the button, so allow
3. If the the difference between average flow of those players and the activator flow is less than threshold, allow
    `activator flow - average <= threshold`
4. If the % of survivors that are far is less than or equal to a percent threshold (30%), allow
   `players / totalPlayers <= percentThreshold`

Sadly, althrough this works great at preventing rushers, it also has its own issues that are hard to fix:
* Sometimes the buttons are far from the team, but should still be pressable (swamp fever finale, or death toll 4th chapter van button)
* Sometimes, depending if a map doesn't play the mob sound affect, the ending button is blocked from being pressed, which is not ideal
  
## Extra Player Items

This plugin provides extra items for a game of 5+ players or more. This includes providing extra health kits in saferooms and extra items outside of the room.

### Extra Saferoom Kits

This feature has gone through multiple iterations to figure out the best and most reliable method. Due to some custom maps having item spawns in different locations the following system is used:

* Real survivor player count is all in game survivors (including idle) that are not bots

1. A player enters a saferoom, this computes the total real player survivor count. At a minimum the amount of extra kits provided will be this value, but bonus kits can be given depending on the team's average health, to compensate for the increased 5+ difficulty players might not be used to.
   1. If the average team health is less than or equal to 30, 100% more kits are given
   2. If the average team health is less than or equal to 50, 50% more kits are given.
2. When a first aid kit is picked up and the player is in the saferoom, the event is cancelled and a new kit is given to them instead
3. When they load back in from a map transition, if they do not already have a kit they are given an extra

### Extra Cabinet Items

This feature took over 10 hours of development and brainstorming for such a simple feature. This feature simply will scale the amount of items in a cabinet (pills or kits) depending on the player count.

On map load, the plugin will search for all cabinets and add them to a list. It will also search for any pill spawners that are near a cabinet and added to a list of items for that cabinet.

The plugin keeps the amount of physical items in cabinet the same, just increases the amount you can pickup. This is the `cabinetItems` variable (a value between 1-4)

Then once the round freeze ends, it will check all cabinets and generate the amount of items to increase:
    `playerCount * (cabinetItems/4.0) - cabinetItems`
Then each item in the cabinet is constantly looped and its item count increased by one until the extra item count is 0.

### Saferoom Door Locking

This took a bit to figure out how to accurately check the saferoom door, as you can find all saferoom doors but you cannot easily find out if it is the beginning or ending saferoom.

The plugin checks all `prop_door_rotating_checkpoint` and find the first door with the `m_bLocked` property set to 1 (the door is locked). It then will keep that door locked until either a timer expires or when a percentage of players has loaded in.

### First Spawning

On first spawn, another feature is to give the incoming player's a random weapon. The system scans every player's weapon and filters them into a list of tier 2 weapons or tier 1 weapons, ignoring any tier 3 weapons. Then, if there is any tier 2 weapons, a random item is given to the incoming player, if not, then the tier 1 list is used.

Now giving the items has been difficult and I've gone back and forth between using the `give wpnName` command and `GivePlayerWeapon(client, "wpnName")` method, but I think the issues are fixed that I found that there is a conflict from ABM's auto giving of items I forgot about. 

### Extra Tanks

This system is still a work in progress but its goal is simple:

During games where there are 7 or more players, tanks are by default (determined by another plugin, abm) spawned with an increased health dependent on player count.

The problem is, lots of players decide to not help with the tank, or there is too much activity or not enough room to all cleanly attack the tank. 

My solution is during non-finale tanks is to wait for a tank to spawn, and then "split" it's health, such that a 8000 (default is ~4,000) HP tank would now have 4,000 hp and another tank spawns with 4,000 as well. This has the benefit that a game of 7-8 players can break into two squads that fight the tanks, which is the vanilla 4-player behavior. 

#### Finales

The original system only did the splitting on the second finale tank, but after some games (ahem), I decided its necessary to always occur, but I didn't want to scrap the finale system.

The current system as it stands instead just spawns a second tank, normal health (I actually don't know if it has scaled player health) such that you'll fight 3.


#### Problems / Misc

A logical issue caused the first time, for it to get stuck in an infinite spawn loop of tanks after the spawn timer for the second timer ran. So... there was upto ~18 tanks at once all around... 

Another issue is the health, when I had the original finale split tanks health means they die really fast, like normal difficulty tanks, which isn't as enjoyable.

Another problem is when its too much, as hard rain finale two full hp tanks is a little extreme.