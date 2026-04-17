<script setup>
import { onMounted, ref } from 'vue';
import { FunnelsAPI, StagesAPI } from '../services/api';
import draggable from 'vuedraggable';

const funnels = ref([]);
const selected = ref(null);
const loading = ref(false);
const saveError = ref('');

const newFunnel = ref({ name: '', color: '#1f93ff', description: '' });
const newStage = ref({ name: '', color: '#64748b', stage_type: 'open' });

function handleErr(e, fallback = 'Erro ao salvar.') {
  const msg = e?.response?.data?.errors?.join(', ')
    || e?.response?.data?.error
    || e?.message
    || fallback;
  saveError.value = msg;
  console.error('[FunnelSettings]', msg, e);
}

const load = async () => {
  loading.value = true;
  saveError.value = '';
  try {
    const { data } = await FunnelsAPI.list();
    funnels.value = data;
    if (!selected.value && data.length) selected.value = data[0];
  } catch (e) { handleErr(e, 'Erro ao carregar funis.'); }
  finally { loading.value = false; }
};

onMounted(load);

const select = async (f) => {
  try {
    const { data } = await FunnelsAPI.get(f.id);
    selected.value = data;
  } catch (e) { handleErr(e); }
};

const createFunnel = async () => {
  if (!newFunnel.value.name) return;
  saveError.value = '';
  try {
    await FunnelsAPI.create(newFunnel.value);
    newFunnel.value = { name: '', color: '#1f93ff', description: '' };
    await load();
  } catch (e) { handleErr(e, 'Erro ao criar funil.'); }
};

const setDefault = async (f) => {
  try {
    await FunnelsAPI.update(f.id, { is_default: true });
    await load();
  } catch (e) { handleErr(e); }
};

const duplicateFunnel = async (f) => {
  try {
    await FunnelsAPI.duplicate(f.id);
    await load();
  } catch (e) { handleErr(e, 'Erro ao duplicar funil.'); }
};

const deleteFunnel = async (f) => {
  if (!confirm(`Excluir funil "${f.name}" e todos seus leads? Esta ação é irreversível.`)) return;
  try {
    await FunnelsAPI.destroy(f.id);
    selected.value = null;
    await load();
  } catch (e) { handleErr(e, 'Erro ao excluir funil.'); }
};

const updateFunnel = async () => {
  if (!selected.value) return;
  saveError.value = '';
  try {
    await FunnelsAPI.update(selected.value.id, {
      name: selected.value.name,
      description: selected.value.description,
      color: selected.value.color
    });
    await load();
  } catch (e) { handleErr(e, 'Erro ao salvar funil.'); }
};

const addStage = async () => {
  if (!newStage.value.name || !selected.value) return;
  saveError.value = '';
  try {
    await StagesAPI.create(selected.value.id, newStage.value);
    newStage.value = { name: '', color: '#64748b', stage_type: 'open' };
    await select(selected.value);
  } catch (e) { handleErr(e, 'Erro ao criar etapa.'); }
};

const updateStage = async (s) => {
  try {
    await StagesAPI.update(selected.value.id, s.id, {
      name: s.name, color: s.color, stage_type: s.stage_type, sla_hours: s.sla_hours
    });
  } catch (e) { handleErr(e, 'Erro ao atualizar etapa.'); }
};

const deleteStage = async (s) => {
  if (!confirm(`Excluir etapa "${s.name}"? Leads serão movidos para a primeira etapa restante.`)) return;
  try {
    await StagesAPI.destroy(selected.value.id, s.id);
    await select(selected.value);
  } catch (e) { handleErr(e, 'Erro ao excluir etapa.'); }
};

const persistStageOrder = async () => {
  try {
    const order = selected.value.stages.map(s => s.id);
    await FunnelsAPI.reorderStages(selected.value.id, order);
  } catch (e) { handleErr(e); }
};
</script>

<template>
  <div class="h-full grid grid-cols-12 gap-4 p-5 overflow-hidden">
    <!-- Erro global -->
    <div v-if="saveError" class="col-span-12 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
      <span>{{ saveError }}</span>
      <button @click="saveError = ''" class="text-red-400 hover:text-red-600 ml-3">✕</button>
    </div>

    <!-- Funnels list -->
    <div class="col-span-3 bg-white rounded-lg border border-slate-200 p-3 overflow-y-auto">
      <h2 class="font-semibold mb-2">Funis</h2>
      <ul class="space-y-1">
        <li v-for="f in funnels" :key="f.id"
            class="flex items-center justify-between px-2 py-1.5 rounded cursor-pointer"
            :class="selected?.id === f.id ? 'bg-brand/10 text-brand' : 'hover:bg-slate-50'"
            @click="select(f)">
          <span class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full" :style="{ background: f.color }"></span>
            {{ f.name }}
          </span>
          <span v-if="f.is_default" class="text-[10px] px-1.5 py-0.5 bg-slate-200 rounded">padrão</span>
        </li>
      </ul>
      <div class="border-t border-slate-200 mt-3 pt-3 space-y-2">
        <input v-model="newFunnel.name" placeholder="Nome do novo funil" class="w-full border px-2 py-1.5 rounded text-sm" />
        <input v-model="newFunnel.color" type="color" class="w-full h-8 rounded" />
        <button @click="createFunnel" class="w-full px-2 py-1.5 bg-brand text-white rounded text-sm">+ Criar funil</button>
      </div>
    </div>

    <!-- Selected funnel -->
    <div class="col-span-9 bg-white rounded-lg border border-slate-200 p-4 overflow-y-auto">
      <div v-if="!selected" class="text-slate-500">Selecione um funil para editar.</div>
      <div v-else>
        <div class="flex items-center justify-between gap-3 mb-4">
          <div class="flex items-center gap-2">
            <input v-model="selected.color" type="color" class="w-10 h-10 rounded" />
            <input v-model="selected.name" class="text-xl font-semibold border-b focus:outline-none focus:border-brand" />
          </div>
          <div class="flex gap-2">
            <button @click="updateFunnel" class="px-3 py-1.5 bg-brand text-white rounded text-sm">Salvar</button>
            <button v-if="!selected.is_default" @click="setDefault(selected)" class="px-3 py-1.5 border rounded text-sm">Tornar padrão</button>
            <button @click="duplicateFunnel(selected)" class="px-3 py-1.5 border rounded text-sm">Duplicar</button>
            <button @click="deleteFunnel(selected)" class="px-3 py-1.5 border border-red-300 text-red-600 rounded text-sm">Excluir</button>
          </div>
        </div>
        <textarea v-model="selected.description" placeholder="Descrição" class="w-full border rounded px-2 py-1.5 text-sm mb-4" rows="2"></textarea>

        <h3 class="font-semibold mb-2">Etapas</h3>
        <draggable v-model="selected.stages" item-key="id" handle=".drag-handle" @end="persistStageOrder">
          <template #item="{ element: s }">
            <div class="flex items-center gap-3 p-2 border border-slate-200 rounded mb-2 bg-slate-50">
              <span class="drag-handle cursor-move text-slate-400">⋮⋮</span>
              <input v-model="s.color" type="color" class="w-8 h-8 rounded" />
              <input v-model="s.name" class="flex-1 border px-2 py-1 rounded text-sm" @blur="updateStage(s)" />
              <select v-model="s.stage_type" class="border px-2 py-1 rounded text-sm" @change="updateStage(s)">
                <option value="open">Aberta</option>
                <option value="won">Ganho</option>
                <option value="lost">Perdido</option>
                <option value="custom">Personalizada</option>
              </select>
              <input v-model.number="s.sla_hours" type="number" placeholder="SLA (h)" class="w-20 border px-2 py-1 rounded text-sm" @blur="updateStage(s)" />
              <button @click="deleteStage(s)" class="text-red-500 text-sm hover:underline">Excluir</button>
            </div>
          </template>
        </draggable>

        <div class="flex items-center gap-2 mt-3">
          <input v-model="newStage.color" type="color" class="w-8 h-8 rounded" />
          <input v-model="newStage.name" placeholder="Nome da nova etapa" class="flex-1 border px-2 py-1.5 rounded text-sm" />
          <select v-model="newStage.stage_type" class="border px-2 py-1.5 rounded text-sm">
            <option value="open">Aberta</option>
            <option value="won">Ganho</option>
            <option value="lost">Perdido</option>
          </select>
          <button @click="addStage" class="px-3 py-1.5 bg-brand text-white rounded text-sm">+ Etapa</button>
        </div>
      </div>
    </div>
  </div>
</template>
