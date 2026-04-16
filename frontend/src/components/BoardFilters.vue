<script setup>
import { onMounted, ref } from 'vue';
import { AgentsAPI, TagsAPI } from '../services/api';
import { useBoardStore } from '../store/board';

const store = useBoardStore();
const agents = ref([]);
const tags = ref([]);

onMounted(async () => {
  try { agents.value = (await AgentsAPI.list()).data; } catch { agents.value = []; }
  try { tags.value = (await TagsAPI.list()).data; } catch { tags.value = []; }
});

const priorities = [
  { v: null, label: 'Prioridade' },
  { v: 1, label: 'Baixa' },
  { v: 2, label: 'Média' },
  { v: 3, label: 'Alta' },
  { v: 4, label: 'Urgente' }
];
</script>

<template>
  <div class="flex items-center gap-2">
    <input type="search" placeholder="Buscar leads…"
           class="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white w-48"
           :value="store.filter.q"
           @input="store.setFilter({ q: $event.target.value })" />
    <select class="border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white"
            :value="store.filter.assigneeId ?? ''"
            @change="store.setFilter({ assigneeId: $event.target.value || null })">
      <option value="">Responsável</option>
      <option v-for="a in agents" :key="a.id" :value="a.id">{{ a.name }}</option>
    </select>
    <select class="border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white"
            :value="store.filter.tagId ?? ''"
            @change="store.setFilter({ tagId: $event.target.value || null })">
      <option value="">Tag</option>
      <option v-for="t in tags" :key="t.id" :value="t.id">{{ t.name }}</option>
    </select>
    <select class="border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white"
            :value="store.filter.priority ?? ''"
            @change="store.setFilter({ priority: $event.target.value === '' ? null : Number($event.target.value) })">
      <option v-for="p in priorities" :key="p.label" :value="p.v ?? ''">{{ p.label }}</option>
    </select>
  </div>
</template>
