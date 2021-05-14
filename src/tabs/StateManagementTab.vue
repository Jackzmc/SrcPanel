<template>
<div class="container content">
    <p>A new feature I have worked on allows you to save any or all player’s state at the time and restore it at a later point in time. It will save & restore:</p>
    <p>Currently it will only store three states, any older states are overwritten.</p>
    <ul>
        <li>Health (permanent & temp.)</li>
        <li>Pills or Adrenaline</li>
        <li>Location & Angles</li>
        <li>Incap & Death state</li>
    </ul>

    <p>Currently the plugin will automatically record everyone’s states on some conditions:
    <br><em>*triggers on first occurrence of condition for a set amount of time.</em></p>
    <ol>
        <li><b>JOIN</b> A new non-admin player joins*</li>
        <li><b>REVIVED_NON_ADMIN</b> – When a non-admin is revived</li>
        <li><b>FRIENDLY_FIRE</b> Friendly fire from non-admin player* </li>
        <li><b>FTT_MARKED</b> – When a player was marked by sm_mark command (marked as troll) </li>
        <li><b>MAP_START</b> – Beginning of a map, may miss a few players </li>
        <li><b>AUTO_TIMER</b> – Triggered every 2 minutes IF no recent recording 50s before </li>
    </ol>
    <p>Commands:</p>
    <ul>
        <li><b>sm_save</b> - Creates a global save state of all players manually
        <li><b>sm_restore &lt;player(s)&gt;</b> - Restores 1 or more player’s states
        <li><b>sm_state</b> - Will list everyone’s states status (Who, When it was recorded, Reason it was recorded)</li>
    </ul>
</div>
</template>

