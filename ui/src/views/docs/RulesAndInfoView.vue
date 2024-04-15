<template>
<div class="container">
  <div class="columns">
    <div class="column is-6">
      <div class="box content">
        <h4>Adding Players to the Group</h4>
        <p>If you think someone should be invited to the group chat and most people seem to be on the same page then start a discussion where everyone can vote on their addition.</p>
        <p>If anyone has something to say, they can leave a comment. Recommended to keep discussion on <b>Single Choice</b>, add "Yes" and "No" options, and keep <b>Respondants</b> <em>hidden</em>.</p>
        <router-link :to="{ name: 'discuss-new', query: { title: 'Add a Player', comments: 'hide', respondants: 'hide', responses: 'hide' }}">Click here to start a discussion</router-link>
      </div>
    </div>
    <div class="column is-6">
      <div class="box content">
        <h4>Rules</h4>
        <ol>
          <li>Please don't send NSFW content outside NSFW channels.</li>
          <li>Don't be a dick.</li>
          <li>Admin powers are a privilege, please be courtesy of others and not abuse them.
            <ul class="mt-0">
              <li>This includes doing things that can hinder someone's fun, such as incapping them purposefully, ruining their gameplay, etc.</li>
            </ul>
          </li>
          <li>Have fun</li>
        </ol>
      </div>
    </div>
  </div>
</div>
</template>
