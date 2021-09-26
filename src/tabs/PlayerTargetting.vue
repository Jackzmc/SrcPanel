<template>
<div class="container" style="width:50%">
    <h4 class="title is-4 mb-2">Targetting by Name</h4>
    <p>The easiest way to target someone is simply by using their name.
      You only need to enter enough letters to make the input unique. If there was a jockey and jackz, if you only used 'j', it wouldn't know who to target. But if you use 'ja', it knows the only player that matches that is jackz.
    </p>
    <br>
    <p class="has-background-warning">Note that you cannot enter spaces, as spaces separate parameters to a command. If you want to include a space, you need to surround the name with quotes. "targetted name here"</p>
    <hr>
    <h4 class="title is-4 mb-2">Targetting by Group</h4>
    <ul>
        <li>@me<em> - Targets yourself</em></li>
        <li>@infected</li>
        <li>@dead</li>
        <li>@alive</li>
        <li>@&lt;infected name&gt; <em>(example: @jockey)</em> </li>
        <li>@&lt;survivor name&gt; <em>(example: @zoey)</em> </li>
        <li>@bots (selects both surivor bots and infected bots!) </li>
        <li>@survivors </li>
        <li>@sb <em>- selects a random survivor bot</em></li>
    </ul>
    <hr>
    <h4 class="title is-4 mb-2">Targetting by User ID</h4>
    <p>
      In the case that a user has a nickname that you cannot type yourself (like McJane's), you can target them by their user ID.
    </p>
    <p>You can find their userID by typing in your console <b>status</b>. This will result in this ugly output:</p>
    <pre>
      # userid name uniqueid connected ping loss state rate
      # 20 1 "Jackz ❤" STEAM_1:0:49243767 36:45 97 0 active 20000
    </pre>
    <p>
      The <b>first number</b> is their user id. To use it, simply use <b>#NUMBERHERE</b> <em>(ex #20)</em> in replacement of their name. User ID won't change until the user themselves actually disconnect, and so in my example I would use: <b>sm_slay #20</b>
    </p>
    <br>
</div>
</template>
