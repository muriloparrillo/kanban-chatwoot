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
import ListView from '../components/ListView.vue';

const route = useRouter();
const routeInfo = useRoute();
const store = useBoardStore();
const { stages, filteredLeadsByStage, leadsByStage, loading, error, currentFunnelId, funnels } = storeToRefs(store);

const activeLead = ref(null);
const activeView = ref('kanban'); // 'kanban' | 'list'

/* ── Filtros activos? Desabilita DnD quando há filtro ── */
const hasFilter = computed(() =>
  !!(store.filter.q || store.filter.assigneeId || store.filter.tagId || store.filter.priority != null)
);

/* ── Visibilidade de card quando há filtro ── */
function isVisible(stageId, leadId) {
  if (!hasFilter.value) return true;
  return (filteredLeadsByStage.value[stageId] || []).some(l => l.id === leadId);
}

/* ── Stats ── */
const statsLeads = computed(() => {
  let count = 0;
  for (const stageId of Object.keys(filteredLeadsByStage.value)) {
    count += (filteredLeadsByStage.value[stageId] || []).length;
  }
  return count;
});

const statsValue = computed(() => {
  let total = 0;
  for (const stageId of Object.keys(filteredLeadsByStage.value)) {
    for (const lead of (filteredLeadsByStage.value[stageId] || [])) {
      if (lead.value) total += Number(lead.value);
    }
  }
  return total;
});

const fmtCurrency = (v) =>
  'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

onMounted(async () => {
  if (routeInfo.query.view === 'list') activeView.value = 'list';

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

/*
 * DnD: vuedraggable dispara @change no container DESTINO com ev.added.
 * O :list aponta para leadsByStage[stage.id] — a array real do store —
 * então a mutação persiste. Apenas persistimos para a API aqui.
 */
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
    <div class="bg-white border-b border-slate-200">
      <div class="flex flex-wrap items-center gap-3 px-5 py-3">

        <!-- Funil Switcher -->
        <FunnelSwitcher
          :funnels="funnels"
          :model-value="currentFunnelId"
          @update:modelValue="(id) => route.push({ name: 'board-funnel', params: { funnelId: id } })"
        />

        <!-- Toggle Kanban / Lista -->
        <div class="flex items-center gap-0.5 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
          <button
            @click="activeView = 'kanban'"
            :class="[
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5',
              activeView === 'kanban'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            ]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="3" width="4" height="18" rx="1"/><rect x="9" y="3" width="4" height="12" rx="1"/><rect x="16" y="3" width="4" height="15" rx="1"/></svg>
            Kanban
          </button>
          <button
            @click="activeView = 'list'"
            :class="[
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5',
              activeView === 'list'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            ]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            Lista
          </button>
        </div>

        <!-- Espaçador -->
        <div class="flex-1"></div>

        <!-- Stats bar -->
        <div v-if="!loading && stages.length" class="flex items-center gap-4 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-brand/70"></span>
            <span class="text-slate-500">Total de Leads</span>
            <span class="font-semibold text-slate-700">{{ statsLeads }}</span>
          </div>
          <div class="w-px h-4 bg-slate-200"></div>
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-500/70"></span>
            <span class="text-slate-500">Oportunidades</span>
            <span class="font-semibold text-emerald-700">{{ fmtCurrency(statsValue) }}</span>
          </div>
        </div>

        <!-- Filtros + novo lead -->
        <BoardFilters />
        <NewLeadButton
          :funnel-id="currentFunnelId"
          :stages="stages"
          @created="() => store.loadBoard()"
        />
      </div>
    </div>

    <!-- Loading / Error -->
    <div v-if="loading" class="flex-1 flex items-center justify-center text-slate-500">
      Carregando funil…
    </div>
    <div v-else-if="error" class="flex-1 flex items-center justify-center text-red-600">
      {{ error }}
    </div>

    <!-- View: Kanban -->
    <div v-else-if="activeView === 'kanban'" class="flex-1 overflow-x-auto overflow-y-hidden scroll-thin">
      <div class="flex gap-3 p-3 h-full">
        <div
          v-for="stage in stages"
          :key="stage.id"
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

          <!--
            :list aponta para leadsByStage[stage.id] — array REAL do store.
            Vuedraggable muta esse array diretamente (splice), e a mutação persiste
            no Pinia. filteredLeadsByStage só é usado para contar e ocultar cards
            quando há filtro ativo (v-show). DnD fica desabilitado com filtro ativo.
          -->
          <draggable
            :list="leadsByStage[stage.id] || []"
            :disabled="hasFilter"
            group="leads"
            item-key="id"
            class="flex-1 p-2 space-y-2 overflow-y-auto scroll-thin"
            ghost-class="card-ghost"
            drag-class="card-drag"
            @change="(ev) => handleChange(stage.id, ev)">
            <template #item="{ element }">
              <div v-show="isVisible(stage.id, element.id)">
                <LeadCard :lead="element" @click="openLead(element)" />
              </div>
            </template>
          </draggable>
        </div>

        <div v-if="!stages.length" class="flex-1 flex items-center justify-center text-slate-500">
          Este funil ainda não tem etapas.
          <RouterLink to="/settings/funnels" class="ml-2 text-brand underline">Configurar</RouterLink>
        </div>
      </div>
    </div>

    <!-- View: Lista -->
    <ListView
      v-else-if="activeView === 'list'"
      @open-lead="openLead"
    />

    <LeadModal
      v-if="activeLead"
      :lead="activeLead"
      @close="closeLead"
      @updated="() => store.loadBoard()"
    />
  </div>
</template>
