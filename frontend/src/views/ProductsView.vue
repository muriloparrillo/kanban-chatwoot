<script setup>
import { ref, onMounted } from 'vue';
import { ProductsAPI } from '../services/api';

const products = ref([]);
const loading  = ref(false);
const saving   = ref(false);
const error    = ref('');

/* Form state — null = creating new, object = editing existing */
const form = ref(null);

const emptyForm = () => ({
  id:          null,
  name:        '',
  description: '',
  value:       '',
  currency:    'BRL',
  active:      true
});

const load = async () => {
  loading.value = true;
  try {
    const { data } = await ProductsAPI.list(true); // all=true → retorna inativos também
    products.value = data;
  } catch (e) {
    error.value = 'Erro ao carregar produtos.';
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const startNew = () => {
  form.value = emptyForm();
  error.value = '';
};

const startEdit = (p) => {
  form.value = { ...p };
  error.value = '';
};

const cancelForm = () => {
  form.value = null;
  error.value = '';
};

const submit = async () => {
  if (!form.value.name.trim()) { error.value = 'Nome obrigatório.'; return; }
  saving.value = true;
  error.value  = '';
  try {
    const payload = {
      name:        form.value.name.trim(),
      description: form.value.description || '',
      value:       form.value.value !== '' ? Number(form.value.value) : null,
      currency:    form.value.currency || 'BRL',
      active:      form.value.active
    };
    if (form.value.id) {
      await ProductsAPI.update(form.value.id, payload);
    } else {
      await ProductsAPI.create(payload);
    }
    form.value = null;
    await load();
  } catch (e) {
    error.value = e?.response?.data?.errors?.join(', ') || 'Erro ao salvar.';
  } finally {
    saving.value = false;
  }
};

const toggleActive = async (p) => {
  try {
    await ProductsAPI.update(p.id, { active: !p.active });
    await load();
  } catch {
    error.value = 'Erro ao atualizar produto.';
  }
};

const destroy = async (p) => {
  if (!confirm(`Excluir "${p.name}"? Esta ação não pode ser desfeita.`)) return;
  try {
    await ProductsAPI.destroy(p.id);
    await load();
  } catch {
    error.value = 'Erro ao excluir produto.';
  }
};

function fmtValue(val, currency) {
  if (val == null || val === '') return '—';
  return (currency || 'BRL') + ' ' + Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-6">

    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-semibold text-slate-800">Produtos / Serviços</h1>
        <p class="text-sm text-slate-500 mt-0.5">Catálogo de produtos e serviços para associar aos leads</p>
      </div>
      <button
        @click="startNew"
        class="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
        + Novo produto
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
      {{ error }}
    </div>

    <!-- Form modal -->
    <div v-if="form" class="mb-6 p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
      <h2 class="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">
        {{ form.id ? 'Editar produto' : 'Novo produto' }}
      </h2>
      <div class="grid grid-cols-2 gap-4">
        <!-- Nome -->
        <div class="col-span-2">
          <label class="text-xs font-medium text-slate-500 block mb-1">Nome *</label>
          <input
            v-model="form.name"
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            placeholder="Nome do produto ou serviço"
            @keydown.enter="submit" />
        </div>
        <!-- Descrição -->
        <div class="col-span-2">
          <label class="text-xs font-medium text-slate-500 block mb-1">Descrição</label>
          <textarea
            v-model="form.description"
            rows="2"
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
            placeholder="Descrição opcional"></textarea>
        </div>
        <!-- Valor -->
        <div>
          <label class="text-xs font-medium text-slate-500 block mb-1">Valor padrão</label>
          <input
            v-model.number="form.value"
            type="number"
            min="0"
            step="0.01"
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            placeholder="0,00" />
        </div>
        <!-- Moeda -->
        <div>
          <label class="text-xs font-medium text-slate-500 block mb-1">Moeda</label>
          <select
            v-model="form.currency"
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
            <option value="BRL">BRL — Real</option>
            <option value="USD">USD — Dólar</option>
            <option value="EUR">EUR — Euro</option>
          </select>
        </div>
        <!-- Ativo -->
        <div class="col-span-2 flex items-center gap-2">
          <input id="form-active" v-model="form.active" type="checkbox" class="rounded" />
          <label for="form-active" class="text-sm text-slate-600">Produto ativo (aparece na lista de seleção)</label>
        </div>
      </div>

      <div class="flex gap-3 mt-5">
        <button
          @click="submit"
          :disabled="saving"
          class="px-5 py-2 bg-brand text-white rounded-lg text-sm font-medium disabled:opacity-60">
          {{ saving ? 'Salvando…' : 'Salvar' }}
        </button>
        <button @click="cancelForm" class="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
          Cancelar
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="py-12 text-center text-slate-400 text-sm">Carregando…</div>

    <!-- List -->
    <div v-else-if="products.length" class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-slate-50 border-b border-slate-200">
            <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</th>
            <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor</th>
            <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
            <th class="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="p in products"
            :key="p.id"
            class="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
            <td class="px-4 py-3">
              <div class="font-medium text-slate-800">{{ p.name }}</div>
              <div v-if="p.description" class="text-xs text-slate-400 truncate max-w-xs mt-0.5">{{ p.description }}</div>
            </td>
            <td class="px-4 py-3 text-slate-600 font-mono text-xs">{{ fmtValue(p.value, p.currency) }}</td>
            <td class="px-4 py-3">
              <span
                :class="[
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  p.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                ]">
                {{ p.active ? 'Ativo' : 'Inativo' }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-2">
                <button
                  @click="startEdit(p)"
                  class="text-xs px-2.5 py-1 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">
                  Editar
                </button>
                <button
                  @click="toggleActive(p)"
                  class="text-xs px-2.5 py-1 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">
                  {{ p.active ? 'Desativar' : 'Ativar' }}
                </button>
                <button
                  @click="destroy(p)"
                  class="text-xs px-2.5 py-1 border border-red-200 rounded-md text-red-600 hover:bg-red-50">
                  Excluir
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty state -->
    <div v-else class="py-16 text-center text-slate-400">
      <div class="text-4xl mb-3">📦</div>
      <div class="font-medium text-slate-600 mb-1">Nenhum produto cadastrado</div>
      <div class="text-sm">Clique em "Novo produto" para começar</div>
    </div>

  </div>
</template>
