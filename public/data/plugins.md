## TKStopper

The current system only applies for this condition:

* A non-admin survivor attacks another survivor. The victim is a real player OR an idle player bot.

There are three scenarios that can affect damage dealt / reversed:

1. If within first 2 minutes of joining, no damage is dealt to either victim or attacker. This prevents the next person to join being punished.
2. If during the finale vehicle arrival, they do 0x damage to victim and take 2x reverse friendly fire
3. If neither #1 or #2, both the victim and the attacker take 1/2 the original damage

In addition, no damage can be dealt by non-admins in saferooms.

During any of the above three conditions, if they deal (or attempt to deal) over 75 HP in 15 seconds they will be instantly banned for a set period of time (60 minutes). If they are for sure a team killer, it can be extended to a permanent ban.

Possibly feature in the future is instead of ban it sets up an auto troll, if for sure troll and not noob.

Possibly a random one of these combinations:

* Swarm & Nerf Gun (No Damage)
* Special Magnet & Spawn Charger
* Make all bots shoot player
* ThrowItAll & NoPickup
* GunJam and NoShove
* SpecialMagnet, TankMagnet, Damage Boost, Temp Quick Drain, NoPickup, SlowSpeed, HigherGravity, Swarm, NoShove, VocalizeGag

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
  
## Extra Player Tools

This plugin provides extra items for a game of 5+ players or more. This includes providing extra health kits in saferooms and extra items outside of the room.

### Extra Saferoom Kits

This feature has gone through multiple iterations to figure out the best and most reliable method. Due to some custom maps having item spawns in different locations the following system is used:

* Real survivor player count is all in game survivors (including idle) that are not bots

1. A player enters a saferoom, this computes the total real player survivor count. At a minimum the amount of extra kits provided will be this value, but bonus kits can be given depending on the team's average health.
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