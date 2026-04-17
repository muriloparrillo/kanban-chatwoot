<script setup>
import { ref, computed, onMounted } from 'vue';
import { ScheduledMessagesAPI, AccountsAPI } from '../services/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
         isSameDay, isToday, addMonths, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const messages  = ref([]);
const loading   = ref(false);
const error     = ref('');
const viewMonth = ref(new Date());

/* ── carrega mensagens ── */
const load = async () => {
  loading.value = true;
  error.value   = '';
  try {
    const { data } = await ScheduledMessagesAPI.list();
    messages.value = data;
  } catch {
    error.value = 'Erro ao carregar agenda.';
  } finally {
    loading.value = false;
  }
};

onMounted(load);

/* ── calendário ── */
const monthLabel = computed(() =>
  format(viewMonth.value, 'MMMM yyyy', { locale: ptBR })
);

const calendarDays = computed(() => {
  const start = startOfMonth(viewMonth.value);
  const end   = endOfMonth(viewMonth.value);
  const days  = eachDayOfInterval({ start, end });
  // pad início da semana (domingo = 0)
  const pad = start.getDay();
  return Array(pad).fill(null).concat(days);
});

const msgsByDay = computed(() => {
  const map = {};
  messages.value.forEach(sm => {
    const d = format(parseISO(sm.scheduled_at), 'yyyy-MM-dd');
    if (!map[d]) map[d] = [];
    map[d].push(sm);
  });
  return map;
});

function msgsForDay(day) {
  if (!day) return [];
  return msgsByDay.value[format(day, 'yyyy-MM-dd')] || [];
}

/* ── templates WhatsApp ── */
const templates        = ref([]);
const templatesLoading = ref(false);
const selectedTemplate = ref('');

const loadTemplates = async () => {
  if (templates.value.length) return;
  templatesLoading.value = true;
  try {
    const { data } = await AccountsAPI.messageTemplates();
    templates.value = Array.isArray(data) ? data.filter(t =>
      !t.status || t.status === 'APPROVED' || t.status === 'approved'
    ) : [];
  } catch {
    templates.value = [];
  } finally {
    templatesLoading.value = false;
  }
};

const onTemplateSelect = () => {
  if (!selectedTemplate.value) return;
  const tpl = templates.value.find(t => String(t.id || t.name) === selectedTemplate.value);
  if (!tpl) return;
  let body = '';
  if (tpl.components && Array.isArray(tpl.components)) {
    const bc = tpl.components.find(c => c.type === 'BODY');
    body = bc?.text || '';
  }
  body = body || tpl.body || tpl.content || '';
  if (body) form.value.message = body;
};

/* ── form nova mensagem ── */
const showForm    = ref(false);
const saving      = ref(false);
const formErr     = ref('');
const form        = ref(emptyForm());

function emptyForm() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30 - (now.getMinutes() % 30));
  return {
    chatwoot_conversation_id: '',
    message:      '',
    scheduled_at: format(now, "yyyy-MM-dd'T'HH:mm")
  };
}

function openForm(day) {
  form.value = emptyForm();
  selectedTemplate.value = '';
  if (day) form.value.scheduled_at = format(day, "yyyy-MM-dd'T'HH:mm");
  showForm.value = true;
  formErr.value  = '';
  loadTemplates();
}

const submitForm = async () => {
  if (!form.value.message.trim()) { formErr.value = 'Mensagem obrigatória.'; return; }
  if (!form.value.scheduled_at)   { formErr.value = 'Data obrigatória.'; return; }
  saving.value = true;
  formErr.value = '';
  try {
    await ScheduledMessagesAPI.create({
      chatwoot_conversation_id: form.value.chatwoot_conversation_id
        ? Number(form.value.chatwoot_conversation_id) : null,
      message:      form.value.message.trim(),
      scheduled_at: form.value.scheduled_at
    });
    showForm.value = false;
    await load();
  } catch (e) {
    formErr.value = e?.response?.data?.errors?.join(', ') || 'Erro ao salvar.';
  } finally {
    saving.value = false;
  }
};

const cancelMsg = async (id) => {
  if (!confirm('Cancelar esta mensagem agendada?')) return;
  try {
    await ScheduledMessagesAPI.destroy(id);
    await load();
  } catch {
    error.value = 'Erro ao cancelar mensagem.';
  }
};

const statusLabel = (s) => ({
  pending:   'Pendente', sent: 'Enviada',
  failed:    'Falhou',  cancelled: 'Cancelada'
}[s] || s);

const statusClass = (s) => ({
  pending:   'bg-amber-100 text-amber-700',
  sent:      'bg-emerald-100 text-emerald-700',
  failed:    'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500'
}[s] || '');

const fmtDateTime = (d) =>
  d ? format(parseISO(d), "dd/MM HH:mm", { locale: ptBR }) : '—';
</script>

<template>
  <div class="h-full overflow-y-auto">
  <div class="max-w-5xl mx-auto p-6">

    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-semibold text-slate-800">Agenda</h1>
        <p class="text-sm text-slate-500 mt-0.5">Mensagens programadas para envio automático</p>
      </div>
      <button
        @click="openForm(null)"
        class="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
        + Agendar mensagem
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
      {{ error }}
    </div>

    <!-- Form -->
    <div v-if="showForm" class="mb-6 p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
      <h2 class="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">Nova mensagem agendada</h2>
      <div class="grid grid-cols-2 gap-4">
        <!-- Dropdown templates WhatsApp -->
        <div class="col-span-2">
          <label class="text-xs font-medium text-slate-500 block mb-1">Modelo aprovado (WhatsApp)</label>
          <select
            v-model="selectedTemplate"
            @change="onTemplateSelect"
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
            <option value="">
              {{ templatesLoading ? 'Carregando modelos…' : templates.length ? '— Selecionar modelo —' : 'Nenhum modelo aprovado encontrado' }}
            </option>
            <option v-for="t in templates" :key="t.id || t.name" :value="String(t.id || t.name)">
              {{ t.name || 'Template' }}
            </option>
          </select>
          <p v-if="!templatesLoading && templates.length" class="text-xs text-slate-400 mt-1">
            Selecione um modelo para preencher a mensagem automaticamente
          </p>
        </div>

        <div class="col-span-2">
          <label class="text-xs font-medium text-slate-500 block mb-1">Mensagem *</label>
          <textarea
            v-model="form.message"
            rows="3"
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
            placeholder="Digite a mensagem ou selecione um modelo acima…"></textarea>
        </div>
        <div>
          <label class="text-xs font-medium text-slate-500 block mb-1">Data e hora *</label>
          <input
            v-model="form.scheduled_at"
            type="datetime-local"
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
        </div>
        <div>
          <label class="text-xs font-medium text-slate-500 block mb-1">ID da conversa Chatwoot</label>
          <input
            v-model="form.chatwoot_conversation_id"
            type="number"
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            placeholder="Ex: 42" />
        </div>
      </div>
      <p v-if="formErr" class="text-red-600 text-xs mt-3">{{ formErr }}</p>
      <div class="flex gap-3 mt-4">
        <button
          @click="submitForm"
          :disabled="saving"
          class="px-5 py-2 bg-brand text-white rounded-lg text-sm font-medium disabled:opacity-60">
          {{ saving ? 'Salvando…' : 'Salvar' }}
        </button>
        <button @click="showForm = false"
          class="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
          Cancelar
        </button>
      </div>
    </div>

    <!-- Calendário -->
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
      <!-- Nav do mês -->
      <div class="flex items-center justify-between px-5 py-3 border-b border-slate-200">
        <button @click="viewMonth = subMonths(viewMonth, 1)"
          class="p-1.5 rounded-md hover:bg-slate-100 text-slate-500">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="text-sm font-semibold text-slate-700 capitalize">{{ monthLabel }}</span>
        <button @click="viewMonth = addMonths(viewMonth, 1)"
          class="p-1.5 rounded-md hover:bg-slate-100 text-slate-500">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <!-- Cabeçalho dias -->
      <div class="grid grid-cols-7 border-b border-slate-100">
        <div v-for="d in ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']" :key="d"
          class="px-2 py-2 text-center text-xs font-semibold text-slate-400 uppercase">
          {{ d }}
        </div>
      </div>

      <!-- Grid de dias -->
      <div class="grid grid-cols-7">
        <div
          v-for="(day, idx) in calendarDays"
          :key="idx"
          :class="[
            'min-h-[80px] p-1.5 border-b border-r border-slate-100 last:border-r-0',
            day && isToday(day) ? 'bg-brand/5' : '',
            !day ? 'bg-slate-50/50' : 'cursor-pointer hover:bg-slate-50'
          ]"
          @click="day && openForm(day)">
          <div v-if="day" class="flex items-center justify-between mb-1">
            <span :class="[
              'text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full',
              isToday(day) ? 'bg-brand text-white' : 'text-slate-500'
            ]">{{ day.getDate() }}</span>
            <span v-if="msgsForDay(day).length"
              class="text-xs bg-brand text-white rounded-full w-4 h-4 flex items-center justify-center">
              {{ msgsForDay(day).length }}
            </span>
          </div>
          <div v-for="sm in msgsForDay(day).slice(0, 2)" :key="sm.id"
            class="text-xs px-1.5 py-0.5 rounded mb-0.5 truncate"
            :class="statusClass(sm.status)"
            :title="sm.message"
            @click.stop>
            {{ sm.message.substring(0, 22) }}{{ sm.message.length > 22 ? '…' : '' }}
          </div>
          <div v-if="msgsForDay(day).length > 2" class="text-xs text-slate-400 px-1">
            +{{ msgsForDay(day).length - 2 }} mais
          </div>
        </div>
      </div>
    </div>

    <!-- Lista de mensagens pendentes -->
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div class="px-5 py-3 border-b border-slate-200 text-sm font-semibold text-slate-700">
        Todas as mensagens agendadas
      </div>
      <div v-if="loading" class="py-12 text-center text-slate-400 text-sm">Carregando…</div>
      <div v-else-if="!messages.length" class="py-12 text-center text-slate-400 text-sm">
        Nenhuma mensagem agendada
      </div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="bg-slate-50 border-b border-slate-200">
            <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Mensagem</th>
            <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Lead / Conversa</th>
            <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Agendado para</th>
            <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
            <th class="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="sm in messages"
            :key="sm.id"
            class="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
            <td class="px-4 py-3 max-w-xs">
              <div class="text-slate-700 truncate" :title="sm.message">{{ sm.message }}</div>
              <div v-if="sm.error_message" class="text-xs text-red-500 mt-0.5 truncate">{{ sm.error_message }}</div>
            </td>
            <td class="px-4 py-3 text-slate-500 text-xs">
              <div v-if="sm.lead_title">{{ sm.lead_title }}</div>
              <div v-if="sm.chatwoot_conversation_id">Conversa #{{ sm.chatwoot_conversation_id }}</div>
              <span v-if="!sm.lead_title && !sm.chatwoot_conversation_id">—</span>
            </td>
            <td class="px-4 py-3 text-slate-600 text-xs font-mono">
              {{ fmtDateTime(sm.scheduled_at) }}
            </td>
            <td class="px-4 py-3">
              <span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="statusClass(sm.status)">
                {{ statusLabel(sm.status) }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <button
                v-if="sm.status === 'pending'"
                @click="cancelMsg(sm.id)"
                class="text-xs px-2.5 py-1 border border-red-200 rounded-md text-red-600 hover:bg-red-50">
                Cancelar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
  </div>
</template>
