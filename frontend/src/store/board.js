import { defineStore } from 'pinia';
import { BoardAPI, FunnelsAPI, LeadsAPI } from '../services/api';

export const useBoardStore = defineStore('board', {
  state: () => ({
    funnels: [],
    currentFunnelId: null,
    stages: [],
    leadsByStage: {}, // { stageId: [lead, lead, ...] }
    filter: { q: '', assigneeId: null, tagId: null, priority: null },
    loading: false,
    error: null
  }),

  getters: {
    currentFunnel: (s) => s.funnels.find(f => f.id === s.currentFunnelId),
    filteredLeadsByStage: (s) => {
      const out = {};
      for (const stageId of Object.keys(s.leadsByStage)) {
        out[stageId] = s.leadsByStage[stageId].filter((l) => {
          if (s.filter.q) {
            const q = s.filter.q.toLowerCase();
            const bag = `${l.title} ${l.contact_name || ''} ${l.contact_email || ''} ${l.contact_phone || ''}`.toLowerCase();
            if (!bag.includes(q)) return false;
          }
          if (s.filter.assigneeId && l.assignee?.id != s.filter.assigneeId) return false;
          if (s.filter.tagId && !(l.tags || []).some(t => t.id == s.filter.tagId)) return false;
          if (s.filter.priority != null && l.priority != s.filter.priority) return false;
          return true;
        });
      }
      return out;
    }
  },

  actions: {
    async loadFunnels() {
      const { data } = await FunnelsAPI.list();
      this.funnels = data;
      if (!this.currentFunnelId && data.length) this.currentFunnelId = data[0].id;
    },

    async loadBoard(funnelId = this.currentFunnelId) {
      if (!funnelId) return;
      this.loading = true;
      this.error = null;
      try {
        const { data } = await BoardAPI.get(funnelId);
        this.currentFunnelId = data.funnel.id;
        this.stages = data.stages;
        this.leadsByStage = {};
        for (const stage of data.stages) this.leadsByStage[stage.id] = stage.leads;
      } catch (e) {
        this.error = e?.response?.data?.message || e.message;
      } finally {
        this.loading = false;
      }
    },

    setFilter(patch) {
      this.filter = { ...this.filter, ...patch };
    },

    // Drag-and-drop: vuedraggable already mutated the reactive :list arrays.
    // We just persist the move to the API and update stage_id on the lead.
    // On API error we reload the board to restore correct state.
    async moveLead({ leadId, toStageId, toIndex }) {
      // Update stage_id on the lead that vuedraggable placed in toStageId list
      const toList = this.leadsByStage[toStageId] || [];
      const idx = toList.findIndex(l => l.id === leadId);
      if (idx !== -1) {
        toList[idx] = { ...toList[idx], stage_id: toStageId };
        this.leadsByStage[toStageId] = [...toList];
      }
      try {
        await LeadsAPI.move(leadId, toStageId, toIndex);
      } catch (e) {
        // Reload board to restore server-side state after failure
        await this.loadBoard();
        throw e;
      }
    },

    async createLead(payload) {
      const { data } = await LeadsAPI.create(payload);
      const stageId = data.stage_id;
      this.leadsByStage[stageId] = [...(this.leadsByStage[stageId] || []), data];
      return data;
    },

    async updateLead(id, payload) {
      const { data } = await LeadsAPI.update(id, payload);
      for (const sid of Object.keys(this.leadsByStage)) {
        this.leadsByStage[sid] = this.leadsByStage[sid].map(l => l.id === id ? { ...l, ...data } : l);
      }
    },

    async archiveLead(id) {
      await LeadsAPI.archive(id);
      for (const sid of Object.keys(this.leadsByStage)) {
        this.leadsByStage[sid] = this.leadsByStage[sid].filter(l => l.id !== id);
      }
    }
  }
});
