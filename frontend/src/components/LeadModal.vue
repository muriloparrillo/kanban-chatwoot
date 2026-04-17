<script setup>
import { computed, onMounted, ref } from 'vue';
import { LeadsAPI, TagsAPI, ProductsAPI, AccountsAPI, FunnelsAPI } from '../services/api';
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
const leadProducts = ref([]);   // produtos associados ao lead (many-to-many)
const newNote     = ref('');
const newTagId    = ref('');
const newTagName  = ref('');
const fileInput   = ref(null);
const activeTab   = ref('notes');
const saving      = ref(false);
const syncingTags = ref(false);
const syncTagsErr = ref('');

/* ── Mover para outro funil/etapa ── */
const allFunnels   = ref([]);
const moveStages   = ref([]);
const moveFunnelId = ref(null);
const moveStageId  = ref(null);
const moving       = ref(false);

const load = async () => {
  const [leadRes, tagsRes, productsRes, funnelsRes] = await Promise.allSettled([
    LeadsAPI.get(props.lead.id),
    TagsAPI.list(),
    ProductsAPI.list(),
    FunnelsAPI.list()
  ]);

  if (leadRes.status !== 'fulfilled') {
    console.error('[CRM] LeadModal: falha ao carregar lead', leadRes.reason);
    return;
  }

  const data = leadRes.value.data;
  detail.value = data;
  notes.value = data.notes || [];
  history.value = data.histories || [];
  attachments.value = data.attachments || [];
  leadProducts.value = data.lead_products || [];

  const tagsData = tagsRes.status === 'fulfilled' ? tagsRes.value.data : [];
  allTags.value = tagsData;
  tags.value = (data.tag_ids || []).length
    ? tagsData.filter(t => data.tag_ids.includes(t.id))
    : [];

  allProducts.value = productsRes.status === 'fulfilled' ? productsRes.value.data : [];

  if (funnelsRes.status === 'fulfilled') {
    allFunnels.value = funnelsRes.value.data;
    moveFunnelId.value = data.funnel_id;
    const currentFunnel = allFunnels.value.find(f => f.id === data.funnel_id);
    moveStages.value = currentFunnel?.stages || [];
    moveStageId.value = data.stage_id;
  }
};

onMounted(load);

/* ── Mover lead ── */
const onMoveFunnelChange = async () => {
  const f = allFunnels.value.find(f => f.id === Number(moveFunnelId.value));
  if (!f) return;
  // Carrega stages do funil selecionado se não estiverem no objeto
  if (!f.stages || !f.stages.length) {
    const { data } = await FunnelsAPI.get(f.id);
    moveStages.value = data.stages || [];
  } else {
    moveStages.value = f.stages;
  }
  moveStageId.value = moveStages.value[0]?.id || null;
};

const moveLead = async () => {
  if (!moveStageId.value) return;
  moving.value = true;
  try {
    await LeadsAPI.move(props.lead.id, moveStageId.value);
    emit('updated');
    emit('close');
  } catch (e) {
    alert('Erro ao mover lead: ' + (e?.response?.data?.error || e.message));
  } finally {
    moving.value = false;
  }
};

const save = async () => {
  saving.value = true;
  try {
    await LeadsAPI.update(props.lead.id, {
      title:         detail.value.title,
      description:   detail.value.description,
      value:         detail.value.value,
      priority:      detail.value.priority,
      contact_name:  detail.value.contact?.name,
      contact_email: detail.value.contact?.email,
      contact_phone: detail.value.contact?.phone,
    });
    emit('updated');
  } finally {
    saving.value = false;
  }
};

/* ── Múltiplos produtos ── */
const newProductId = ref('');

const addProduct = async () => {
  if (!newProductId.value) return;
  try {
    const { data } = await LeadsAPI.leadProducts.add(props.lead.id, Number(newProductId.value));
    leadProducts.value.push(data);
    // Acumula valor
    if (data.unit_value) {
      detail.value.value = (Number(detail.value.value) || 0) + Number(data.unit_value);
    }
    newProductId.value = '';
  } catch (e) {
    alert(e?.response?.data?.errors?.join(', ') || 'Erro ao adicionar produto.');
  }
};

const removeProduct = async (lp) => {
  try {
    await LeadsAPI.leadProducts.remove(props.lead.id, lp.id);
    leadProducts.value = leadProducts.value.filter(p => p.id !== lp.id);
    // Remove valor
    if (lp.unit_value) {
      detail.value.value = Math.max(0, (Number(detail.value.value) || 0) - Number(lp.unit_value));
    }
  } catch (e) {
    alert('Erro ao remover produto.');
  }
};

const availableProducts = computed(() =>
  allProducts.value.filter(p => !leadProducts.value.some(lp => lp.product_id === p.id))
);

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

/* Sincroniza labels do Chatwoot como tags CRM */
const syncLabels = async () => {
  syncingTags.value = true;
  syncTagsErr.value = '';
  try {
    const { data } = await AccountsAPI.syncLabels();
    if (data.tags && data.tags.length) {
      allTags.value = data.tags;
    } else {
      // Recarrega da API mesmo se não criou nada novo
      const { data: fresh } = await TagsAPI.list();
      allTags.value = fresh;
    }
    if (data.created === 0 && (!data.tags || !data.tags.length)) {
      syncTagsErr.value = 'Nenhum label encontrado no Chatwoot.';
    }
  } catch (e) {
    syncTagsErr.value = 'Falha ao sincronizar: ' + (e?.response?.data?.error || e.message || 'erro desconhecido');
  } finally {
    syncingTags.value = false;
  }
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

const openConversation = () => {
  const id = detail.value?.conversation?.id;
  if (!id) return;
  window.parent.postMessage({ type: 'crm-open-conversation', conversationId: id }, '*');
};

const conversationId = computed(() => detail.value?.conversation?.id);

const ensureContact = () => {
  if (!detail.value.contact) detail.value.contact = {};
};

const fmtCurrency = (v, currency = 'BRL') =>
  v != null ? currency + ' ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—';

const billingLabel = (t) => t === 'recurring' ? 'Recorrente' : 'Único';
</script>

<template>
  <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="emit('close')">
    <div v-if="detail" class="bg-white rounded-xl w-[820px] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

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

        <!-- Painel esquerdo -->
        <div class="w-68 border-r border-slate-200 p-4 space-y-4 text-sm overflow-y-auto flex-shrink-0" style="width:17rem">

          <!-- Dados do contato -->
          <div>
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

          <!-- Produtos / Serviços (múltiplos) -->
          <div class="pt-2 border-t border-slate-100">
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Produtos / Serviços</label>
              <RouterLink to="/settings/products" class="text-xs text-brand hover:underline">+ Gerenciar</RouterLink>
            </div>

            <!-- Lista de produtos associados -->
            <div v-if="leadProducts.length" class="space-y-1 mb-2">
              <div
                v-for="lp in leadProducts"
                :key="lp.id"
                class="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-medium text-slate-700 truncate">{{ lp.product.name }}</div>
                  <div class="text-xs text-slate-400">
                    {{ fmtCurrency(lp.unit_value, lp.product.currency) }}
                    <span v-if="lp.product.billing_type === 'recurring'" class="ml-1 text-brand/70">· Recorrente</span>
                  </div>
                </div>
                <button @click="removeProduct(lp)" class="text-red-400 hover:text-red-600 ml-2 flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            <!-- Selecionar produto → adiciona automaticamente -->
            <select
              v-model="newProductId"
              @change="addProduct"
              class="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand/30">
              <option value="">Adicionar produto…</option>
              <option v-for="p in availableProducts" :key="p.id" :value="p.id">
                {{ p.name }}{{ p.value != null ? ' — ' + fmtCurrency(p.value, p.currency) : '' }}{{ p.billing_type === 'recurring' ? ' ↻' : '' }}
              </option>
            </select>
          </div>

          <!-- Valor -->
          <div class="pt-2 border-t border-slate-100">
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
          <div class="pt-2 border-t border-slate-100">
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

          <!-- Mover para funil/etapa -->
          <div class="pt-2 border-t border-slate-100">
            <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Mover para</label>
            <div class="space-y-1.5">
              <select
                v-model="moveFunnelId"
                @change="onMoveFunnelChange"
                class="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand/30">
                <option v-for="f in allFunnels" :key="f.id" :value="f.id">{{ f.name }}</option>
              </select>
              <select
                v-model="moveStageId"
                class="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand/30">
                <option v-for="s in moveStages" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
              <button
                @click="moveLead"
                :disabled="moving || (moveFunnelId == detail.funnel_id && moveStageId == detail.stage_id)"
                class="w-full px-3 py-1.5 bg-slate-700 text-white rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-slate-800 transition-colors">
                {{ moving ? 'Movendo…' : 'Mover lead' }}
              </button>
            </div>
          </div>

          <!-- Observações internas -->
          <div class="pt-2 border-t border-slate-100">
            <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Observações</label>
            <textarea
              v-model="detail.description"
              rows="3"
              class="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
              placeholder="Notas rápidas sobre o lead…"></textarea>
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
                  <div class="flex items-center justify-between mb-1.5">
                    <p class="text-xs text-slate-500 font-medium">Tag existente:</p>
                    <div class="flex flex-col items-end gap-0.5">
                      <button
                        @click="syncLabels"
                        :disabled="syncingTags"
                        class="text-xs text-brand hover:underline disabled:opacity-50 flex items-center gap-1">
                        <svg v-if="!syncingTags" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
                        <svg v-else width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="animate-spin"><circle cx="12" cy="12" r="10"/></svg>
                        {{ syncingTags ? 'Sincronizando…' : 'Sincronizar do Chatwoot' }}
                      </button>
                      <span v-if="syncTagsErr" class="text-xs text-red-500">{{ syncTagsErr }}</span>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <select v-model="newTagId" class="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm">
                      <option value="">Selecionar…</option>
                      <option v-for="t in allTags.filter(t => !tags.some(lt => lt.id === t.id))"
                              :key="t.id" :value="t.id">{{ t.name }}</option>
                    </select>
                    <button @click="addTag" :disabled="!newTagId"
                            class="px-3 py-1.5 bg-brand text-white rounded-lg text-sm disabled:opacity-40">+</button>
                  </div>
                  <p v-if="allTags.length === 0 && !syncingTags" class="text-xs text-slate-400 mt-1.5">
                    Nenhuma tag cadastrada. Clique em "Sincronizar do Chatwoot" ou crie uma nova.
                  </p>
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
    <div v-else class="bg-white rounded-xl w-[820px] p-8 text-center text-slate-400 flex flex-col items-center gap-3">
      <svg class="animate-spin w-6 h-6 text-brand/60" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>
      <span>Carregando…</span>
      <button @click="load" class="text-xs text-brand hover:underline mt-1">Tentar novamente</button>
    </div>
  </div>
</template>
