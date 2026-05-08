<template>
    <UModal
        :close="{ onClick: () => emit('close') }"
        title="Help"
        aria-describedby="Creation Modal"
        :open="true"
        :dismissible="true"
    >
        <template #body>
            <div class="space-y-4">
                <div>
                    <h3 class="text-xl font-bold">Actions</h3>
                    <ul class="list-disc mt-1 list-inside ml-2 text-sm">
                        <li><b>Unreserve</b> - Removes the active lobby reservation, allowing players to join when lobby is full. It is automatically removed once 4 players are fully in game.</li>
                        <li><b>Request Restart</b> - Restarts server <em>only</em> if no players are currently online</li>
                        <li><b>Force Restart</b> - Restarts server <em>regardless</em> of players online</li>
                        <li><b>Start</b> - Available only on some servers, starts the server</li>
                        <li><b>Stop</b> - Available only on some servers, stops the server, requiring it to be manually restarted</li>
                    </ul>
                </div>
                <div>
                    <h3 class="text-xl font-bold">Start New Server</h3>
                    <div class="ml-2 mt-1 space-y-2">
                        <p>
                            A new server can be created for some supported server groups. This can allow you to play even if another party is playing on the server you want already.
                        </p>
                        <p>Extra servers that are unused & empty for a duration of time may be automatically removed</p>
                    </div>
                </div>
                <div>
                    <h3 class="text-xl font-bold">Search</h3>
                    <div class="ml-2 mt-1 space-y-2">
                        <p>Search will search the following properties:</p>
                        <ul class="list-disc list-inside">
                            <li>Server Id</li>
                            <li>Server Name</li>
                            <li>Server IP</li>
                            <li>Server Port</li>
                            <li>Group Name</li>
                        </ul>
                        <!-- <p>In addition, you can filter only servers of a certain group with <code>@groupid</code> or <code>@groupname</code>. (no spaces)</p> -->
                    </div>
                </div>
            </div>
        </template>
    </UModal>
</template>

<script setup lang="ts">
const emit = defineEmits(['close'])
</script>