/**
 * Kanban/CRM Inject — item CRM nativo no sidebar + botão "+ CRM" em conversas e contatos
 * v3.1 — findContactAnchor text+position (Chatwoot v4 / Tailwind)
 */
(function () {
  'use strict';

  /* ─── CONFIGURAÇÃO ──────────────────────────────────────────────────── */
  var KANBAN_URL    = 'https://vai-novofoco-kanban-chatwoot-frontend.dutk9f.easypanel.host';
  var ACCOUNT_TOKEN = '0fb0a7572850a512f7127633a15e844673bd3e6cf839fa75';
  var DEBUG         = true;

  /* ─── GUARD ─────────────────────────────────────────────────────────── */
  if (window.__crmInjected) return;
  window.__crmInjected = true;

  /* ─── ESTADO ─────────────────────────────────────────────────────────── */
  var menuOpen        = true;
  var currentFunnelId = null;
  var panelEl         = null;
  var retryCount      = 0;
  var MAX_RETRIES     = 60;
  var funnelsCache    = [];   // { id, name, color }
  var stagesCache     = {};   // { funnelId: [{id, name}] }
  var crmPopover      = null;

  function log() {
    if (!DEBUG) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[CRM]');
    console.log.apply(console, args);
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * ESTILOS
   * ═══════════════════════════════════════════════════════════════════════ */
  function injectStyles() {
    if (document.getElementById('crm-inject-style')) return;
    var s = document.createElement('style');
    s.id = 'crm-inject-style';
    s.textContent = [
      /* painel overlay */
      '#crm-panel{position:fixed;top:0;left:60px;right:0;bottom:0;background:#fff;',
      'z-index:9998;display:none;flex-direction:column;box-shadow:-3px 0 12px rgba(0,0,0,.18)}',
      '#crm-panel.crm-open{display:flex}',
      '#crm-panel iframe{flex:1;width:100%;border:none}',
      '#crm-panel-bar{display:flex;align-items:center;justify-content:space-between;',
      'padding:6px 14px;min-height:40px;background:#f8f9fa;border-bottom:1px solid #e4e7ed}',
      '#crm-panel-bar span{font-size:13px;font-weight:600;color:#1c2b33}',
      '#crm-panel-close{background:none;border:none;cursor:pointer;padding:4px 8px;',
      'border-radius:6px;font-size:16px;color:#6b7280;line-height:1}',
      '#crm-panel-close:hover{background:#e4e7ed;color:#1c2b33}',
      'html.dark #crm-panel{background:#1c2b33}',
      'html.dark #crm-panel-bar{background:#243641;border-color:#3a4a54}',
      'html.dark #crm-panel-bar span{color:#e5eef3}',
      'html.dark #crm-panel-close{color:#9babb4}',
      'html.dark #crm-panel-close:hover{background:#3a4a54;color:#e5eef3}',
      /* grupo CRM sidebar */
      '#crm-sidebar-group{flex-shrink:0;flex-basis:100%;width:100%;min-height:0;',
      'box-sizing:border-box;grid-column:1/-1;align-self:stretch}',
      '#crm-group-header{display:flex;align-items:center;justify-content:space-between;',
      'padding:8px 12px;border-radius:8px;cursor:pointer;color:#3d4f58;font-size:13px;',
      'font-weight:500;width:100%;background:none;border:none;',
      'transition:background .15s,color .15s;box-sizing:border-box;text-align:left}',
      '#crm-group-header:hover{background:rgba(31,147,255,.06);color:#1f93ff}',
      '#crm-group-header.crm-active{color:#1f93ff}',
      'html.dark #crm-group-header{color:#9babb4}',
      'html.dark #crm-group-header:hover{background:rgba(31,147,255,.1);color:#1f93ff}',
      '#crm-header-left{display:flex;align-items:center;gap:8px;min-width:0}',
      '#crm-chevron{transition:transform .2s;flex-shrink:0;opacity:.6}',
      '#crm-chevron.open{transform:rotate(90deg)}',
      '#crm-funnel-list{list-style:none;margin:0;padding:0 0 2px 0;',
      'display:none;flex-direction:column;gap:0}',
      '#crm-funnel-list.open{display:flex}',
      '.crm-funnel-item{display:flex;align-items:center;padding:6px 12px 6px 32px;',
      'border-radius:6px;font-size:13px;color:#3d4f58;cursor:pointer;background:none;',
      'border:none;width:100%;text-align:left;transition:background .12s,color .12s;',
      'box-sizing:border-box;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.crm-funnel-item:hover{background:rgba(31,147,255,.07);color:#1f93ff}',
      '.crm-funnel-item.crm-active{background:rgba(31,147,255,.12);color:#1f93ff;font-weight:500}',
      'html.dark .crm-funnel-item{color:#9babb4}',
      'html.dark .crm-funnel-item:hover{background:rgba(31,147,255,.1);color:#1f93ff}',
      '.crm-funnel-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;background:#1f93ff;',
      'margin-right:8px;display:inline-block}',
      '.crm-skeleton{height:26px;border-radius:6px;background:#e4e7ed;margin:2px 0;',
      'animation:crm-pulse 1.2s ease infinite}',
      'html.dark .crm-skeleton{background:#2e404c}',
      '@keyframes crm-pulse{0%,100%{opacity:1}50%{opacity:.4}}',
      /* botão + CRM inline */
      '.crm-add-btn{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;',
      'border-radius:6px;border:1px solid #1f93ff;background:#fff;color:#1f93ff;',
      'font-size:12px;font-weight:500;cursor:pointer;transition:background .12s,color .12s;',
      'white-space:nowrap;margin:6px 0}',
      '.crm-add-btn:hover{background:#1f93ff;color:#fff}',
      'html.dark .crm-add-btn{background:#1c2b33;border-color:#1f93ff}',
      'html.dark .crm-add-btn:hover{background:#1f93ff;color:#fff}',
      /* popover */
      '#crm-popover{position:fixed;z-index:10001;background:#fff;border:1px solid #e4e7ed;',
      'border-radius:10px;padding:14px;box-shadow:0 6px 24px rgba(0,0,0,.14);',
      'min-width:230px;max-width:290px}',
      'html.dark #crm-popover{background:#243641;border-color:#3a4a54;color:#e5eef3}',
      '#crm-popover select{width:100%;padding:5px 8px;border:1px solid #e4e7ed;',
      'border-radius:6px;font-size:12px;background:#fff;color:#1c2b33;outline:none}',
      'html.dark #crm-popover select{background:#1c2b33;border-color:#3a4a54;color:#e5eef3}',
      '#crm-popover label{font-size:11px;color:#6b7280;display:block;margin-bottom:3px}',
      'html.dark #crm-popover label{color:#9babb4}',
      '#crm-pop-add{flex:1;padding:6px;border:none;border-radius:6px;background:#1f93ff;',
      'color:#fff;font-size:12px;cursor:pointer;font-weight:500}',
      '#crm-pop-add:disabled{background:#93c5fd;cursor:default}',
      '#crm-pop-cancel{flex:1;padding:6px;border:1px solid #e4e7ed;border-radius:6px;',
      'background:#fff;font-size:12px;cursor:pointer;color:#6b7280}',
      'html.dark #crm-pop-cancel{background:#1c2b33;border-color:#3a4a54;color:#9babb4}'
    ].join('');
    var head = document.head || document.getElementsByTagName('head')[0];
    if (head) head.appendChild(s);
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * PAINEL IFRAME (board)
   * ═══════════════════════════════════════════════════════════════════════ */
  function ensurePanel() {
    if (panelEl || !document.body) return;
    panelEl = document.createElement('div');
    panelEl.id = 'crm-panel';
    panelEl.innerHTML =
      '<div id="crm-panel-bar">' +
        '<span>\uD83D\uDCCB CRM \u2014 Kanban</span>' +
        '<button id="crm-panel-close" title="Fechar (Esc)">\u2715</button>' +
      '</div>' +
      '<iframe id="crm-iframe" src="" allow="*" title="CRM Kanban"></iframe>';
    document.body.appendChild(panelEl);
    document.getElementById('crm-panel-close').addEventListener('click', closePanel);
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closePanel(); });
  }

  function syncPanelLeft() {
    if (!panelEl) return;
    var sidebar = document.querySelector('.woot-sidebar') ||
                  document.querySelector('aside') ||
                  document.querySelector('[class*="sidebar"]');
    panelEl.style.left = (sidebar ? sidebar.offsetWidth : 60) + 'px';
  }

  function openPanel(funnelId) {
    if (!panelEl) ensurePanel();
    syncPanelLeft();
    var iframe = document.getElementById('crm-iframe');
    if (!iframe) return;
    var url = KANBAN_URL + '/?account_token=' + ACCOUNT_TOKEN + '&embedded=true';
    if (funnelId) url += '#/board/' + funnelId;
    if (iframe.src !== url) iframe.src = url;
    currentFunnelId = funnelId || null;
    panelEl.classList.add('crm-open');
    updateActiveItem();
  }

  function closePanel() {
    if (!panelEl) return;
    panelEl.classList.remove('crm-open');
    currentFunnelId = null;
    updateActiveItem();
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * API HELPERS
   * ═══════════════════════════════════════════════════════════════════════ */
  function fetchFunnels(cb) {
    fetch(KANBAN_URL + '/api/v1/funnels', {
      headers: { 'X-Account-Token': ACCOUNT_TOKEN }
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      funnelsCache = Array.isArray(data) ? data : (data.funnels || []);
      cb(funnelsCache);
    })
    .catch(function(err) { log('fetch funnels error:', err); cb([]); });
  }

  function fetchStages(funnelId, cb) {
    if (stagesCache[funnelId]) { cb(stagesCache[funnelId]); return; }
    fetch(KANBAN_URL + '/api/v1/boards/' + funnelId, {
      headers: { 'X-Account-Token': ACCOUNT_TOKEN }
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      stagesCache[funnelId] = data.stages || [];
      cb(stagesCache[funnelId]);
    })
    .catch(function() { cb([]); });
  }

  function createLead(funnelId, stageId, contactData, cb) {
    fetch(KANBAN_URL + '/api/v1/leads', {
      method: 'POST',
      headers: {
        'X-Account-Token': ACCOUNT_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        lead: {
          funnel_id: funnelId,
          stage_id: stageId,
          title: contactData.name || 'Novo Lead',
          contact_name: contactData.name,
          contact_email: contactData.email,
          contact_phone: contactData.phone,
          chatwoot_contact_id: contactData.contactId,
          chatwoot_conversation_id: contactData.conversationId,
          source: 'manual'
        }
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) { cb(null, data); })
    .catch(function(err) { cb(err, null); });
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * SIDEBAR CRM (grupo com funis)
   * ═══════════════════════════════════════════════════════════════════════ */
  var CRM_ICON =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">' +
    '<rect x="2" y="3" width="4" height="18" rx="1.2"/>' +
    '<rect x="9" y="3" width="4" height="12" rx="1.2"/>' +
    '<rect x="16" y="3" width="4" height="15" rx="1.2"/></svg>';

  var CHEVRON_ICON =
    '<svg id="crm-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<polyline points="9 18 15 12 9 6"/></svg>';

  function updateActiveItem() {
    var items = document.querySelectorAll('.crm-funnel-item');
    for (var i = 0; i < items.length; i++) {
      var fid = items[i].getAttribute('data-funnel-id');
      items[i].classList.toggle('crm-active', fid && Number(fid) === currentFunnelId);
    }
    var header = document.getElementById('crm-group-header');
    if (header) header.classList.toggle('crm-active', !!currentFunnelId);
  }

  function populateFunnels(list) {
    var ul = document.getElementById('crm-funnel-list');
    if (!ul) return;
    ul.innerHTML = '';
    if (!list.length) {
      var empty = document.createElement('li');
      empty.style.cssText = 'padding:6px 8px 6px 28px;font-size:12px;color:#9babb4';
      empty.textContent = 'Nenhum funil encontrado';
      ul.appendChild(empty);
      return;
    }
    list.forEach(function(f) {
      var li  = document.createElement('li');
      var btn = document.createElement('button');
      btn.className = 'crm-funnel-item';
      btn.setAttribute('data-funnel-id', String(f.id));
      btn.innerHTML =
        '<span class="crm-funnel-dot" style="background:' + (f.color || '#1f93ff') + '"></span>' +
        '<span>' + (f.name || 'Funil') + '</span>';
      btn.addEventListener('click', function(e) { e.stopPropagation(); openPanel(f.id); });
      li.appendChild(btn);
      ul.appendChild(li);
    });
    log('funis carregados:', list.length);
  }

  /* ── Encontra o ponto exato de inserção no mesmo nível dos itens nativos ──
   *
   * Problema anterior: inseríamos no container pai do sidebar (flex-column com
   * justify-content:space-between), deixando o gap enorme entre CRM e os itens.
   *
   * Solução: buscar "Caixa de Entrada" / "Inbox" por texto, subir na árvore
   * até encontrar um container COLUNA (flex-direction:column ou block/ul),
   * e inserir NESSE nível — exatamente irmão dos itens nativos.
   * ─────────────────────────────────────────────────────────────────────── */
  function isColumnContainer(el) {
    try {
      var cs = window.getComputedStyle(el);
      var d  = cs.display;
      var fd = cs.flexDirection;
      var t  = el.tagName.toUpperCase();
      return (d === 'flex' && fd === 'column') ||
             d === 'block' ||
             t === 'UL' || t === 'OL' || t === 'NAV';
    } catch(e) { return false; }
  }

  function findInsertionPoint() {
    /* ── Estratégia 1: texto "Caixa de Entrada" / "Inbox" ── */
    var allEls = document.querySelectorAll('span, p, a, div, li, button');
    var knownTexts = [
      'Caixa de Entrada', 'Inbox',
      'Conversas', 'Conversations',
      'Contatos',  'Contacts',
      'Relatórios','Reports'
    ];

    for (var t = 0; t < knownTexts.length; t++) {
      for (var e = 0; e < allEls.length; e++) {
        var el = allEls[e];
        /* Elemento de texto puro — sem filhos ou com ícone SVG apenas */
        var hasOnlySvg = el.children.length === 1 &&
                         el.children[0].tagName === 'SVG';
        if (el.children.length > 0 && !hasOnlySvg) continue;
        if (el.textContent.trim() !== knownTexts[t]) continue;
        if (!el.offsetParent) continue; // oculto

        /* Sobe até achar um container COLUNA com ≥3 filhos */
        var node = el;
        for (var steps = 0; steps < 8; steps++) {
          var parent = node.parentElement;
          if (!parent || parent === document.body) break;
          if (parent.children.length >= 3 && isColumnContainer(parent)) {
            log('inserção via texto "' + knownTexts[t] + '" | container:',
                parent.tagName, window.getComputedStyle(parent).display,
                '| filhos:', parent.children.length);
            return { container: parent, before: node };
          }
          node = parent;
        }
      }
    }

    /* ── Estratégia 2: link de nível superior + verificação de coluna ── */
    var probes = [
      'a[href*="/contacts"]', 'a[href*="/reports"]',
      'a[href*="/campaigns"]', 'a[href*="/mentions"]'
    ];
    for (var i = 0; i < probes.length; i++) {
      var link = document.querySelector(probes[i]);
      if (!link || !link.offsetParent) continue;
      var node2 = link;
      for (var s = 0; s < 8; s++) {
        var p = node2.parentElement;
        if (!p || p === document.body) break;
        if (p.children.length >= 4 && isColumnContainer(p)) {
          log('inserção via probe', probes[i], '| filhos:', p.children.length);
          return { container: p, before: node2 };
        }
        node2 = p;
      }
    }

    /* ── Fallback genérico ── */
    var fallbacks = ['aside nav', '.woot-sidebar nav', '.woot-sidebar', 'aside'];
    for (var j = 0; j < fallbacks.length; j++) {
      var found = document.querySelector(fallbacks[j]);
      if (found) { log('fallback:', fallbacks[j]); return { container: found, before: found.firstChild }; }
    }
    return null;
  }

  function injectSidebar() {
    if (document.getElementById('crm-sidebar-group')) return;
    injectStyles();
    ensurePanel();
    var point = findInsertionPoint();
    if (!point) {
      log('ponto de inserção não encontrado ainda');
      return;
    }
    var container = point.container;
    var before    = point.before;

    var group = document.createElement('div');
    group.id = 'crm-sidebar-group';
    group.innerHTML =
      '<button id="crm-group-header">' +
        '<div id="crm-header-left">' + CRM_ICON + '<span>CRM</span></div>' +
        CHEVRON_ICON +
      '</button>' +
      '<ul id="crm-funnel-list">' +
        '<li class="crm-skeleton"></li>' +
        '<li class="crm-skeleton" style="width:75%"></li>' +
      '</ul>';

    if (before) container.insertBefore(group, before);
    else container.appendChild(group);

    var header = document.getElementById('crm-group-header');
    var list   = document.getElementById('crm-funnel-list');
    var chev   = document.getElementById('crm-chevron');
    if (header && list) {
      header.addEventListener('click', function() {
        menuOpen = !menuOpen;
        list.classList.toggle('open', menuOpen);
        if (chev) chev.classList.toggle('open', menuOpen);
      });
      list.classList.add('open');
      if (chev) chev.classList.add('open');
    }

    fetchFunnels(function(data) {
      populateFunnels(data);
      updateActiveItem();
    });
    log('\u2705 sidebar CRM injetado');
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * BOTÃO "+ CRM" — CONVERSA E CONTATO
   * ═══════════════════════════════════════════════════════════════════════ */

  /* ── Parsear URL ─────────────────────────────────────────────────────── */
  function parseUrl() {
    var url = window.location.href;
    var cm = url.match(/\/conversations\/(\d+)/);
    var ct = url.match(/\/contacts\/(\d+)/);
    return {
      type: cm ? 'conversation' : (ct ? 'contact' : null),
      conversationId: cm ? cm[1] : null,
      contactId: ct ? ct[1] : null
    };
  }

  /* ── Extrair dados do contato do DOM ─────────────────────────────────── */
  function extractContactData(ctx) {
    var name = '', email = '', phone = '';

    /* Nome — tenta vários seletores */
    var nameSelectors = [
      '.contact-name', '[class*="contact-name"]',
      '.contact__name', '.contact-info__name',
      'h1', '.page-title', '.title'
    ];
    for (var i = 0; i < nameSelectors.length; i++) {
      var el = document.querySelector(nameSelectors[i]);
      if (el && el.textContent.trim()) { name = el.textContent.trim(); break; }
    }

    /* Email / Phone — se visíveis no DOM */
    var emailEl = document.querySelector('[href^="mailto:"]');
    if (emailEl) email = emailEl.textContent.trim();

    var phoneEl = document.querySelector('[href^="tel:"]');
    if (phoneEl) phone = phoneEl.textContent.trim();

    return {
      name: name,
      email: email,
      phone: phone,
      conversationId: ctx.conversationId,
      contactId: ctx.contactId
    };
  }

  /* ── Encontrar onde ancorar o botão ──────────────────────────────────── */
  /*
   * Estratégia text-first + posição:
   * 1. Texto de seção conhecido → sobe até container com ≥2 filhos
   * 2. Para conversa: aside/div na metade direita da tela
   * 3. Para contato: h1 → parentElement
   * 4. Fallback: seletores CSS legados (Chatwoot v2/v3)
   */
  function findContactAnchor(type) {
    var allEls = document.querySelectorAll('h4, h5, span, p, div, label');

    if (type === 'conversation') {
      /* Textos de seção típicos do painel direito da conversa */
      var convTexts = [
        'Ações da conversa',    'Conversation Actions',
        'Participantes',        'Participants',
        'Informações de contato','Contact Information',
        'Etiquetas',            'Labels',
        'Equipe',               'Team'
      ];
      for (var t = 0; t < convTexts.length; t++) {
        for (var e = 0; e < allEls.length; e++) {
          var el = allEls[e];
          if (el.children.length > 1) continue;
          if (el.textContent.trim() !== convTexts[t]) continue;
          if (!el.offsetParent) continue;
          /* Sobe buscando um container do lado direito */
          var node = el;
          for (var s = 0; s < 8; s++) {
            var par = node.parentElement;
            if (!par || par === document.body) break;
            var rect = par.getBoundingClientRect();
            if (rect.left > window.innerWidth * 0.45 && par.children.length >= 2) {
              log('anchor conversa via texto "' + convTexts[t] + '"');
              return par;
            }
            node = par;
          }
        }
      }

      /* Fallback 1: aside / painel direito por posição */
      var panels = document.querySelectorAll('aside, section, [role="complementary"]');
      for (var i = 0; i < panels.length; i++) {
        var p = panels[i];
        if (!p.offsetParent) continue;
        var r = p.getBoundingClientRect();
        if (r.left > window.innerWidth * 0.45 && r.width > 180) {
          log('anchor conversa via painel direito posição');
          return p;
        }
      }

      /* Fallback 2: seletores CSS legados */
      var legacyConv = [
        '.contact-conversation-details', '.conversation-contact-details',
        '.contact-details-wrap', '.contact-card', '.conversation-details',
        '[class*="contact-details"]', '[class*="contact-info"]'
      ];
      for (var j = 0; j < legacyConv.length; j++) {
        var found = document.querySelector(legacyConv[j]);
        if (found && found.offsetParent) { log('anchor conversa legado', legacyConv[j]); return found; }
      }

    } else {
      /* ── Página de contato ── */
      /* 1. Textos de seção conhecidos */
      var contactTexts = [
        'Conversas anteriores', 'Previous Conversations',
        'Notas', 'Notes',
        'Informações', 'Information',
        'Atividade recente', 'Recent Activity'
      ];
      for (var t2 = 0; t2 < contactTexts.length; t2++) {
        for (var e2 = 0; e2 < allEls.length; e2++) {
          var el2 = allEls[e2];
          if (el2.children.length > 1) continue;
          if (el2.textContent.trim() !== contactTexts[t2]) continue;
          if (!el2.offsetParent) continue;
          var node2 = el2;
          for (var s2 = 0; s2 < 7; s2++) {
            var par2 = node2.parentElement;
            if (!par2 || par2 === document.body) break;
            if (par2.children.length >= 2) { log('anchor contato via texto "' + contactTexts[t2] + '"'); return par2; }
            node2 = par2;
          }
        }
      }

      /* 2. h1 (nome do contato) → container pai */
      var h1 = document.querySelector('h1');
      if (h1 && h1.offsetParent) {
        var node3 = h1;
        for (var s3 = 0; s3 < 5; s3++) {
          var par3 = node3.parentElement;
          if (!par3 || par3 === document.body) break;
          if (par3.children.length >= 2) { log('anchor contato via h1'); return par3; }
          node3 = par3;
        }
        return h1.parentElement;
      }

      /* 3. Seletores CSS legados */
      var legacyCt = [
        '.contact-info', '.contact-details',
        '[class*="contact-page"]', '[class*="contact-header"]', '.page-title'
      ];
      for (var k = 0; k < legacyCt.length; k++) {
        var el3 = document.querySelector(legacyCt[k]);
        if (el3 && el3.offsetParent) { log('anchor contato legado', legacyCt[k]); return el3; }
      }
    }

    return null;
  }

  /* ── Popover funil/etapa ─────────────────────────────────────────────── */
  function closePopover() {
    if (crmPopover) { crmPopover.remove(); crmPopover = null; }
  }

  function openPopover(anchorEl, contactData) {
    closePopover();

    var pop = document.createElement('div');
    pop.id = 'crm-popover';
    pop.innerHTML =
      '<div style="font-size:13px;font-weight:600;color:#1c2b33;margin-bottom:10px">' +
        '\uD83D\uDCCB Adicionar ao CRM' +
      '</div>' +
      '<div style="margin-bottom:8px">' +
        '<label>Funil</label>' +
        '<select id="crm-pop-funnel"><option value="">Selecione...</option></select>' +
      '</div>' +
      '<div style="margin-bottom:12px">' +
        '<label>Etapa</label>' +
        '<select id="crm-pop-stage" disabled><option value="">Selecione o funil...</option></select>' +
      '</div>' +
      '<div style="display:flex;gap:6px">' +
        '<button id="crm-pop-cancel">Cancelar</button>' +
        '<button id="crm-pop-add" disabled>Adicionar</button>' +
      '</div>' +
      '<div id="crm-pop-status" style="font-size:11px;margin-top:8px;text-align:center;display:none"></div>';

    document.body.appendChild(pop);
    crmPopover = pop;

    /* Posicionar abaixo do botão */
    var rect = anchorEl.getBoundingClientRect();
    var top  = rect.bottom + 6;
    var left = rect.left;
    /* Não sair da tela pela direita */
    if (left + 290 > window.innerWidth) left = window.innerWidth - 298;
    pop.style.top  = top  + 'px';
    pop.style.left = left + 'px';

    var funnelSel = document.getElementById('crm-pop-funnel');
    var stageSel  = document.getElementById('crm-pop-stage');
    var addBtn    = document.getElementById('crm-pop-add');
    var statusEl  = document.getElementById('crm-pop-status');

    /* Preencher funis */
    funnelsCache.forEach(function(f) {
      var opt = document.createElement('option');
      opt.value = f.id; opt.textContent = f.name;
      funnelSel.appendChild(opt);
    });

    /* Ao mudar funil → carrega etapas */
    funnelSel.addEventListener('change', function() {
      stageSel.innerHTML = '<option value="">Carregando...</option>';
      stageSel.disabled = true;
      addBtn.disabled = true;
      if (!funnelSel.value) { stageSel.innerHTML = '<option value="">Selecione o funil...</option>'; return; }
      fetchStages(funnelSel.value, function(stages) {
        stageSel.innerHTML = '<option value="">Selecione a etapa...</option>';
        stages.forEach(function(s) {
          var opt = document.createElement('option');
          opt.value = s.id; opt.textContent = s.name;
          stageSel.appendChild(opt);
        });
        stageSel.disabled = false;
      });
    });

    stageSel.addEventListener('change', function() {
      addBtn.disabled = !stageSel.value;
    });

    document.getElementById('crm-pop-cancel').addEventListener('click', closePopover);

    addBtn.addEventListener('click', function() {
      if (!funnelSel.value || !stageSel.value) return;
      addBtn.disabled = true;
      addBtn.textContent = 'Adicionando...';

      createLead(Number(funnelSel.value), Number(stageSel.value), contactData,
        function(err) {
          if (err) {
            statusEl.textContent = '\u274C Erro ao criar lead';
            statusEl.style.color = '#ef4444';
            statusEl.style.display = 'block';
            addBtn.disabled = false;
            addBtn.textContent = 'Adicionar';
          } else {
            statusEl.textContent = '\u2705 Lead criado com sucesso!';
            statusEl.style.color = '#10b981';
            statusEl.style.display = 'block';
            setTimeout(closePopover, 1400);
          }
        });
    });

    /* Fechar ao clicar fora */
    setTimeout(function() {
      document.addEventListener('click', function handler(e) {
        if (crmPopover && !crmPopover.contains(e.target) &&
            !(e.target.classList && e.target.classList.contains('crm-add-btn'))) {
          closePopover();
          document.removeEventListener('click', handler);
        }
      });
    }, 80);
  }

  /* ── Injetar botão no DOM ────────────────────────────────────────────── */
  var lastBtnUrl   = '';
  var btnRetries   = 0;
  var MAX_BTN_RETRIES = 20;

  function injectContactButton() {
    var ctx = parseUrl();
    if (!ctx.type) return;

    var currentUrl = window.location.href;
    /* Se já injetamos nessa URL, não duplicar */
    if (document.getElementById('crm-contact-btn') && currentUrl === lastBtnUrl) return;

    var anchor = findContactAnchor(ctx.type);
    if (!anchor) {
      btnRetries++;
      if (btnRetries < MAX_BTN_RETRIES) setTimeout(injectContactButton, 400);
      return;
    }
    btnRetries = 0;
    lastBtnUrl = currentUrl;

    /* Remove botão antigo se mudou de página */
    var old = document.getElementById('crm-contact-btn');
    if (old) old.remove();

    var contactData = extractContactData(ctx);

    var btn = document.createElement('button');
    btn.id = 'crm-contact-btn';
    btn.className = 'crm-add-btn';
    btn.innerHTML =
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
      '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
      ' CRM';

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      /* Re-extrair dados na hora do clique (DOM pode ter atualizado) */
      var fresh = extractContactData(ctx);
      /* Garantir que os funis estão carregados */
      if (!funnelsCache.length) {
        fetchFunnels(function() { openPopover(btn, fresh); });
      } else {
        openPopover(btn, fresh);
      }
    });

    /* Inserir no começo do anchor */
    if (anchor.firstChild) anchor.insertBefore(btn, anchor.firstChild);
    else anchor.appendChild(btn);

    log('\u2705 botão +CRM injetado (' + ctx.type + ')');
  }

  /* ── Monitorar navegação SPA ─────────────────────────────────────────── */
  function watchRoutes() {
    var lastUrl = window.location.href;

    function onUrlChange() {
      var cur = window.location.href;
      if (cur === lastUrl) return;
      lastUrl = cur;
      btnRetries = 0;
      /* Pequeno delay para o Vue renderizar o novo componente */
      setTimeout(injectContactButton, 600);
      setTimeout(injectContactButton, 1200);
    }

    window.addEventListener('hashchange', onUrlChange);
    window.addEventListener('popstate', onUrlChange);

    /* Detecta navegação sem eventos (pushState do Vue Router) */
    new MutationObserver(onUrlChange)
      .observe(document.body, { childList: true, subtree: true });
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * BOOTSTRAP
   * ═══════════════════════════════════════════════════════════════════════ */
  /* Re-injeção sidebar após SPA navigation */
  new MutationObserver(function() {
    if (!document.getElementById('crm-sidebar-group') && findInsertionPoint()) injectSidebar();
  }).observe(document.documentElement, { childList: true, subtree: true });

  /* Retry periódico para o sidebar */
  var interval = setInterval(function() {
    retryCount++;
    if (document.getElementById('crm-sidebar-group')) { clearInterval(interval); return; }
    injectSidebar();
    if (retryCount >= MAX_RETRIES) clearInterval(interval);
  }, 500);

  function boot() {
    log('iniciando v3.1');
    injectStyles();
    ensurePanel();
    injectSidebar();
    watchRoutes();
    /* Tenta injetar botão de contato na página atual */
    setTimeout(injectContactButton, 800);
    setTimeout(injectContactButton, 1800);
  }

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot);

})();
