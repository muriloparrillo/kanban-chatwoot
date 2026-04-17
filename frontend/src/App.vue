<script setup>
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { computed } from 'vue';
const route = useRoute();
const isSetup = computed(() => route.name === 'setup');
// Quando embutido no iframe do Chatwoot, esconde o header principal
const isEmbedded = computed(() => new URLSearchParams(window.location.search).has('embedded'));
</script>

<template>
  <div class="h-full flex flex-col">
    <header v-if="!isSetup && !isEmbedded" class="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-brand text-white flex items-center justify-center font-bold text-sm">K</div>
          <h1 class="text-base font-semibold">Kanban de Leads</h1>
        </div>
        <nav class="flex items-center gap-1 ml-3">
          <RouterLink to="/board"
            class="px-3 py-1.5 rounded-md text-sm hover:bg-slate-100"
            active-class="bg-brand/10 text-brand font-medium">
            Kanban
          </RouterLink>
          <RouterLink to="/agenda"
            class="px-3 py-1.5 rounded-md text-sm hover:bg-slate-100"
            active-class="bg-brand/10 text-brand font-medium">
            Agenda
          </RouterLink>
          <RouterLink to="/tasks"
            class="px-3 py-1.5 rounded-md text-sm hover:bg-slate-100"
            active-class="bg-brand/10 text-brand font-medium">
            Tarefas
          </RouterLink>
          <RouterLink to="/settings/funnels"
            class="px-3 py-1.5 rounded-md text-sm hover:bg-slate-100"
            active-class="bg-brand/10 text-brand font-medium">
            Funis
          </RouterLink>
          <RouterLink to="/settings/products"
            class="px-3 py-1.5 rounded-md text-sm hover:bg-slate-100"
            active-class="bg-brand/10 text-brand font-medium">
            Produtos
          </RouterLink>
        </nav>
      </div>
    </header>

    <!-- Sem header quando embutido — navegação é feita pelo sidebar do Chatwoot (inject.js) -->

    <main class="flex-1 overflow-hidden">
      <RouterView />
    </main>
  </div>
</template>
