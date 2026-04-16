<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import draggable from 'vuedraggable';
import { useBoardStore } from '../store/board';
import LeadCard from '../components/LeadCard.vue';
import FunnelSwitcher from '../components/FunnelSwitcher.vue';
import BoardFilters from '../components/BoardFilters.vue';
import LeadModal from '../components/LeadModal.vue';
import NewLeadButton from '../components/NewLeadButton.vue';

const route = useRouter();
const routeInfo = useRoute();
const store = useBoardStore();
const { stages, filteredLeadsByStage, loading, error, currentFunnelId, funnels } = storeToRefs(store);

const activeLead = ref(null);

onMounted(async () => {
  await store.loadFunnels();
  const requestedId = routeInfo.params.funnelId ? Number(routeInfo.params.funnelId) : null;
  if (requestedId) store.currentFunnelId = requestedId;
  if (store.currentFunnelId) await store.loadBoard(store.currentFunnelId);
  else route.push({ name: 'setup' });
});

watch(() => routeInfo.params.funnelId, async (v) => {
  if (!v) return;
  store.currentFunnelId = Number(v);
  await store.loadBoard(store.currentFunnelId);
});

// vuedraggable fires @change on the TARGET container with ev.added.
// The lists are already mutated — we just persist to the API.
const handleChange = async (stageId, ev) => {
  if (ev.added) {
    const lead = ev.added.element;
    const toIndex = ev.added.newIndex;
    try {
      await store.moveLead({ leadId: lead.id, toStageId: stageId, toIndex });
    } catch (e) {
      alert('Não foi possível mover este card. O board foi recarregado.');
    }
  }
};

const openLead = (lead) => { activeLead.value = lead; };
const closeLead = () => { activeLead.value = null; };
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-white border-b border-slate-200">
      <FunnelSwitcher :funnels="funnels" :model-value="currentFunnelId"
        @update:modelValue="(id) => route.push({ name: 'board-funnel', params: { funnelId: id } })"/>
      <BoardFilters />
      <NewLeadButton :funnel-id="currentFunnelId" :stages="stages" @created="() => store.loadBoard()"/>
    </div>

    <!-- Board -->
    <div v-if="loading" class="flex-1 flex items-center justify-center text-slate-500">Carregando funil…</div>
    <div v-else-if="error" class="flex-1 flex items-center justify-center text-red-600">{{ error }}</div>

    <div v-else class="flex-1 overflow-x-auto overflow-y-hidden scroll-thin">
      <div class="flex gap-3 p-3 h-full">
        <div v-for="stage in stages" :key="stage.id"
             class="flex flex-col w-64 flex-shrink-0 bg-slate-100 rounded-lg border border-slate-200">
          <div class="flex items-center justify-between px-3 py-2 border-b border-slate-200">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full" :style="{ background: stage.color }"></span>
              <span class="font-medium text-sm">{{ stage.name }}</span>
              <span class="text-xs text-slate-500">{{ (filteredLeadsByStage[stage.id] || []).length }}</span>
            </div>
            <span v-if="stage.stage_type === 'won'" class="text-xs text-emerald-600 font-semibold">GANHO</span>
            <span v-else-if="stage.stage_type === 'lost'" class="text-xs text-slate-500">PERDIDO</span>
          </div>

          <draggable
            :list="filteredLeadsByStage[stage.id] || []"
            group="leads"
            item-key="id"
            class="flex-1 p-2 space-y-2 overflow-y-auto scroll-thin"
            ghost-class="card-ghost"
            drag-class="card-drag"
            @change="(ev) => handleChange(stage.id, ev)">
            <template #item="{ element }">
              <LeadCard :lead="element" @click="openLead(element)" />
            </template>
          </draggable>
        </div>

        <div v-if="!stages.length" class="flex-1 flex items-center justify-center text-slate-500">
          Este funil ainda não tem etapas.
          <RouterLink to="/settings/funnels" class="ml-2 text-brand underline">Configurar</RouterLink>
        </div>
      </div>
    </div>

    <LeadModal v-if="activeLead" :lead="activeLead" @close="closeLead" @updated="() => store.loadBoard()" />
  </div>
</template>
