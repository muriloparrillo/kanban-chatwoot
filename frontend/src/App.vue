<script setup>
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { computed } from 'vue';
const route = useRoute();
const isSetup = computed(() => route.name === 'setup');
</script>

<template>
  <div class="h-full flex flex-col">
    <header v-if="!isSetup" class="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center font-bold">K</div>
          <h1 class="text-lg font-semibold">Kanban de Leads</h1>
        </div>
        <nav class="flex items-center gap-1 ml-4">
          <RouterLink to="/board"
            class="px-3 py-1.5 rounded-md text-sm hover:bg-slate-100"
            active-class="bg-brand/10 text-brand font-medium">
            Kanban
          </RouterLink>
          <RouterLink to="/settings/funnels"
            class="px-3 py-1.5 rounded-md text-sm hover:bg-slate-100"
            active-class="bg-brand/10 text-brand font-medium">
            Configurar Funis
          </RouterLink>
          <RouterLink to="/setup"
            class="px-3 py-1.5 rounded-md text-sm hover:bg-slate-100"
            active-class="bg-brand/10 text-brand font-medium">
            Conta
          </RouterLink>
        </nav>
      </div>
    </header>
    <main class="flex-1 overflow-hidden">
      <RouterView />
    </main>
  </div>
</template>
