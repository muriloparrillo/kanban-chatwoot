<script setup>
import { onMounted, ref } from 'vue';
import { AccountsAPI } from '../services/api';
import { useRouter } from 'vue-router';

const router = useRouter();
const current = ref(null);
const loading = ref(false);
const syncing = ref(false);
const form = ref({
  chatwoot_account_id: '',
  name: '',
  chatwoot_base_url: 'https://app.chatwoot.com',
  chatwoot_api_access_token: ''
});
const success = ref(null);

const load = async () => {
  try { current.value = (await AccountsAPI.current()).data; }
  catch { current.value = null; }
};
onMounted(load);

const register = async () => {
  loading.value = true;
  try {
    const { data } = await AccountsAPI.register(form.value);
    localStorage.setItem('kanban_account_token', data.account_token);
    success.value = data;
    current.value = data;
  } catch (e) {
    alert(e?.response?.data?.errors?.join('\n') || 'Erro ao conectar');
  } finally {
    loading.value = false;
  }
};

const sync = async () => {
  syncing.value = true;
  try { await AccountsAPI.syncConversations(200); alert('Conversas sincronizadas com sucesso.'); }
  catch (e) { alert('Falha ao sincronizar: ' + (e?.response?.data?.message || e.message)); }
  finally { syncing.value = false; }
};

const goBoard = () => router.push('/board');
</script>

<template>
  <div class="max-w-2xl mx-auto p-6">
    <h1 class="text-2xl font-semibold mb-1">Configurar conta</h1>
    <p class="text-slate-500 mb-6 text-sm">
      Conecte sua conta Chatwoot ao Kanban informando a URL da instância e um
      <strong>Access Token de Conta</strong> (Configurações → Perfil → API Access Token de uma conta administradora).
    </p>

    <div v-if="current" class="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-5">
      <div class="font-medium text-emerald-800">Conectado: {{ current.name }}</div>
      <div class="text-sm text-emerald-700">Conta Chatwoot #{{ current.chatwoot_account_id }} · {{ current.chatwoot_base_url }}</div>
      <div class="text-sm mt-2">
        <button class="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm" :disabled="syncing" @click="sync">
          {{ syncing ? 'Sincronizando…' : 'Sincronizar conversas recentes' }}
        </button>
        <button class="ml-2 px-3 py-1.5 border rounded text-sm" @click="goBoard">Ir para o Kanban</button>
      </div>

      <div class="mt-3 text-sm">
        <p class="text-slate-600">Webhook URL (configure em Chatwoot → Integrações → Webhooks):</p>
        <code class="block bg-white border p-2 rounded text-xs break-all">{{ current.webhook_url }}</code>
      </div>
    </div>

    <div class="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
      <h2 class="font-semibold">{{ current ? 'Conectar outra conta' : 'Conectar conta Chatwoot' }}</h2>
      <div>
        <label class="text-xs text-slate-500">Nome de exibição</label>
        <input v-model="form.name" class="w-full border rounded px-3 py-2 text-sm" placeholder="Minha empresa" />
      </div>
      <div>
        <label class="text-xs text-slate-500">ID da conta Chatwoot</label>
        <input v-model.number="form.chatwoot_account_id" type="number" class="w-full border rounded px-3 py-2 text-sm" placeholder="1" />
      </div>
      <div>
        <label class="text-xs text-slate-500">URL base do Chatwoot</label>
        <input v-model="form.chatwoot_base_url" class="w-full border rounded px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="text-xs text-slate-500">API Access Token</label>
        <input v-model="form.chatwoot_api_access_token" type="password" class="w-full border rounded px-3 py-2 text-sm" />
      </div>
      <button @click="register" :disabled="loading" class="px-3 py-2 bg-brand text-white rounded text-sm disabled:opacity-50">
        {{ loading ? 'Conectando…' : 'Conectar' }}
      </button>
    </div>

    <div v-if="success" class="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div class="font-medium text-blue-800">Token do Dashboard App</div>
      <p class="text-sm text-blue-700 mt-1">
        Use este token no Chatwoot → Configurações → Apps → Dashboard App como parâmetro <code>account_token</code>:
      </p>
      <code class="block bg-white border p-2 rounded text-xs break-all mt-1">{{ success.account_token }}</code>
      <p class="text-xs text-blue-700 mt-2">
        URL completa sugerida:
        <code class="block bg-white border p-1 rounded mt-1 break-all">
          https://kanban.seudominio.com/?account_token={{ success.account_token }}
        </code>
      </p>
    </div>
  </div>
</template>
