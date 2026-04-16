<script setup>
import { computed } from 'vue';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const props = defineProps({ lead: { type: Object, required: true } });

const priorityClass = computed(() => {
  const map = { 0: '', 1: 'bg-slate-400', 2: 'bg-yellow-400', 3: 'bg-orange-500', 4: 'bg-red-600' };
  return map[props.lead.priority] || '';
});
const priorityLabel = computed(() => ({0:'',1:'Baixa',2:'Média',3:'Alta',4:'Urgente'}[props.lead.priority] || ''));
const valueLabel = computed(() => {
  const v = Number(props.lead.value || 0);
  if (!v) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: props.lead.currency || 'BRL' }).format(v);
});
const lastActivity = computed(() => props.lead.last_activity_at ?
  formatDistanceToNow(new Date(props.lead.last_activity_at), { addSuffix: true, locale: ptBR }) : '');
</script>

<template>
  <div class="bg-white rounded-md border border-slate-200 px-3 py-2.5 shadow-sm hover:shadow-md cursor-pointer transition group">
    <div class="flex items-start justify-between gap-2">
      <div class="flex items-start gap-2 min-w-0">
        <span v-if="priorityClass" :class="['w-1.5 h-1.5 rounded-full mt-1.5', priorityClass]" :title="priorityLabel"></span>
        <h4 class="font-medium text-sm text-slate-800 truncate">{{ lead.title }}</h4>
      </div>
      <span v-if="valueLabel" class="text-xs font-semibold text-emerald-700 whitespace-nowrap">{{ valueLabel }}</span>
    </div>

    <div v-if="lead.contact_name" class="text-xs text-slate-600 mt-1 truncate">
      {{ lead.contact_name }}
      <span v-if="lead.contact_email" class="text-slate-400">· {{ lead.contact_email }}</span>
    </div>

    <div v-if="(lead.tags || []).length" class="flex flex-wrap gap-1 mt-2">
      <span v-for="t in lead.tags" :key="t.id"
            class="text-[10px] px-1.5 py-0.5 rounded"
            :style="{ background: t.color + '22', color: t.color }">
        {{ t.name }}
      </span>
    </div>

    <div class="flex items-center justify-between mt-2">
      <div class="flex items-center gap-1 text-[11px] text-slate-400">
        <span v-if="lead.chatwoot_conversation_id" title="Conversa vinculada">💬 #{{ lead.chatwoot_conversation_id }}</span>
        <span v-if="lastActivity">· {{ lastActivity }}</span>
      </div>
      <div v-if="lead.assignee?.avatar_url" class="flex items-center" :title="lead.assignee?.name">
        <img :src="lead.assignee.avatar_url" class="w-5 h-5 rounded-full" :alt="lead.assignee.name" />
      </div>
      <div v-else-if="lead.assignee?.name" class="w-5 h-5 rounded-full bg-slate-200 text-[10px] flex items-center justify-center text-slate-600" :title="lead.assignee?.name">
        {{ lead.assignee.name.charAt(0) }}
      </div>
    </div>
  </div>
</template>
