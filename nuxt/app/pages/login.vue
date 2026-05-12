<template>  
    <UContainer class="flex my-6 justify-center">
        <div class="flex flex-col">
            <UPageCard 
                title="Login Required"
                icon="lucide:lock"
                :description="description"
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
            <p class="text-muted py-3">You must be an admin to be able to login to panel.</p>
        </div>
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

const description = computed(() => {
    if(route.query.return_to) return "Page requires you to login to view."
    return "Login to admin panel with steam or other login"
})

async function navigate()  {
    await navigateTo(route.query.return_to as string ?? '/')
}
</script>