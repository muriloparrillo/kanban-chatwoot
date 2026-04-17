<script setup>
import { computed, onMounted, ref } from 'vue';
import { LeadsAPI, TagsAPI, ProductsAPI } from '../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const props = defineProps({ lead: { type: Object, required: true } });
const emit = defineEmits(['close', 'updated']);

const detail      = ref(null);
const notes       = ref([]);
const history     = ref([]);
const attachments = ref([]);
const tags        = ref([]);
const allTags     = ref([]);
const allProducts = ref([]);
const newNote     = ref('');
const newTagId    = ref('');
const newTagName  = ref('');
const fileInput   = ref(null);
const activeTab   = ref('notes');
const saving      = ref(false);

const load = async () => {
  // Promise.allSettled garante que uma falha (ex: products ainda sem migration)
  // não impede o modal de abrir. Cada resultado é tratado individualmente.
  const [leadRes, tagsRes, productsRes] = await Promise.allSettled([
    LeadsAPI.get(props.lead.id),
    TagsAPI.list(),
    ProductsAPI.list()
  ]);

  if (leadRes.status !== 'fulfilled') {
    console.error('[CRM] LeadModal: falha ao carregar lead', leadRes.reason);
    return; // mantém detail=null → mostra loading com mensagem de erro
  }

  const data = leadRes.value.data;
  detail.value = data;
  notes.value = data.notes || [];
  history.value = data.histories || [];
  attachments.value = data.attachments || [];

  const tagsData = tagsRes.status === 'fulfilled' ? tagsRes.value.data : [];
  allTags.value = tagsData;
  tags.value = (data.tag_ids || []).length
    ? tagsData.filter(t => data.tag_ids.includes(t.id))
    : [];

  allProducts.value = productsRes.status === 'fulfilled' ? productsRes.value.data : [];
};

onMounted(load);

const save = async () => {
  saving.value = true;
  try {
    await LeadsAPI.update(props.lead.id, {
      title:         detail.value.title,
      description:   detail.value.description,
      value:         detail.value.value,
      priority:      detail.value.priority,
      due_at:        detail.value.due_at,
      product_id:    detail.value.product_id || null,
      contact_name:  detail.value.contact?.name,
      contact_email: detail.value.contact?.email,
      contact_phone: detail.value.contact?.phone,
    });
    emit('updated');
  } finally {
    saving.value = false;
  }
};

/* When a product is selected, pre-fill value if it has a default */
const onProductChange = () => {
  const pid = detail.value.product_id;
  if (!pid) return;
  const prod = allProducts.value.find(p => p.id === Number(pid));
  if (prod && prod.value != null && !detail.value.value) {
    detail.value.value = prod.value;
  }
};

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

const formatDate = (d) =>
  d ? format(new Date(d), "dd 'de' MMMM, HH:mm", { locale: ptBR }) : '';

const eventLabel = (ev) => ({
  created: 'Lead criado', moved: 'Movido de etapa',
  assigned: 'Responsável atribuído', updated: 'Lead atualizado',
  archived: 'Arquivado', note_added: 'Nota adicionada',
  attachment_added: 'Anexo adicionado', tag_added: 'Tag adicionada',
  tag_removed: 'Tag removida'
}[ev] || ev);

/* Abrir conversa no Chatwoot via postMessage (inject script escuta) */
const openConversation = () => {
  const id = detail.value?.conversation?.id;
  if (!id) return;
  window.parent.postMessage({ type: 'crm-open-conversation', conversationId: id }, '*');
};

const conversationId = computed(() => detail.value?.conversation?.id);

/* Garante que detail.contact existe antes de editar */
const ensureContact = () => {
  if (!detail.value.contact) detail.value.contact = {};
};
</script>

<template>
  <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="emit('close')">
    <div v-if="detail" class="bg-white rounded-xl w-[760px] max-h-[88vh] overflow-hidden flex flex-col shadow-2xl">

      <!-- Header -->
      <div class="flex items-start gap-3 px-5 py-4 border-b border-slate-200">
        <div class="flex-1 min-w-0">
          <input
            v-model="detail.title"
            class="text-lg font-semibold w-full focus:outline-none focus:ring-2 focus:ring-brand/30 rounded px-1 -mx-1"
            placeholder="Título do lead"
          />
          <div class="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
            <span>Criado em {{ formatDate(detail.created_at) }}</span>
            <button
              v-if="conversationId"
              @click="openConversation"
              class="inline-flex items-center gap-1 text-brand hover:underline font-medium"
              title="Abrir no Chatwoot">
              ↗ Conversa #{{ conversationId }}
            </button>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            @click="save"
            :disabled="saving"
            class="px-4 py-1.5 bg-brand text-white rounded-lg text-sm font-medium disabled:opacity-60">
            {{ saving ? 'Salvando…' : 'Salvar' }}
          </button>
          <button
            @click="archive"
            class="px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">
            Arquivar
          </button>
          <button @click="emit('close')" class="px-2 py-1 text-slate-400 hover:text-slate-700 text-lg leading-none">✕</button>
        </div>
      </div>

      <div class="flex flex-1 overflow-hidden">

        <!-- Painel esquerdo: campos -->
        <div class="w-64 border-r border-slate-200 p-4 space-y-4 text-sm overflow-y-auto flex-shrink-0">

          <!-- Valor -->
          <div>
            <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Valor da oportunidade</label>
            <div class="flex items-center gap-1">
              <span class="text-slate-400 text-xs">R$</span>
              <input
                v-model.number="detail.value"
                type="number"
                min="0"
                step="0.01"
                class="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                placeholder="0,00" />
            </div>
          </div>

          <!-- Prioridade -->
          <div>
            <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Prioridade</label>
            <select
              v-model.number="detail.priority"
              class="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
              <option :value="0">Sem prioridade</option>
              <option :value="1">Baixa</option>
              <option :value="2">Média</option>
              <option :value="3">Alta</option>
              <option :value="4">Urgente</option>
            </select>
          </div>

          <!-- Produto / Serviço -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Produto / Serviço</label>
              <RouterLink
                to="/settings/products"
                class="text-xs text-brand hover:underline"
                title="Gerenciar produtos">
                + Gerenciar
              </RouterLink>
            </div>
            <select
              v-model="detail.product_id"
              @change="onProductChange"
              class="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
              <option :value="null">— Sem produto —</option>
              <option
                v-for="p in allProducts"
                :key="p.id"
                :value="p.id">
                {{ p.name }}{{ p.value != null ? ' (' + p.currency + ' ' + Number(p.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ')' : '' }}
              </option>
            </select>
          </div>

          <!-- Observações internas -->
          <div>
            <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Observações</label>
            <textarea
              v-model="detail.description"
              rows="3"
              class="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
              placeholder="Notas rápidas sobre o lead…"></textarea>
          </div>

          <!-- Vencimento -->
          <div>
            <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Vencimento</label>
            <input
              v-model="detail.due_at"
              type="date"
              class="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
          </div>

          <!-- Dados do contato -->
          <div class="pt-2 border-t border-slate-100">
            <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Contato</label>
            <div class="space-y-2">
              <input
                :value="detail.contact?.name"
                @input="ensureContact(); detail.contact.name = $event.target.value"
                class="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                placeholder="Nome" />
              <input
                :value="detail.contact?.email"
                @input="ensureContact(); detail.contact.email = $event.target.value"
                type="email"
                class="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                placeholder="E-mail" />
              <input
                :value="detail.contact?.phone"
                @input="ensureContact(); detail.contact.phone = $event.target.value"
                type="tel"
                class="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                placeholder="Telefone" />
            </div>
          </div>

          <!-- Responsável -->
          <div>
            <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Responsável</label>
            <div class="text-slate-600 text-sm">{{ detail.assignee?.name || '—' }}</div>
          </div>
        </div>

        <!-- Painel direito: tabs -->
        <div class="flex-1 flex flex-col overflow-hidden">
          <div class="flex border-b border-slate-200 text-sm bg-slate-50">
            <button
              v-for="tab in [
                { id: 'notes',       label: 'Notas',    count: notes.length },
                { id: 'attachments', label: 'Anexos',   count: attachments.length },
                { id: 'tags',        label: 'Tags',     count: tags.length },
                { id: 'history',     label: 'Histórico', count: null },
              ]"
              :key="tab.id"
              :class="['px-4 py-2.5 border-b-2 transition-colors font-medium',
                activeTab === tab.id
                  ? 'border-brand text-brand bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700']"
              @click="activeTab = tab.id">
              {{ tab.label }}<span v-if="tab.count !== null" class="ml-1 text-xs opacity-70">({{ tab.count }})</span>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-4 scroll-thin">

            <!-- Notas -->
            <div v-if="activeTab === 'notes'">
              <div class="flex gap-2 mb-4">
                <textarea
                  v-model="newNote"
                  rows="2"
                  placeholder="Adicione uma nota…"
                  class="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/30"
                  @keydown.ctrl.enter="submitNote"></textarea>
                <button
                  @click="submitNote"
                  class="self-end px-3 py-2 bg-brand text-white rounded-lg text-sm font-medium">
                  Adicionar
                </button>
              </div>
              <div v-for="n in notes" :key="n.id"
                   class="p-3 rounded-lg border border-slate-200 mb-2 bg-slate-50">
                <div class="text-sm whitespace-pre-wrap text-slate-700">{{ n.body }}</div>
                <div class="flex justify-between items-center mt-2 text-xs text-slate-400">
                  <span>{{ n.author || 'Sistema' }} · {{ formatDate(n.created_at) }}</span>
                  <button @click="removeNote(n.id)" class="text-red-400 hover:text-red-600">Remover</button>
                </div>
              </div>
              <div v-if="!notes.length" class="text-center py-8 text-slate-400 text-sm">
                Nenhuma nota adicionada
              </div>
            </div>

            <!-- Anexos -->
            <div v-else-if="activeTab === 'attachments'">
              <label class="flex items-center gap-2 cursor-pointer mb-4 px-3 py-2.5 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-brand hover:text-brand transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Selecionar arquivo para upload
                <input ref="fileInput" type="file" class="hidden" @change="uploadFile" />
              </label>
              <div v-for="a in attachments" :key="a.id"
                   class="flex justify-between items-center p-2.5 border border-slate-200 rounded-lg mb-2">
                <a :href="a.url" target="_blank"
                   class="text-sm text-brand hover:underline flex items-center gap-1.5">
                  📎 {{ a.filename }}
                </a>
                <span class="text-xs text-slate-400">{{ formatDate(a.created_at) }}</span>
              </div>
              <div v-if="!attachments.length" class="text-center py-8 text-slate-400 text-sm">
                Nenhum anexo
              </div>
            </div>

            <!-- Tags -->
            <div v-else-if="activeTab === 'tags'">
              <div class="flex flex-wrap gap-2 mb-4 min-h-[36px]">
                <span
                  v-for="t in tags" :key="t.id"
                  class="flex items-center gap-1 text-sm px-3 py-1 rounded-full font-medium"
                  :style="{ background: t.color + '22', color: t.color, border: '1px solid ' + t.color + '55' }">
                  {{ t.name }}
                  <button @click="removeTag(t.id)" class="ml-0.5 opacity-60 hover:opacity-100 leading-none text-xs">✕</button>
                </span>
                <span v-if="!tags.length" class="text-slate-400 text-sm self-center">Nenhuma tag</span>
              </div>
              <div class="border-t border-slate-100 pt-3 space-y-3">
                <div>
                  <p class="text-xs text-slate-500 mb-1.5 font-medium">Tag existente:</p>
                  <div class="flex gap-2">
                    <select v-model="newTagId" class="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm">
                      <option value="">Selecionar…</option>
                      <option v-for="t in allTags.filter(t => !tags.some(lt => lt.id === t.id))"
                              :key="t.id" :value="t.id">{{ t.name }}</option>
                    </select>
                    <button @click="addTag" :disabled="!newTagId"
                            class="px-3 py-1.5 bg-brand text-white rounded-lg text-sm disabled:opacity-40">+</button>
                  </div>
                </div>
                <div>
                  <p class="text-xs text-slate-500 mb-1.5 font-medium">Nova tag:</p>
                  <div class="flex gap-2">
                    <input v-model="newTagName" placeholder="Nome da tag"
                           class="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                           @keydown.enter="addTag" />
                    <button @click="addTag" :disabled="!newTagName.trim()"
                            class="px-3 py-1.5 bg-brand text-white rounded-lg text-sm disabled:opacity-40">Criar</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Histórico -->
            <div v-else-if="activeTab === 'history'">
              <div v-for="h in history" :key="h.id"
                   class="text-sm mb-3 pl-3 border-l-2 border-slate-200">
                <div class="font-medium text-slate-700">{{ eventLabel(h.event) }}</div>
                <div class="text-xs text-slate-400 mt-0.5">{{ h.actor || 'Sistema' }} · {{ formatDate(h.created_at) }}</div>
              </div>
              <div v-if="!history.length" class="text-center py-8 text-slate-400 text-sm">
                Sem histórico
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-else class="bg-white rounded-xl w-[760px] p-8 text-center text-slate-400 flex flex-col items-center gap-3">
      <svg class="animate-spin w-6 h-6 text-brand/60" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>
      <span>Carregando…</span>
      <button @click="load" class="text-xs text-brand hover:underline mt-1">Tentar novamente</button>
    </div>
  </div>
</template>
