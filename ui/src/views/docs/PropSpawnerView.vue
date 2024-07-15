<template>
  <div class="container">
    <div class="columns">
      <div class="column content">
        <h4>About</h4>
        <p>
          The prop spawner lets you spawn any sort of props, anywhere you want. Make yourself a fortress.
          Please avoid using the prop spawner when non-admin/friends (publics) are playing, they are here to play the game, not build-a-fort.
        </p>
        <h4>Getting Started</h4>
        <p>
          <ol>
            <li>Enter <b>/admin</b> in chat to open the admin menu.</li>
            <li>Click on <b>Spawn Props</b> <em>(not the spawn objects)</em></li>
          </ol>
        </p>
        <h5>Spawning a prop</h5>
        <p>When you select a prop to spawn, it will show you a pink ghost preview - the prop will be placed exactly where you look when you press <kbd>Shift + Use</kbd>. </p>
        <p>There are multiple ways to select an object. You can see the most recently globally used prop, search for one by name, or view them by category.</p>
        <p>Some categories have a secondary category inside (Bodies)</p>
        <ol>
          <li>Press <b>Spawn Props</b></li>
          <li>Press <b>Prop List</b></li>
          <li>Select the category you want</li>
          <li>Select the item in the category to spawn</li>
          <li>Position your mouse where you want it to spawn</li>
          <li>Rotate the prop how you want. (See <a href="#rotation">Rotating Props</a> for help)</li>
          <li>Once satisfied, spawn it with <kbd>Use</kbd></li>
        </ol>
      </div>
      <div class="column is-4">
        <div class="box">
          <h4 class="title is-4">Keybinds Cheatsheat</h4>
          <h5 class="title is-5">Global</h5>
          <ul>
            <li><kbd>ZOOM (Middle mouse)</kbd> - Change mode (Move/Rotate, Color, Freelook)</li>
            <br>
            <li><kbd>Use</kbd> - Place</li>
            <li><kbd>Shift + Use</kbd> - Cancel Placement</li>
            <li><kbd>Ctrl + Use</kbd> - Change Placement Mode</li>
          </ul>
          <br>
          <h5 class="title is-5">Move / Rotate</h5>
          <ul>
            <li><kbd>Left Mouse</kbd> - Push away from you</li>
            <li><kbd>Right Mouse</kbd> - Bring closer to you</li>
            <li><kbd>Shift + R</kbd> - Toggles collision</li>
            <li><kbd>Ctrl + R</kbd> - Toggles collision rotating</li>
            <li><kbd>Space + R</kbd> - Toggles stacker tool</li>
            <br>
            <li><kbd>R + Left Mouse</kbd> - Change rotation axis</li>
            <li><kbd>R + Right Mouse</kbd> - Change rotation snap angle</li>
            <li><kbd>R + Move Mouse L/R</kbd> - Rotate object</li>
          </ul>
          <br>
          <h5 class="title is-5">Scale</h5>
          <br>
          <h5 class="title is-5">Color</h5>
          <ul>
            <li><kbd>E</kbd> - change color component (red, green, blue, alpha)</li>
            <li><kbd>Left Click</kbd> - decrease value of color component</li>
            <li><kbd>Right Click</kbd> - increase value of color component</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const LAST_UPDATED = new Date(Number(BUILD_TIMESTAMP))
</script>
