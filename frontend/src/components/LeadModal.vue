<script setup>
import { onMounted, ref } from 'vue';
import { LeadsAPI, TagsAPI } from '../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const props = defineProps({ lead: { type: Object, required: true } });
const emit = defineEmits(['close', 'updated']);

const detail     = ref(null);
const notes      = ref([]);
const history    = ref([]);
const attachments = ref([]);
const tags        = ref([]);       // tags attached to this lead
const allTags     = ref([]);       // all account tags (for picker)
const newNote    = ref('');
const newTagId   = ref('');
const newTagName = ref('');
const fileInput  = ref(null);
const activeTab  = ref('notes');

const load = async () => {
  const [{ data }, tagsRes] = await Promise.all([
    LeadsAPI.get(props.lead.id),
    TagsAPI.list()
  ]);
  detail.value = data;
  notes.value = data.notes || [];
  history.value = data.histories || [];
  attachments.value = data.attachments || [];
  tags.value = (data.tag_ids || []).length
    ? tagsRes.data.filter(t => data.tag_ids.includes(t.id))
    : [];
  allTags.value = tagsRes.data;
};

onMounted(load);

const submitNote = async () => {
  if (!newNote.value.trim()) return;
  await LeadsAPI.notes.create(props.lead.id, newNote.value);
  newNote.value = '';
  await load();
};

const removeNote = async (id) => {
  await LeadsAPI.notes.destroy(props.lead.id, id);
  await load();
};

const uploadFile = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  await LeadsAPI.attachments.upload(props.lead.id, f);
  fileInput.value.value = '';
  await load();
};

const archive = async () => {
  if (!confirm('Arquivar este lead?')) return;
  await LeadsAPI.archive(props.lead.id);
  emit('updated');
  emit('close');
};

const save = async () => {
  await LeadsAPI.update(props.lead.id, {
    title: detail.value.title,
    description: detail.value.description,
    value: detail.value.value,
    priority: detail.value.priority,
    due_at: detail.value.due_at
  });
  emit('updated');
};

const addTag = async () => {
  if (newTagId.value) {
    await LeadsAPI.tags.add(props.lead.id, { tag_id: Number(newTagId.value) });
    newTagId.value = '';
  } else if (newTagName.value.trim()) {
    await LeadsAPI.tags.add(props.lead.id, { name: newTagName.value.trim() });
    newTagName.value = '';
  }
  await load();
};

const removeTag = async (tagId) => {
  await LeadsAPI.tags.remove(props.lead.id, tagId);
  await load();
};

const formatDate = (d) => d ? format(new Date(d), "dd 'de' MMMM, HH:mm", { locale: ptBR }) : '';

// Human-readable event labels
const eventLabel = (ev) => ({
  created: 'Lead criado', moved: 'Movido de etapa', assigned: 'Responsável atribuído',
  updated: 'Lead atualizado', archived: 'Arquivado', note_added: 'Nota adicionada',
  attachment_added: 'Anexo adicionado', tag_added: 'Tag adicionada', tag_removed: 'Tag removida'
}[ev] || ev);
</script>

<template>
  <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="emit('close')">
    <div v-if="detail" class="bg-white rounded-lg w-[720px] max-h-[85vh] overflow-hidden flex flex-col shadow-xl">
      <div class="flex items-center justify-between px-5 py-3 border-b border-slate-200">
        <div class="flex-1">
          <input v-model="detail.title" class="text-lg font-semibold w-full focus:outline-none" />
          <div class="text-xs text-slate-500 mt-1">
            Criado em {{ formatDate(detail.created_at) }}
            <span v-if="detail.conversation?.id"> · Conversa Chatwoot #{{ detail.conversation.id }}</span>
          </div>
        </div>
        <div class="flex gap-2">
          <button @click="save" class="px-3 py-1.5 bg-brand text-white rounded text-sm">Salvar</button>
          <button @click="archive" class="px-3 py-1.5 text-sm border border-slate-300 rounded text-slate-600 hover:bg-slate-50">Arquivar</button>
          <button @click="emit('close')" class="px-2 text-slate-500 hover:text-slate-800">✕</button>
        </div>
      </div>

      <div class="flex flex-1 overflow-hidden">
        <!-- left: details -->
        <div class="w-64 border-r border-slate-200 p-4 space-y-3 text-sm overflow-y-auto">
          <div>
            <label class="text-xs text-slate-500">Valor (R$)</label>
            <input v-model.number="detail.value" type="number" class="w-full border rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label class="text-xs text-slate-500">Prioridade</label>
            <select v-model.number="detail.priority" class="w-full border rounded px-2 py-1 text-sm">
              <option :value="0">Sem</option>
              <option :value="1">Baixa</option>
              <option :value="2">Média</option>
              <option :value="3">Alta</option>
              <option :value="4">Urgente</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-slate-500">Contato</label>
            <div class="text-slate-700">{{ detail.contact?.name || '—' }}</div>
            <div class="text-slate-500 text-xs">{{ detail.contact?.email }}</div>
            <div class="text-slate-500 text-xs">{{ detail.contact?.phone }}</div>
          </div>
          <div>
            <label class="text-xs text-slate-500">Responsável</label>
            <div class="text-slate-700">{{ detail.assignee?.name || '—' }}</div>
          </div>
          <div>
            <label class="text-xs text-slate-500">Descrição</label>
            <textarea v-model="detail.description" rows="4" class="w-full border rounded px-2 py-1 text-sm"></textarea>
          </div>
        </div>

        <!-- right: tabs -->
        <div class="flex-1 flex flex-col overflow-hidden">
          <div class="flex border-b border-slate-200 text-sm">
            <button :class="['px-4 py-2', activeTab==='notes' ? 'border-b-2 border-brand text-brand' : 'text-slate-600']" @click="activeTab='notes'">Notas ({{ notes.length }})</button>
            <button :class="['px-4 py-2', activeTab==='attachments' ? 'border-b-2 border-brand text-brand' : 'text-slate-600']" @click="activeTab='attachments'">Anexos ({{ attachments.length }})</button>
            <button :class="['px-4 py-2', activeTab==='tags' ? 'border-b-2 border-brand text-brand' : 'text-slate-600']" @click="activeTab='tags'">Tags ({{ tags.length }})</button>
            <button :class="['px-4 py-2', activeTab==='history' ? 'border-b-2 border-brand text-brand' : 'text-slate-600']" @click="activeTab='history'">Histórico</button>
          </div>

          <div class="flex-1 overflow-y-auto p-4 scroll-thin">
            <!-- notes -->
            <div v-if="activeTab==='notes'">
              <div class="flex gap-2 mb-3">
                <input v-model="newNote" placeholder="Adicione uma nota…" class="flex-1 border px-3 py-2 rounded text-sm" @keydown.enter="submitNote" />
                <button @click="submitNote" class="px-3 py-1.5 bg-brand text-white rounded text-sm">Adicionar</button>
              </div>
              <div v-for="n in notes" :key="n.id" class="p-3 rounded border border-slate-200 mb-2 bg-slate-50">
                <div class="text-sm whitespace-pre-wrap">{{ n.body }}</div>
                <div class="flex justify-between items-center mt-2 text-xs text-slate-500">
                  <span>{{ n.author || 'Sistema' }} · {{ formatDate(n.created_at) }}</span>
                  <button @click="removeNote(n.id)" class="text-red-500 hover:underline">Remover</button>
                </div>
              </div>
            </div>
            <!-- attachments -->
            <div v-else-if="activeTab==='attachments'">
              <input ref="fileInput" type="file" @change="uploadFile" class="text-sm mb-3" />
              <div v-for="a in attachments" :key="a.id" class="flex justify-between items-center p-2 border rounded mb-1">
                <a :href="a.url" target="_blank" class="text-sm text-brand underline">{{ a.filename }}</a>
                <span class="text-xs text-slate-500">{{ formatDate(a.created_at) }}</span>
              </div>
              <div v-if="!attachments.length" class="text-sm text-slate-500">Nenhum anexo.</div>
            </div>
            <!-- tags -->
            <div v-else-if="activeTab==='tags'">
              <div class="flex flex-wrap gap-2 mb-4">
                <span v-for="t in tags" :key="t.id"
                      class="flex items-center gap-1 text-sm px-2 py-1 rounded-full"
                      :style="{ background: t.color + '22', color: t.color, border: '1px solid ' + t.color + '55' }">
                  {{ t.name }}
                  <button @click="removeTag(t.id)" class="ml-1 opacity-60 hover:opacity-100 leading-none">✕</button>
                </span>
                <span v-if="!tags.length" class="text-slate-500 text-sm">Nenhuma tag.</span>
              </div>
              <div class="border-t border-slate-200 pt-3">
                <p class="text-xs text-slate-500 mb-2">Adicionar tag existente:</p>
                <div class="flex gap-2">
                  <select v-model="newTagId" class="flex-1 border rounded px-2 py-1.5 text-sm">
                    <option value="">Selecionar tag…</option>
                    <option v-for="t in allTags.filter(t => !tags.some(lt => lt.id === t.id))" :key="t.id" :value="t.id">{{ t.name }}</option>
                  </select>
                  <button @click="addTag" :disabled="!newTagId" class="px-3 py-1.5 bg-brand text-white rounded text-sm disabled:opacity-40">+</button>
                </div>
                <p class="text-xs text-slate-500 mt-3 mb-2">Ou criar nova tag:</p>
                <div class="flex gap-2">
                  <input v-model="newTagName" placeholder="Nome da tag" class="flex-1 border rounded px-2 py-1.5 text-sm" @keydown.enter="addTag" />
                  <button @click="addTag" :disabled="!newTagName.trim()" class="px-3 py-1.5 bg-brand text-white rounded text-sm disabled:opacity-40">Criar</button>
                </div>
              </div>
            </div>
            <!-- history -->
            <div v-else-if="activeTab==='history'">
              <div v-for="h in history" :key="h.id" class="text-sm mb-2 pl-3 border-l-2 border-slate-200">
                <div class="font-medium text-slate-700">{{ eventLabel(h.event) }}</div>
                <div class="text-xs text-slate-500">{{ h.actor || 'Sistema' }} · {{ formatDate(h.created_at) }}</div>
              </div>
              <div v-if="!history.length" class="text-slate-500 text-sm">Sem histórico.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
