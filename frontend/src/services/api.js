import axios from 'axios';

/**
 * The Dashboard App is embedded in Chatwoot as an iframe.
 * Chatwoot appends query params to the iframe URL (conversation context) and
 * the admin must configure `?account_token=<token>` when registering the app.
 * We persist the token in localStorage so navigation within the iframe keeps it.
 */
function readToken() {
  const url = new URL(window.location.href);
  const fromQuery = url.searchParams.get('account_token');
  if (fromQuery) {
    localStorage.setItem('kanban_account_token', fromQuery);
    return fromQuery;
  }
  return localStorage.getItem('kanban_account_token') || '';
}

function readCwAccountId() {
  // O inject script passa cw_account_id na URL do iframe para isolar dados por conta Chatwoot
  const url = new URL(window.location.href);
  const fromQuery = url.searchParams.get('cw_account_id');
  if (fromQuery) {
    localStorage.setItem('kanban_cw_account_id', fromQuery);
    return fromQuery;
  }
  return localStorage.getItem('kanban_cw_account_id') || '';
}

function readChatwootUser() {
  // Chatwoot posts user context via postMessage. We store it when received.
  try {
    return JSON.parse(localStorage.getItem('kanban_cw_user') || 'null');
  } catch {
    return null;
  }
}

const baseURL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) config.headers['X-Account-Token'] = token;
  const cwId = readCwAccountId();
  if (cwId) config.headers['X-Chatwoot-Account-Id'] = cwId;
  const user = readChatwootUser();
  if (user) {
    config.headers['X-Chatwoot-User-Id']   = user.id;
    config.headers['X-Chatwoot-User-Name'] = user.name;
  }
  return config;
});

// Listen for user info coming from Chatwoot parent frame.
window.addEventListener('message', (e) => {
  try {
    const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    if (data?.event === 'appContext' && data?.data?.currentAgent) {
      localStorage.setItem('kanban_cw_user', JSON.stringify({
        id: data.data.currentAgent.id,
        name: data.data.currentAgent.name,
        avatar: data.data.currentAgent.avatar_url
      }));
    }
  } catch (_) { /* ignore */ }
});

export default api;

export const AccountsAPI = {
  current:             () => api.get('/api/v1/accounts/current'),
  register:            (payload) => api.post('/api/v1/accounts', { account: payload }),
  update:              (payload) => api.patch('/api/v1/accounts/0', { account: payload }),
  syncConversations:    (limit = 100) => api.post('/api/v1/accounts/sync_conversations', { limit }),
  syncLabels:           () => api.post('/api/v1/accounts/sync_labels'),
  messageTemplates:     () => api.get('/api/v1/accounts/message_templates')
};

export const FunnelsAPI = {
  list:     () => api.get('/api/v1/funnels'),
  get:      (id) => api.get(`/api/v1/funnels/${id}`),
  create:   (payload) => api.post('/api/v1/funnels', { funnel: payload }),
  update:   (id, payload) => api.patch(`/api/v1/funnels/${id}`, { funnel: payload }),
  destroy:  (id) => api.delete(`/api/v1/funnels/${id}`),
  duplicate:(id) => api.post(`/api/v1/funnels/${id}/duplicate`),
  reorderStages: (id, order) => api.patch(`/api/v1/funnels/${id}/reorder_stages`, { order })
};

export const StagesAPI = {
  create:  (funnelId, payload) => api.post(`/api/v1/funnels/${funnelId}/stages`, { stage: payload }),
  update:  (funnelId, id, payload) => api.patch(`/api/v1/funnels/${funnelId}/stages/${id}`, { stage: payload }),
  destroy: (funnelId, id) => api.delete(`/api/v1/funnels/${funnelId}/stages/${id}`)
};

export const BoardAPI = {
  get: (funnelId) => api.get(`/api/v1/boards/${funnelId}`)
};

export const LeadsAPI = {
  list:    (params) => api.get('/api/v1/leads', { params }),
  get:     (id) => api.get(`/api/v1/leads/${id}`),
  create:  (payload) => api.post('/api/v1/leads', { lead: payload }),
  update:  (id, payload) => api.patch(`/api/v1/leads/${id}`, { lead: payload }),
  destroy: (id) => api.delete(`/api/v1/leads/${id}`),
  move:    (id, stageId, position) => api.patch(`/api/v1/leads/${id}/move`, { stage_id: stageId, position }),
  assign:  (id, payload) => api.post(`/api/v1/leads/${id}/assign`, payload),
  archive: (id) => api.post(`/api/v1/leads/${id}/archive`),
  unarchive:(id) => api.post(`/api/v1/leads/${id}/unarchive`),

  notes: {
    list:    (leadId) => api.get(`/api/v1/leads/${leadId}/notes`),
    create:  (leadId, body) => api.post(`/api/v1/leads/${leadId}/notes`, { body }),
    destroy: (leadId, id) => api.delete(`/api/v1/leads/${leadId}/notes/${id}`)
  },
  attachments: {
    list:    (leadId) => api.get(`/api/v1/leads/${leadId}/attachments`),
    upload:  (leadId, file) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post(`/api/v1/leads/${leadId}/attachments`, fd,
        { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    destroy: (leadId, id) => api.delete(`/api/v1/leads/${leadId}/attachments/${id}`)
  },
  histories: (leadId) => api.get(`/api/v1/leads/${leadId}/histories`),
  leadProducts: {
    add:    (leadId, productId) => api.post(`/api/v1/leads/${leadId}/lead_products`, { product_id: productId }),
    remove: (leadId, lpId)      => api.delete(`/api/v1/leads/${leadId}/lead_products/${lpId}`)
  },
  tags: {
    list:   (leadId) => api.get(`/api/v1/leads/${leadId}/tags`),
    add:    (leadId, payload) => api.post(`/api/v1/leads/${leadId}/tags`, payload),
    remove: (leadId, tagId) => api.delete(`/api/v1/leads/${leadId}/tags/${tagId}`)
  }
};

export const TagsAPI = {
  list:    () => api.get('/api/v1/tags'),
  create:  (payload) => api.post('/api/v1/tags', { tag: payload }),
  destroy: (id) => api.delete(`/api/v1/tags/${id}`)
};

export const AgentsAPI = {
  list: () => api.get('/api/v1/agents')
};

export const ProductsAPI = {
  list:    (all = false) => api.get('/api/v1/products', { params: all ? { all: 'true' } : {} }),
  create:  (payload) => api.post('/api/v1/products', { product: payload }),
  update:  (id, payload) => api.patch(`/api/v1/products/${id}`, { product: payload }),
  destroy: (id) => api.delete(`/api/v1/products/${id}`)
};

export const ScheduledMessagesAPI = {
  list:       (params) => api.get('/api/v1/scheduled_messages', { params }),
  create:     (payload) => api.post('/api/v1/scheduled_messages', { scheduled_message: payload }),
  update:     (id, payload) => api.patch(`/api/v1/scheduled_messages/${id}`, { scheduled_message: payload }),
  destroy:    (id) => api.delete(`/api/v1/scheduled_messages/${id}`),
  processDue: () => api.post('/api/v1/scheduled_messages/process_due')
};

export const TasksAPI = {
  list:    (params) => api.get('/api/v1/tasks', { params }),
  get:     (id) => api.get(`/api/v1/tasks/${id}`),
  create:  (payload) => api.post('/api/v1/tasks', { task: payload }),
  update:  (id, payload) => api.patch(`/api/v1/tasks/${id}`, { task: payload }),
  destroy: (id) => api.delete(`/api/v1/tasks/${id}`)
};
