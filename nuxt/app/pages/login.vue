<template>  
    <UContainer class="flex my-6 justify-center">
        <UPageCard 
            title="Login Required"
            icon="lucide:lock"
            description="Page requires you to login to view."
            class="bg-light-blue"
        >
            
            <template #footer>
                <div class="">
                    <div class="flex flex-row gap-4 ">
                        <SteamLoginButton />
                    </div>
                </div>
                <div class="mt-4">
                    <h4 class="text-md font-semibold">Other Logins</h4>
                    <p class="text-sm text-muted">Logins must be linked to a Steam Account to be used</p>
                    <div class="flex flex-row gap-4 my-3">
                        <FluxerLoginButton size="medium" />
                    </div>
                </div>
            </template>
        </UPageCard>
    </UContainer>
</template>

<script setup lang="ts">
import FluxerLoginButton from '~/components/oauth/FluxerLoginButton.vue';
import SteamLoginButton from '~/components/oauth/SteamLoginButton.vue';

const { isLoggedIn } = useAuth()
const route = useRoute()

if(isLoggedIn.value) {
    await navigate()
}

async function navigate()  {
    await navigateTo(route.query.return_to as string ?? '/')
}
</script>