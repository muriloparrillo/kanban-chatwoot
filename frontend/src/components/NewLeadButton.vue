<script setup>
import { ref } from 'vue';
import { LeadsAPI } from '../services/api';

const props = defineProps({ funnelId: [Number, String], stages: Array });
const emit = defineEmits(['created']);

const open = ref(false);
const form = ref({ title: '', contact_name: '', contact_email: '', contact_phone: '', value: 0, stage_id: null, priority: 0 });

const submit = async () => {
  const payload = { ...form.value, funnel_id: props.funnelId, source: 'manual' };
  if (!payload.stage_id && props.stages?.length) payload.stage_id = props.stages[0].id;
  await LeadsAPI.create(payload);
  open.value = false;
  form.value = { title: '', contact_name: '', contact_email: '', contact_phone: '', value: 0, stage_id: null, priority: 0 };
  emit('created');
};
</script>

<template>
  <div>
    <button class="px-3 py-1.5 bg-brand text-white rounded-md text-sm hover:bg-brand-dark" @click="open = true">
      + Novo lead
    </button>
    <div v-if="open" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="open=false">
      <div class="bg-white rounded-lg p-5 w-[480px] shadow-xl">
        <h3 class="font-semibold text-lg mb-3">Novo lead</h3>
        <div class="space-y-2">
          <input v-model="form.title" placeholder="Título do lead" class="w-full border px-3 py-2 rounded text-sm" />
          <input v-model="form.contact_name" placeholder="Contato" class="w-full border px-3 py-2 rounded text-sm" />
          <input v-model="form.contact_email" placeholder="E-mail" class="w-full border px-3 py-2 rounded text-sm" />
          <input v-model="form.contact_phone" placeholder="Telefone" class="w-full border px-3 py-2 rounded text-sm" />
          <input v-model.number="form.value" type="number" placeholder="Valor (R$)" class="w-full border px-3 py-2 rounded text-sm" />
          <select v-model.number="form.stage_id" class="w-full border px-3 py-2 rounded text-sm">
            <option :value="null">Etapa inicial</option>
            <option v-for="s in stages" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
          <select v-model.number="form.priority" class="w-full border px-3 py-2 rounded text-sm">
            <option :value="0">Sem prioridade</option>
            <option :value="1">Baixa</option>
            <option :value="2">Média</option>
            <option :value="3">Alta</option>
            <option :value="4">Urgente</option>
          </select>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button @click="open=false" class="px-3 py-1.5 text-sm rounded-md hover:bg-slate-100">Cancelar</button>
          <button @click="submit" :disabled="!form.title" class="px-3 py-1.5 bg-brand text-white text-sm rounded-md disabled:opacity-50">Criar</button>
        </div>
      </div>
    </div>
  </div>
</template>
