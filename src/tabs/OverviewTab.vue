<template>
<div class="container">
    <div class="columns is-multiline is-variable is-6">
        <div class="column">
            <article class="message is-info">
                <div class="message-header">
                    <p>Info</p>
                </div>
                <div class="message-body">
                    <p>
                        This page contains general information that does not have a specific category, or has the most important information.
                    </p>
                    <p>Server information is available below.</p>
                </div>
            </article>
        </div>
        <div class="column">
            <h4 class="title is-4">How to enable & open the developer console?</h4>
            <ol>
                <li>Go to your options, then keyboard/mouse</li>
                <li>Enable the option 'Allow Developer Console'</li>
                <li>Open the console with the tilda key (<b>`</b> or <b>~</b>, left of '1')</li>
            </ol>
        </div>
    </div>
    <br>
    <div class="columns is-gapless">
        <div class="column is-9">
            <Servers />
            <p class="is-inline is-pulled-right" style="margin-right: 90px">List auto updates every 2 minutes</p>
            <em>* Server supports custom maps</em><br>
            <em>** Server supports custom maps AND 5+ players</em>
        </div>
        <div class="column ">
            <h5 class="title is-5">Server Notes</h5>
            <div class="content">
            <ol>
                <li>Click on the name to have direct connect as a shortcut</li>
                <li>Only the improved server (first) supports <b>&gt;5 players.</b></li>
                <li>Directly connecting does not start matchmaking - no randoms will join! Use the lobby command and create a lobby</li>
            </ol>
            <h5>To create a lobby to a server:</h5>
            <ul>
                <li>Create a normal lobby, <b>you need to be the host</b></li>
                <li>Open the console (see above for instructions)</li>
                <li>Copy the 'Create Lobby Command' command and paste it in console</li>
                <li>Start the lobby</li>
            </ul>
            </div>
        </div>
    </div>
</div>
</template>

<script>
import Servers from '../components/Servers.vue'

export default {
  components: {
    Servers
  },
  data() {
    return {
    }
  },
}
</script>
