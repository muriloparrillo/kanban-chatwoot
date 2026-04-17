<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useBoardStore } from '../store/board';

const store = useBoardStore();
const { stages, filteredLeadsByStage } = storeToRefs(store);

const emit = defineEmits(['open-lead']);

const allLeads = computed(() => {
  const leads = [];
  stages.value.forEach(stage => {
    (filteredLeadsByStage.value[stage.id] || []).forEach(lead => {
      leads.push({ ...lead, stage });
    });
  });
  return leads;
});

function formatDate(val) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('pt-BR');
}

function formatValue(val, currency) {
  if (val == null) return '—';
  return (currency || 'BRL') + ' ' + Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

const PRIORITY_MAP = {
  high:   { label: 'Alta',  cls: 'bg-red-100 text-red-700' },
  medium: { label: 'Média', cls: 'bg-yellow-100 text-yellow-700' },
  low:    { label: 'Baixa', cls: 'bg-slate-100 text-slate-600' }
};
</script>

<template>
  <div class="flex-1 overflow-auto">
    <table class="w-full text-sm border-collapse">
      <thead class="sticky top-0 z-10">
        <tr class="bg-slate-50 border-b border-slate-200">
          <th class="px-4 py-2.5 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide">Título</th>
          <th class="px-4 py-2.5 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide">Contato</th>
          <th class="px-4 py-2.5 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide">Etapa</th>
          <th class="px-4 py-2.5 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide">Responsável</th>
          <th class="px-4 py-2.5 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide">Valor</th>
          <th class="px-4 py-2.5 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide">Prioridade</th>
          <th class="px-4 py-2.5 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide">Criado</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="lead in allLeads"
          :key="lead.id"
          class="border-b border-slate-100 hover:bg-blue-50/40 cursor-pointer transition-colors"
          @click="emit('open-lead', lead)">

          <!-- Título -->
          <td class="px-4 py-3">
            <span class="font-medium text-slate-800 truncate max-w-xs block">{{ lead.title }}</span>
          </td>

          <!-- Contato -->
          <td class="px-4 py-3 text-slate-600">
            <div>{{ lead.contact?.name || '—' }}</div>
            <div v-if="lead.contact?.phone" class="text-xs text-slate-400">{{ lead.contact.phone }}</div>
          </td>

          <!-- Etapa -->
          <td class="px-4 py-3">
            <span class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
              <span class="w-2 h-2 rounded-full flex-shrink-0"
                    :style="{ background: lead.stage?.color || '#94a3b8' }"></span>
              {{ lead.stage?.name || '—' }}
            </span>
          </td>

          <!-- Responsável -->
          <td class="px-4 py-3 text-slate-600 text-xs">
            <span v-if="lead.assignee">{{ lead.assignee.name }}</span>
            <span v-else class="text-slate-400">—</span>
          </td>

          <!-- Valor -->
          <td class="px-4 py-3 text-slate-700 font-mono text-xs">
            {{ lead.value ? formatValue(lead.value, lead.currency) : '—' }}
          </td>

          <!-- Prioridade -->
          <td class="px-4 py-3">
            <span v-if="lead.priority && PRIORITY_MAP[lead.priority]"
                  class="text-xs px-2 py-0.5 rounded-full font-medium"
                  :class="PRIORITY_MAP[lead.priority].cls">
              {{ PRIORITY_MAP[lead.priority].label }}
            </span>
            <span v-else class="text-slate-400 text-xs">—</span>
          </td>

          <!-- Criado em -->
          <td class="px-4 py-3 text-slate-500 text-xs">{{ formatDate(lead.created_at) }}</td>
        </tr>

        <tr v-if="!allLeads.length">
          <td colspan="7" class="px-4 py-12 text-center text-slate-400">
            <div class="text-3xl mb-2">📋</div>
            <div>Nenhum lead encontrado</div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
