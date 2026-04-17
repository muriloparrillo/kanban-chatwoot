<script setup>
import { ref, computed, onMounted } from 'vue';
import { TasksAPI } from '../services/api';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const tasks   = ref([]);
const loading = ref(false);
const error   = ref('');
const filterStatus = ref('pending');

const emptyForm = () => ({
  title: '', description: '', priority: 'medium',
  due_at: '', lead_id: ''
});
const showForm = ref(false);
const saving   = ref(false);
const formErr  = ref('');
const form     = ref(emptyForm());
const editingId = ref(null);

const load = async () => {
  loading.value = true;
  error.value   = '';
  try {
    const params = filterStatus.value !== 'all' ? { status: filterStatus.value } : {};
    const { data } = await TasksAPI.list(params);
    tasks.value = data;
  } catch { error.value = 'Erro ao carregar tarefas.'; }
  finally { loading.value = false; }
};

onMounted(load);

const openNew = () => {
  form.value  = emptyForm();
  editingId.value = null;
  showForm.value  = true;
  formErr.value   = '';
};

const openEdit = (t) => {
  form.value = {
    title:       t.title,
    description: t.description || '',
    priority:    t.priority,
    due_at:      t.due_at ? format(parseISO(t.due_at), "yyyy-MM-dd'T'HH:mm") : '',
    lead_id:     t.lead_id || ''
  };
  editingId.value = t.id;
  showForm.value  = true;
  formErr.value   = '';
};

const submit = async () => {
  if (!form.value.title.trim()) { formErr.value = 'Título obrigatório.'; return; }
  saving.value = true;
  formErr.value = '';
  try {
    const payload = {
      title:       form.value.title.trim(),
      description: form.value.description || '',
      priority:    form.value.priority,
      due_at:      form.value.due_at || null,
      lead_id:     form.value.lead_id ? Number(form.value.lead_id) : null
    };
    if (editingId.value) {
      await TasksAPI.update(editingId.value, payload);
    } else {
      await TasksAPI.create(payload);
    }
    showForm.value = false;
    await load();
  } catch (e) {
    formErr.value = e?.response?.data?.errors?.join(', ') || 'Erro ao salvar.';
  } finally { saving.value = false; }
};

const markDone = async (t) => {
  try {
    await TasksAPI.update(t.id, { status: 'done' });
    await load();
  } catch { error.value = 'Erro ao concluir tarefa.'; }
};

const reopen = async (t) => {
  try {
    await TasksAPI.update(t.id, { status: 'pending' });
    await load();
  } catch { error.value = 'Erro ao reabrir tarefa.'; }
};

const destroy = async (t) => {
  if (!confirm(`Excluir "${t.title}"?`)) return;
  try {
    await TasksAPI.destroy(t.id);
    await load();
  } catch { error.value = 'Erro ao excluir tarefa.'; }
};

const priorityClass = (p) => ({
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-slate-100 text-slate-500'
}[p] || '');

const priorityLabel = (p) => ({ high: 'Alta', medium: 'Média', low: 'Baixa' }[p] || p);

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = parseISO(d);
  if (isToday(dt)) return 'Hoje ' + format(dt, 'HH:mm');
  return format(dt, "dd/MM/yy HH:mm", { locale: ptBR });
};

const stats = computed(() => ({
  pending:  tasks.value.filter(t => t.status === 'pending').length,
  overdue:  tasks.value.filter(t => t.overdue).length,
  done:     tasks.value.filter(t => t.status === 'done').length
}));
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="max-w-4xl mx-auto p-6">

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-semibold text-slate-800">Tarefas</h1>
          <p class="text-sm text-slate-500 mt-0.5">Pendências e atividades com seus leads</p>
        </div>
        <button @click="openNew"
          class="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          + Nova tarefa
        </button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div class="text-2xl font-bold text-slate-700">{{ stats.pending }}</div>
          <div class="text-xs text-slate-500 mt-0.5">Pendentes</div>
        </div>
        <div class="bg-white border border-red-200 rounded-xl p-4 text-center">
          <div class="text-2xl font-bold text-red-600">{{ stats.overdue }}</div>
          <div class="text-xs text-slate-500 mt-0.5">Atrasadas</div>
        </div>
        <div class="bg-white border border-emerald-200 rounded-xl p-4 text-center">
          <div class="text-2xl font-bold text-emerald-600">{{ stats.done }}</div>
          <div class="text-xs text-slate-500 mt-0.5">Concluídas</div>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        {{ error }}
      </div>

      <!-- Form -->
      <div v-if="showForm" class="mb-6 p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
        <h2 class="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">
          {{ editingId ? 'Editar tarefa' : 'Nova tarefa' }}
        </h2>
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2">
            <label class="text-xs font-medium text-slate-500 block mb-1">Título *</label>
            <input v-model="form.title" placeholder="Descreva a tarefa…"
              class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
          </div>
          <div class="col-span-2">
            <label class="text-xs font-medium text-slate-500 block mb-1">Descrição</label>
            <textarea v-model="form.description" rows="2" placeholder="Detalhes opcionais…"
              class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"></textarea>
          </div>
          <div>
            <label class="text-xs font-medium text-slate-500 block mb-1">Prioridade</label>
            <select v-model="form.priority"
              class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
              <option value="high">Alta</option>
              <option value="medium">Média</option>
              <option value="low">Baixa</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-medium text-slate-500 block mb-1">Prazo</label>
            <input v-model="form.due_at" type="datetime-local"
              class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
          </div>
          <div>
            <label class="text-xs font-medium text-slate-500 block mb-1">ID do Lead (opcional)</label>
            <input v-model="form.lead_id" type="number" placeholder="Ex: 42"
              class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
          </div>
        </div>
        <p v-if="formErr" class="text-red-600 text-xs mt-3">{{ formErr }}</p>
        <div class="flex gap-3 mt-4">
          <button @click="submit" :disabled="saving"
            class="px-5 py-2 bg-brand text-white rounded-lg text-sm font-medium disabled:opacity-60">
            {{ saving ? 'Salvando…' : 'Salvar' }}
          </button>
          <button @click="showForm = false"
            class="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
        </div>
      </div>

      <!-- Filter -->
      <div class="flex items-center gap-2 mb-4">
        <span class="text-xs font-medium text-slate-500">Filtrar:</span>
        <button v-for="s in [['pending','Pendentes'],['done','Concluídas'],['all','Todas']]" :key="s[0]"
          @click="filterStatus = s[0]; load()"
          :class="[
            'px-3 py-1 rounded-md text-xs font-medium transition-colors',
            filterStatus === s[0] ? 'bg-brand text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          ]">
          {{ s[1] }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="py-12 text-center text-slate-400 text-sm">Carregando…</div>

      <!-- Empty -->
      <div v-else-if="!tasks.length" class="py-16 text-center text-slate-400">
        <div class="text-4xl mb-3">✅</div>
        <div class="font-medium text-slate-600 mb-1">Nenhuma tarefa encontrada</div>
        <div class="text-sm">Clique em "+ Nova tarefa" para criar</div>
      </div>

      <!-- Lista -->
      <div v-else class="space-y-2">
        <div v-for="t in tasks" :key="t.id"
          :class="[
            'bg-white border rounded-xl px-4 py-3 flex items-start gap-3 transition-colors',
            t.overdue && t.status === 'pending' ? 'border-red-300 bg-red-50/30' : 'border-slate-200'
          ]">

          <!-- Checkbox -->
          <button @click="t.status === 'done' ? reopen(t) : markDone(t)"
            :class="[
              'mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors',
              t.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-brand'
            ]">
            <svg v-if="t.status === 'done'" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>

          <!-- Conteúdo -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <span :class="['text-sm font-medium', t.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800']">
                {{ t.title }}
              </span>
              <div class="flex items-center gap-1.5 flex-shrink-0">
                <span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="priorityClass(t.priority)">
                  {{ priorityLabel(t.priority) }}
                </span>
              </div>
            </div>
            <p v-if="t.description" class="text-xs text-slate-500 mt-0.5 truncate">{{ t.description }}</p>
            <div class="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
              <span v-if="t.due_at" :class="t.overdue && t.status === 'pending' ? 'text-red-600 font-medium' : ''">
                📅 {{ fmtDate(t.due_at) }}{{ t.overdue && t.status === 'pending' ? ' · Atrasada' : '' }}
              </span>
              <span v-if="t.lead_title">🔗 {{ t.lead_title }}</span>
            </div>
          </div>

          <!-- Ações -->
          <div class="flex items-center gap-1 flex-shrink-0">
            <button @click="openEdit(t)"
              class="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button @click="destroy(t)"
              class="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
