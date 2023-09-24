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

Everytime a friendly fire is inflicted as a survivor, first any previously earned reverse ff rate is subtracted based on the minutes since their last ff and a decreasing rate cvar, which the default is 0.02:

`rffRate[attacker] -= minutes * rffDecrementRate`

Then, the increment scale (default is 0.01) cvar is applied, multiplied by the damage dealt:

` rffRate[attacker] += rffIncrementScale * dmg`

Then that new rate is multiplied against damage again `rffRate[attacker] * dmg` for the amount of damage they themselves take (the friendly fire attacker), and the victim of the friendly fire takes a perpendicular amount of damage (as the attacker friendly fire more, the victim receives less)

The goal of this system is to not punish accidental friendly fire (as it slowly is forgiven, based on time.) and to punish those that constantly, although typically unintentionally, with a slowly increasing punishment which they are in control of.

#### Side notes

When a teamkiller is detected (see above section), the attacker earns 2x increment scale, making them quickly get reverse friendly-fired hard.

## Crescendo Stopper

This plugin prevents the activation of buttons ahead of the team. It will prevent players from starting crescendos (and some small other activities as a side effect) until a certain threshold of the team has reached the area.

Flow is an internal system in l4d2 that measures how far along a survivor is in a map. The plugin caches the highest flow rate the survivor has achieved. (Therefore players need to be at the button only once)
If a button press activates a horde, then the next button press will be allowed by any player.

The algorithm for detecting if the button should be pressable or not is as followed:

1. If the previous button press caused a horde, the new button press is allowed 

2. All alive, survivors are checked for their flow. If their flow is less than the button activator's flow
    `player flow < (activator flow - threshold)` they are added to a far-away list
    * Threshold is to give a little buffer space, incase the other players are just a few meters away from button
4. If the amount of survivors added to far-away list is 0, allow the button press
   * Everyone is ahead of or at the button, so allow
5. If the the difference between the averaged flow of the far-away players and the activator flow is less than threshold, allow
    `activator flow - average <= threshold`
6. If the % of survivors that are far is less than or equal to a percent threshold (30%), allow
   `players / totalPlayers <= percentThreshold`

Sadly, althrough this works great at preventing some rushers, it also has its own issues that are hard to fix:
* Sometimes the buttons are far from the team, but should still be pressable (swamp fever finale, or death toll 4th chapter van button)
    * One or more admins can move forward near the button, then walk back. As their highest flow is what is used in calculation, this will allow button activation
* Sometimes the buttons are too close, but shouldn't be pressable
    * Unfortunately, its very difficult to balance the distances without making per-map configurations.
* Some events don't play the mob panic sound effect, causing the stop-event button from being blocked
    * Unfortuantely, there is not an easy way to detect these events to properly allow the activation.
  
## Extra Player Items

This plugin provides extra items for a game of 5+ players or more. This includes providing extra health kits in saferooms and extra items outside of the room.

### Extra Saferoom Kits

This feature has gone through multiple iterations to figure out the best and most reliable method. Due to some custom maps having item spawns in different locations the following system is used:

* Real survivor player count is all the EXTRA in game survivors (including idle) that are not bots
    - This means if there is 5 players, the count will be 1

1. A player enters a saferoom, this computes the total real player survivor count. At a minimum, the amount of extra kits provided will be this value, but bonus kits can be given depending on the team's average health, to compensate for the increased 5+ difficulty players might not be used to.
   1. If the average team health is less than or equal to 30, 100% more kits are given
   2. If the average team health is less than or equal to 50, 50% more kits are given.
   3. There is a random chance of a bonus kit
2. When a first aid kit is picked up and the player is in the saferoom, the event is cancelled and a new kit is given to them instead.
   - Sometimes this can cause a kit to be thrown
4. When they load back in from a map transition, if they do not already have a kit they are given an extra from the extra kit count pool

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

On first spawn, another feature is to give the incoming player's a random weapon. The system scans every player's weapons (primary and secondary/melee) and puts them into their respective lists. The new player is then given a random item from these lists.

There was some conflicts - one being ABM's spawning item feature, and another being giving them to their idle bot.

The ABM feature was easy to disable, but the other conflict was hard to figure out. When players first join, they are technically idle as the bot until they fully load in. When my plugin attempted to give items, the items would tend to drop on the floor infront. Now items are given directly to the player, which 80% of the time causes no dropped items.

### Extra Tanks

The goal is simple:

During games where there are 5 or more players, tanks are by default (determined by another plugin, ABM) spawned with an increased health dependent on player count.

The problem is, lots of players decide to not help with the tank, or there is too much activity or not enough room to all cleanly attack the tank. This usually means only around 30-40% of players are actively doing anything.


The solution is during non-finale tanks is to wait for a tank to spawn, and then "split" it's health, such that the ABM-increased 8000 HP tank would now have 4000 HP (4,000 is the default for advanced) and another tank spawns with 4000 HP as well. This has the benefit that a game of 7-8 players can hopefully break into two squads that fight the tanks, which helps mimic the traditional 4-player behavior.

#### Finales

The original system only did the splitting on the second finale tank, but after some games (ahem), I decided its necessary for it to always occur, but I didn't want to scrap the finale system.

The current system as it stands instead just spawns a second tank, normal health (I actually don't know if it has scaled player health) such that you'll fight 3.


#### Problems / Misc

A logical issue caused the first time, for it to get stuck in an infinite spawn loop of tanks after the spawn timer for the second timer ran. So... there was upto ~18 tanks at once all around... 

Another issue is the health, when I had the original finale split tanks health means they die really fast, like normal difficulty tanks, which isn't as enjoyable.

Another problem is when its too much, such as Hard Rain's finale. Two 8,000 HP tanks is a little bit extreme.

### Extra Witches

I wanted to have extra witches spawn, scaled by player count. This system has a lot of complexity, to ensure it still makes the game random and unpredictable. The system works as follows:

1. On map start, knowing the amount of players from the previous round (`abmExtraCount` in code), two biased, up-to 7-sided, dice are rolled.

	* The dice are biased to the left, [with this distribution (https://anydice.com/program/c91)](https://anydice.com/program/c91)
	* The minimum value of the dice is determined by `ceil((abmExtraCount - 4)/ 4)` where abmExtraCount is the internal variable tracking the number of players. The `abmExtraCount - 4` is to extract the number of _extra players_ (minus the 4 base players), and it's divided by 4 to slow it's increment.
2. The dice roll determines how many extra witches (the normal game director still can spawn its own witch) will spawn. Let's call that N
3. For every number of extra witches, a flow position is calculated between [0, M]
	* **M** is the map's maximum flow (see **Crescendo Stopper** for explanation)
	* The value is offset by **FLOW_CUTOFF** which is an arbitrary value that is chosen to prevent tanks from spawning too close to the beginning and ending saferooms / areas.
	* The end result is `[0 + FLOW_CUTOFF, M - FLOW_CUTOFF]`
4. A timer is created that runs periodically that first:
	a. Checks that at least **DIRECTOR_WITCH_MIN_TIME** (120 seconds) has passed since the last time _any_ witches (not just ours) have spawned
	b. There has not been N amount of witches spawned (`totalWitchesSpawned < N`)
5. The timer iterates over all flow positions calculated earlier, and checks if the highest flow achieved on the chapter is greater or equal to the flow.
	* If it is, a witch is spawned and the flow value is reset to 0.0 (to stop it continuously spawning more). The iteration breaks on the first witch spawn, we don't want to spawn more than one at a time.
	 
#### Witch Spawning
How the witch is spawned is pretty simple, there is a built in game command `z_spawn_old` that has an option to spawn like the director, `z_spawn_old witch auto`, that will spawn just like the director would.
The only gotcha is that the command runs around the player who executed the command. We run the command on behalf of the client with the highest flow value on the map, hoping that the director spawns the witch _ahead_ and not on-top or behind the survivors. Let's hope that works.