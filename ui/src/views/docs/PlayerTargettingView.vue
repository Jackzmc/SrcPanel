<template>
<div class="container" style="width:50%">
    <div class="content">
      <h4 class="mb-2">Targetting by Name</h4>
      <p>The simpliest way to target someone is by their name. You only need to input enough of their name, that they would be uniquely identified. For example, to target a jockey, just "j" could target jockey, and jackz, but unless someone is named jock, "jock" would target the jockey.</p>
      <p>When inputting a name and multiple targets match, the command will fail, as it doesn't know who you mean. You need to have only one target, unless you are targetting by groups. If there are more than one person with a name (such as two jockeys), you would need to target by groups, or user ids.</p>
      <p>When entering a name with spaces, you must surround the name with quotes, to show that the name is all together. </p>

      <div class="box">
        <h5>Takeaways</h5>
        <ul>
          <li>Surround spaces with quotes, disgruntled pea -> "disgruntled pea"</li>
          <li>You don't need to enter a full name, just enough to identify one target</li>
        </ul>
      </div>
    </div>
    <br>
    <div class="content">
      <h4 class="mb-2">Targetting by Group</h4>
      <ul>
        <li>@me<em> - Targets yourself</em></li>
        <li>@infected - Targets all infected specials (tank, jockey, smoker, etc)</li>
        <li>@dead - Targets all dead players on your team</li>
        <li>@alive - Targets all alive players on your team</li>
        <li>@<em class="tag px-1">infected name here</em> - Targets all of that type <em>(example: @jockey)</em> </li>
        <li>@<em class="tag px-1">survivor name here</em> - Targets all of that type <em>(example: @zoey)</em> </li>
        <li>@bots - Targets all bots (selects <b>both</b> surivor bots and infected bots!) </li>
        <li>@survivors - Targets all survivors</li>
        <li>@all - Targets <b>ALL PLAYERS</b> (selects <b>all players, bots</b>, including special infected)</li>
        <li>@sb - Targets a random survivor bot</li>
      </ul>
    </div>
    <br>
    <div class="content">
      <h4 class="title is-4 mb-2">Targetting by User ID</h4>
      <p>In some cases, the user has a nickname you cannot type yourself (special characters), or many players share the same name. In these cases, you can target them by their User ID.</p>
      <p>You can find their userID by typing in your console the command <b>status</b>. This will result in this ugly output of connected players:</p>
      <pre style="">
# userid name uniqueid connected ping loss state rate
# 20 1 "Jackzie ❤" STEAM_1:0:49243767 36:45 97 0 active 20000
  ^  ^ client / entity index
  ∟ user id
      </pre>
      <p>
        The <b>first number</b> is their user id. To use it, simply use <b>#NUMBERHERE</b> <em>(in this example, #20)</em> in replacement of
        their name. User ID won't change until the user disconnects from the server, or a new map starts.
      </p>
      <p>Example: <code>sm_slay #20</code> </p>
    </div>
    <br>
</div>
</template>
