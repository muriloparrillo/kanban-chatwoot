/**
 * Kanban/CRM Inject v4.5
 * - getSidebarWidth: 3 strategies (main content left edge, walk-up, CSS selector)
 * - extractContactFromDOM: multi-strategy name extraction (link text + DOM scan)
 * - Sidebar: CRM primeiro no nav de nível superior
 * - Painel: left = largura real do sidebar (não cobre o nav)
 * - Funções Extras: botão no header da conversa junto ao "Resolver"
 * - Modal: menu principal → Associar ao Funil → Funil picker → Stage picker
 */
(function () {
  'use strict';

  /* ─── CONFIG ─────────────────────────────────────────────────────────── */
  var KANBAN_URL    = 'https://vai-novofoco-kanban-chatwoot-frontend.dutk9f.easypanel.host';
  var ACCOUNT_TOKEN = '0fb0a7572850a512f7127633a15e844673bd3e6cf839fa75';
  var DEBUG         = true;

  /* Não injetar no console super_admin do Chatwoot */
  if (/\/super_admin/i.test(window.location.pathname)) return;

  if (window.__crmInjected) return;
  window.__crmInjected = true;

  /* ─── HELPERS DE ISOLAMENTO ─────────────────────────────────────────── */
  /* Extrai o ID da conta Chatwoot da URL atual (ex: /app/accounts/2/...) */
  function getChatwootAccountId() {
    var m = window.location.href.match(/\/accounts\/(\d+)/);
    return m ? m[1] : null;
  }

  /* Cabeçalhos para todas as requests CRM — inclui X-Chatwoot-Account-Id */
  function apiHeaders() {
    var h = { 'X-Account-Token': ACCOUNT_TOKEN };
    var cwId = getChatwootAccountId();
    if (cwId) h['X-Chatwoot-Account-Id'] = cwId;
    return h;
  }

  /* ─── ESTADO ─────────────────────────────────────────────────────────── */
  var menuOpen       = true;
  var currentFunnelId = null;
  var panelEl        = null;
  var retryCount     = 0;
  var MAX_RETRIES    = 80;
  var funnelsCache   = [];
  var stagesCache    = {};
  var modalEl        = null;
  var lastHeaderUrl  = '';
  var headerBtnRetry = 0;
  var sidebarTimer   = null;

  function log() {
    if (!DEBUG) return;
    var a = Array.prototype.slice.call(arguments);
    a.unshift('[CRM]');
    console.log.apply(console, a);
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * ESTILOS
   * ═══════════════════════════════════════════════════════════════════════ */
  function injectStyles() {
    if (document.getElementById('crm-inject-style')) return;
    var s = document.createElement('style');
    s.id = 'crm-inject-style';
    s.textContent = [
      /*
       * PAINEL BOARD — arquitetura pointer-events:
       * #crm-panel    : cobre tela inteira, pointer-events:none → cliques passam pelo sidebar
       * #crm-panel-content : área visível real, pointer-events:all, left dinâmico via JS
       * Isso garante que o sidebar SEMPRE seja clicável mesmo se left for mal calculado.
       */
      '#crm-panel{position:fixed;inset:0;z-index:9000;display:none;pointer-events:none}',
      '#crm-panel.crm-open{display:block}',
      '#crm-panel-content{position:absolute;top:0;bottom:0;right:0;left:292px;',
      'pointer-events:all;display:flex;flex-direction:column;background:#fff;',
      'box-shadow:-3px 0 12px rgba(0,0,0,.18)}',
      'html.dark #crm-panel-content{background:#1c2b33}',
      '#crm-panel-content iframe{flex:1;width:100%;border:none}',
      '#crm-panel-bar{display:flex;align-items:center;justify-content:space-between;',
      'padding:6px 14px;min-height:40px;background:#f8f9fa;border-bottom:1px solid #e4e7ed}',
      '#crm-panel-bar span{font-size:13px;font-weight:600;color:#1c2b33}',
      '#crm-panel-close{background:none;border:none;cursor:pointer;padding:4px 8px;',
      'border-radius:6px;font-size:16px;color:#6b7280;line-height:1}',
      '#crm-panel-close:hover{background:#e4e7ed;color:#1c2b33}',
      'html.dark #crm-panel-bar{background:#243641;border-color:#3a4a54}',
      'html.dark #crm-panel-bar span{color:#e5eef3}',

      /* ── sidebar grupo CRM ── */
      '#crm-sidebar-group{width:100%;box-sizing:border-box;padding:0;margin:0}',
      '#crm-group-header{display:flex;align-items:center;justify-content:space-between;',
      'padding:8px 12px;border-radius:8px;cursor:pointer;color:#3d4f58;font-size:13px;',
      'font-weight:500;width:100%;background:none;border:none;box-sizing:border-box;text-align:left;',
      'transition:background .15s,color .15s}',
      '#crm-group-header:hover{background:rgba(31,147,255,.07);color:#1f93ff}',
      '#crm-group-header.crm-active{color:#1f93ff}',
      'html.dark #crm-group-header{color:#9babb4}',
      'html.dark #crm-group-header:hover{background:rgba(31,147,255,.1);color:#1f93ff}',
      '#crm-header-left{display:flex;align-items:center;gap:8px;min-width:0}',
      '#crm-chevron{transition:transform .2s;flex-shrink:0;opacity:.55}',
      '#crm-chevron.open{transform:rotate(90deg)}',
      '#crm-funnel-list{list-style:none;margin:0;padding:0 0 4px 0;display:none;flex-direction:column}',
      '#crm-funnel-list.open{display:flex}',
      '.crm-funnel-item{display:flex;align-items:center;padding:6px 12px 6px 32px;',
      'border-radius:6px;font-size:13px;color:#3d4f58;cursor:pointer;background:none;',
      'border:none;width:100%;text-align:left;transition:background .12s,color .12s;box-sizing:border-box}',
      '.crm-funnel-item:hover{background:rgba(31,147,255,.07);color:#1f93ff}',
      '.crm-funnel-item.crm-active{background:rgba(31,147,255,.12);color:#1f93ff;font-weight:500}',
      'html.dark .crm-funnel-item{color:#9babb4}',
      'html.dark .crm-funnel-item:hover{background:rgba(31,147,255,.1);color:#1f93ff}',
      '.crm-nav-disabled{opacity:.45;cursor:not-allowed!important}',
      '.crm-nav-disabled:hover{background:none!important;color:inherit!important}',
      '.crm-funnel-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;',
      'background:#1f93ff;margin-right:8px;display:inline-block}',
      '.crm-skeleton{height:24px;border-radius:6px;background:#e4e7ed;',
      'margin:2px 8px;animation:crm-pulse 1.2s ease infinite}',
      'html.dark .crm-skeleton{background:#2e404c}',
      '@keyframes crm-pulse{0%,100%{opacity:1}50%{opacity:.4}}',

      /* ── botão Funções Extras (header conversa) ── */
      '#crm-extras-btn{display:inline-flex;align-items:center;gap:5px;',
      'padding:5px 12px;border-radius:6px;border:1px solid #e4e7ed;background:#fff;',
      'color:#3d4f58;font-size:13px;font-weight:500;cursor:pointer;margin-right:8px;',
      'transition:background .12s,border-color .12s,color .12s;white-space:nowrap;vertical-align:middle}',
      '#crm-extras-btn:hover{background:#f3f4f6;border-color:#1f93ff;color:#1f93ff}',
      'html.dark #crm-extras-btn{background:#243641;border-color:#3a4a54;color:#9babb4}',
      'html.dark #crm-extras-btn:hover{border-color:#1f93ff;color:#1f93ff}',

      /* ── modal overlay ── */
      '#crm-modal-overlay{position:fixed;inset:0;z-index:10100;',
      'background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center}',
      '#crm-modal{background:#fff;border-radius:12px;width:440px;max-width:92vw;',
      'box-shadow:0 20px 60px rgba(0,0,0,.22);overflow:hidden}',
      'html.dark #crm-modal{background:#1e2d35;color:#e5eef3}',
      '#crm-modal-header{display:flex;align-items:center;justify-content:space-between;',
      'padding:16px 20px;border-bottom:1px solid #e4e7ed;',
      'font-weight:600;font-size:15px;color:#1c2b33}',
      'html.dark #crm-modal-header{border-color:#2e404c;color:#e5eef3}',
      '#crm-modal-close-btn{background:none;border:none;cursor:pointer;font-size:18px;',
      'color:#6b7280;padding:2px 8px;border-radius:4px;line-height:1;flex-shrink:0}',
      '#crm-modal-close-btn:hover{background:#f3f4f6;color:#1c2b33}',
      'html.dark #crm-modal-close-btn:hover{background:#2e404c}',
      '#crm-modal-body{padding:12px;max-height:60vh;overflow-y:auto}',

      /* ── opções do menu principal ── */
      '.crm-extra-option{display:flex;align-items:center;gap:12px;width:100%;',
      'padding:12px 14px;border-radius:8px;border:none;background:none;cursor:pointer;',
      'text-align:left;transition:background .12s;margin-bottom:4px}',
      '.crm-extra-option:hover:not(.crm-opt-disabled){background:#f8f9fa}',
      'html.dark .crm-extra-option:hover:not(.crm-opt-disabled){background:#243641}',
      '.crm-extra-option.crm-opt-disabled{opacity:.38;cursor:not-allowed}',
      '.crm-opt-icon{font-size:18px;flex-shrink:0;width:38px;height:38px;',
      'display:flex;align-items:center;justify-content:center;',
      'background:#f3f4f6;border-radius:8px}',
      'html.dark .crm-opt-icon{background:#2e404c}',
      '.crm-opt-info{flex:1;min-width:0}',
      '.crm-opt-title{font-size:13px;font-weight:600;color:#1c2b33;margin-bottom:2px}',
      'html.dark .crm-opt-title{color:#e5eef3}',
      '.crm-opt-desc{font-size:11px;color:#6b7280}',
      '.crm-opt-arrow{color:#9babb4;font-size:18px;line-height:1;flex-shrink:0}',

      /* ── picker (funil / etapa) ── */
      '.crm-modal-back-btn{background:none;border:none;cursor:pointer;color:#1f93ff;',
      'font-size:13px;padding:0;display:flex;align-items:center;gap:3px}',
      '.crm-picker-title{font-size:11px;color:#6b7280;margin-bottom:8px;font-weight:600;',
      'text-transform:uppercase;letter-spacing:.05em;padding:0 4px}',
      '.crm-picker-item{display:flex;align-items:center;gap:10px;width:100%;',
      'padding:10px 12px;border-radius:8px;border:none;background:none;cursor:pointer;',
      'text-align:left;transition:background .12s;margin-bottom:2px}',
      '.crm-picker-item:hover{background:#f3f4f6}',
      'html.dark .crm-picker-item:hover{background:#243641}',
      '.crm-picker-name{flex:1;font-size:13px;font-weight:500;color:#1c2b33}',
      'html.dark .crm-picker-name{color:#e5eef3}',
      '.crm-picker-meta{font-size:11px;color:#9babb4}',

      /* ── status messages ── */
      '.crm-status-msg{text-align:center;padding:24px 0}',
      '.crm-status-icon{font-size:36px;margin-bottom:10px}',
      '.crm-status-title{font-size:14px;font-weight:600;color:#1c2b33;margin-bottom:4px}',
      'html.dark .crm-status-title{color:#e5eef3}',
      '.crm-status-sub{font-size:12px;color:#6b7280}'
    ].join('');
    (document.head || document.getElementsByTagName('head')[0]).appendChild(s);
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * PAINEL BOARD (iframe)
   * ═══════════════════════════════════════════════════════════════════════ */
  function getSidebarWidth() {
    var vpW = window.innerWidth;

    /*
     * Estratégia 1: borda esquerda da área de conteúdo principal.
     * No Chatwoot o sidebar termina exatamente onde o conteúdo começa.
     * Qualquer um desses seletores começando em x ≥ 150px é o limite real.
     */
    var mainSels = [
      '.conversations-list-wrap',
      '.conversation-list',
      'div[class*="conversations-list"]',
      'div[class*="conversation-list"]',
      '.view-box',
      'div[class*="view-box"]',
      '.reports-overview',
      'div[class*="reports-overview"]',
      '.contacts-page',
      'div[class*="contacts-page"]',
      '.app-content',
      'main[role="main"]',
      '.campaigns-table-wrap',
      'div[class*="campaigns"]',
      '.help-center',
      'div[class*="help-center"]'
    ];
    for (var i = 0; i < mainSels.length; i++) {
      var mc = document.querySelector(mainSels[i]);
      if (!mc || !mc.offsetParent) continue;
      var rm = mc.getBoundingClientRect();
      /* Deve começar entre 150 px e 60 % do viewport */
      if (rm.left >= 150 && rm.left <= vpW * 0.6) {
        log('getSidebarWidth[1]', mainSels[i], '=', Math.round(rm.left));
        return Math.round(rm.left);
      }
    }

    /*
     * Estratégia 2: subir a partir de #crm-sidebar-group até encontrar
     * o container que encosta na borda esquerda E tem ≥ 200 px de largura.
     * Aumentado de 14 para 20 iterações e threshold de right ≥ 200.
     */
    var group = document.getElementById('crm-sidebar-group');
    if (group) {
      var node = group;
      for (var s = 0; s < 20; s++) {
        var p = node.parentElement;
        if (!p || p === document.body || p === document.documentElement) break;
        var rp = p.getBoundingClientRect();
        if (rp.left <= 4 && rp.right >= 200 && rp.right <= vpW * 0.55 && rp.height > 200) {
          log('getSidebarWidth[2] walk-up =', Math.round(rp.right));
          return Math.round(rp.right);
        }
        node = p;
      }
    }

    /* Estratégia 3: seletores explícitos do Chatwoot */
    var sbSels = [
      '.woot-sidebar', 'aside.woot-sidebar', 'nav.woot-sidebar',
      'aside[class*="sidebar"]', 'nav[class*="sidebar"]'
    ];
    for (var j = 0; j < sbSels.length; j++) {
      var sb = document.querySelector(sbSels[j]);
      if (!sb || !sb.offsetParent) continue;
      var rs = sb.getBoundingClientRect();
      if (rs.left <= 4 && rs.right >= 200 && rs.right <= vpW * 0.55) {
        log('getSidebarWidth[3]', sbSels[j], '=', Math.round(rs.right));
        return Math.round(rs.right);
      }
    }

    log('getSidebarWidth: fallback 292');
    return 292;
  }

  /*
   * Versão mais confiável: parte de um elemento que SABEMOS estar no sidebar.
   * Percorre os ancestrais e retorna a largura do mais LARGO container que
   * toca a borda esquerda — garantidamente o sidebar completo, não só o rail.
   */
  function getSidebarWidthFromEl(el) {
    var vpW = window.innerWidth;
    var best = 0;
    var node = el;
    for (var i = 0; i < 24; i++) {
      var p = node.parentElement;
      if (!p || p === document.body || p === document.documentElement) break;
      var r = p.getBoundingClientRect();
      /* Container que encosta na borda esquerda e é estreito o suficiente para ser sidebar */
      if (r.left <= 4 && r.right >= 150 && r.right <= vpW * 0.55) {
        best = Math.max(best, Math.round(r.right)); /* pega o MAIS LARGO */
      }
      node = p;
    }
    var result = best >= 150 ? best : getSidebarWidth();
    log('getSidebarWidthFromEl =', result);
    return result;
  }

  function ensurePanel() {
    if (panelEl || !document.body) return;
    panelEl = document.createElement('div');
    panelEl.id = 'crm-panel';
    /*
     * #crm-panel-content é o container VISÍVEL com pointer-events:all.
     * O wrapper #crm-panel tem pointer-events:none e cobre a tela inteira,
     * então cliques no sidebar passam por ele independente do left calculado.
     */
    panelEl.innerHTML =
      '<div id="crm-panel-content">' +
        '<div id="crm-panel-bar">' +
          '<span>CRM</span>' +
          '<button id="crm-panel-close" title="Fechar (Esc)">\u2715</button>' +
        '</div>' +
        '<iframe id="crm-iframe" src="" allow="*" title="CRM Kanban"></iframe>' +
      '</div>';
    document.body.appendChild(panelEl);
    document.getElementById('crm-panel-close').addEventListener('click', closePanel);
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closePanel(); });
  }

  function openPanel(funnelId, sourceEl) {
    if (!panelEl) ensurePanel();
    /* Seta left no #crm-panel-content (não no wrapper) */
    var w = sourceEl ? getSidebarWidthFromEl(sourceEl) : getSidebarWidth();
    var content = document.getElementById('crm-panel-content');
    if (content) content.style.left = w + 'px';

    var iframe = document.getElementById('crm-iframe');
    if (!iframe) return;
    var cwId = getChatwootAccountId();
    var url = KANBAN_URL + '/?account_token=' + ACCOUNT_TOKEN + '&embedded=true';
    if (cwId) url += '&cw_account_id=' + cwId;
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
    if (funnelsCache.length) { cb(funnelsCache); return; }
    fetch(KANBAN_URL + '/api/v1/funnels', {
      headers: apiHeaders()
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      funnelsCache = Array.isArray(d) ? d : (d.funnels || []);
      cb(funnelsCache);
    })
    .catch(function(e) { log('fetchFunnels err', e); cb([]); });
  }

  function fetchStages(funnelId, cb) {
    if (stagesCache[funnelId]) { cb(stagesCache[funnelId]); return; }
    fetch(KANBAN_URL + '/api/v1/boards/' + funnelId, {
      headers: apiHeaders()
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      stagesCache[funnelId] = d.stages || [];
      cb(stagesCache[funnelId]);
    })
    .catch(function() { cb([]); });
  }

  /*
   * Extrai dados do contato a partir do DOM do Chatwoot.
   * Nome: múltiplas estratégias pois o Chatwoot pode exibir o nome em elemento
   * que NÃO é o <a href="/contacts/ID"> (o link costuma ser um ícone ↗).
   */
  function extractContactFromDOM() {
    var result = { name: '', contactId: null, email: '', phone: '' };
    var vpW = window.innerWidth;

    /* ── Telefone ── */
    var phoneEl = document.querySelector('[href^="tel:"]');
    if (phoneEl) result.phone = (phoneEl.textContent || '').trim().replace(/[^\d+]/g, '');

    /* ── E-mail ── */
    var emailEl = document.querySelector('[href^="mailto:"]');
    if (emailEl) result.email = (emailEl.textContent || '').trim() ||
                                 (emailEl.href || '').replace('mailto:', '');

    /* ── ID do contato + nome via texto do link ── */
    var links = document.querySelectorAll('a[href*="/contacts/"]');
    var bestLink = null, bestLeft = -1;
    for (var i = 0; i < links.length; i++) {
      var lk = links[i];
      if (!lk.offsetParent) continue;
      var href = lk.getAttribute('href') || '';
      var idM  = href.match(/\/contacts\/(\d+)/);
      if (!idM) continue;
      var lr = lk.getBoundingClientRect();
      if (lr.left > bestLeft) { bestLeft = lr.left; bestLink = { el: lk, id: idM[1] }; }
    }
    if (bestLink) {
      result.contactId = bestLink.id;
      var lkTxt = (bestLink.el.textContent || '').trim();
      /* Só usa o texto do link como nome se for uma string real, não um ícone */
      if (lkTxt.length >= 2 && lkTxt.length <= 80 && /[a-zA-ZÀ-ÿ]{2,}/.test(lkTxt) && !lkTxt.includes('@')) {
        result.name = lkTxt;
      }
    }

    /* ── Nome: escaneamento DOM próximo ao tel:/mailto: ── */
    if (!result.name) {
      var anchor = phoneEl || emailEl;
      if (anchor && anchor.offsetParent) {
        var anchorRect = anchor.getBoundingClientRect();
        /* Também pula valores "vazios" que o Chatwoot exibe quando info não disponível */
        var SKIP = /^(conversas?|contacts?|contatos?|settings?|config|crm|kanban|reports?|campanhas?|ajuda|help|agenda|participants?|participantes?|indispon[ií]vel|unavailable|n\/a|—|--)$/i;
        var node = anchor.parentElement;
        var depth = 0;

        while (node && node !== document.body && depth < 14) {
          var candidates = node.querySelectorAll(
            'h1,h2,h3,h4,h5,span,strong,b,p,' +
            '[class*="name"],[class*="contact"],[class*="title"]'
          );
          var bestName = '', bestTop = -Infinity;

          for (var k = 0; k < candidates.length; k++) {
            var ce = candidates[k];
            if (!ce.offsetParent) continue;
            /* Pula containers com muitos filhos */
            if (ce.children.length > 3) continue;
            var cTxt = (ce.textContent || '').trim();
            var cRect = ce.getBoundingClientRect();

            if (
              cTxt.length < 2 || cTxt.length > 80 ||
              !(/[a-zA-ZÀ-ÿ]{2,}/.test(cTxt)) ||
              cTxt.includes('@') ||
              /^[\+\d\s\-\(\)\.]+$/.test(cTxt) ||   /* só números/telefone */
              cRect.left < vpW * 0.35 ||              /* deve estar no painel direito */
              cRect.top > anchorRect.top + 30         /* não pode ser muito abaixo */
            ) continue;
            if (SKIP.test(cTxt.trim())) continue;

            /* Prefere o elemento mais próximo (abaixo) do topo, mas acima do anchor */
            if (cRect.top > bestTop) { bestTop = cRect.top; bestName = cTxt; }
          }

          if (bestName) { result.name = bestName; break; }
          node = node.parentElement;
          depth++;
        }
      }
    }

    /* ── Nome: fallback via seletores de classe do Chatwoot ── */
    if (!result.name) {
      var classSels = [
        '[class*="contact-name"]', '[class*="contactName"]',
        '[class*="contact--name"]', '[class*="contact_name"]',
        '[class*="conversation--contact"]'
      ];
      for (var cs = 0; cs < classSels.length; cs++) {
        var cEl = document.querySelector(classSels[cs]);
        if (!cEl || !cEl.offsetParent) continue;
        var cT = (cEl.textContent || '').trim();
        var SKIP2 = /^(indispon[ií]vel|unavailable|n\/a|—|--)$/i;
        if (cT.length >= 2 && cT.length <= 80 && /[a-zA-ZÀ-ÿ]{2,}/.test(cT) && !SKIP2.test(cT)) {
          result.name = cT;
          break;
        }
      }
    }

    log('contact extracted:', JSON.stringify(result));
    return result;
  }

  function createLeadForConversation(funnelId, stageId, cb) {
    var url = window.location.href;
    var cm  = url.match(/\/conversations\/(\d+)/);
    var conversationId = cm ? cm[1] : null;

    var contact   = extractContactFromDOM();
    var contactId = contact.contactId;
    /* Título: preferência nome real → "Conversa #ID — telefone" → ID aleatório */
    var name;
    if (contact.name && contact.name.length >= 2) {
      name = contact.name;
    } else if (conversationId) {
      name = 'Conversa #' + conversationId;
      if (contact.phone) name += ' \u2014 ' + contact.phone;
    } else if (contact.phone) {
      name = contact.phone;
    } else {
      name = 'Lead ' + Math.random().toString(36).substr(2, 4).toUpperCase();
    }

    fetch(KANBAN_URL + '/api/v1/leads', {
      method: 'POST',
      headers: Object.assign({}, apiHeaders(), { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        lead: {
          funnel_id: Number(funnelId),
          stage_id: Number(stageId),
          title: name,
          contact_name:  contact.name  || null,
          contact_email: contact.email || null,
          contact_phone: contact.phone || null,
          chatwoot_conversation_id: conversationId ? Number(conversationId) : null,
          chatwoot_contact_id: contactId ? Number(contactId) : null,
          source: 'manual'
        }
      })
    })
    .then(function(r) {
      if (!r.ok) return r.json().then(function(d) { throw d; });
      return r.json();
    })
    .then(function(d) { cb(null, d); })
    .catch(function(e) { cb(e, null); });
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * SIDEBAR CRM
   * ═══════════════════════════════════════════════════════════════════════ */
  var CRM_ICON =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">' +
    '<rect x="2" y="3" width="4" height="18" rx="1.2"/>' +
    '<rect x="9" y="3" width="4" height="12" rx="1.2"/>' +
    '<rect x="16" y="3" width="4" height="15" rx="1.2"/></svg>';

  var CHEVRON_ICON =
    '<svg id="crm-chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<polyline points="9 18 15 12 9 6"/></svg>';

  function updateActiveItem() {
    updateActiveNavItem(currentNavMode);
  }

  /* Cache dos funis para uso nas ações de nav */
  var funnelListCache = [];

  function openPanelWithView(viewMode, sourceEl) {
    /* Determina o funil padrão */
    var funnelId = funnelListCache.length ? funnelListCache[0].id : null;

    /* Calcula largura do sidebar a partir do elemento clicado — mais confiável */
    var w = sourceEl ? getSidebarWidthFromEl(sourceEl) : getSidebarWidth();
    var content = document.getElementById('crm-panel-content');
    if (content) content.style.left = w + 'px';

    if (!panelEl) ensurePanel();
    var iframe = document.getElementById('crm-iframe');
    if (!iframe) return;

    var cwId = getChatwootAccountId();
    var url  = KANBAN_URL + '/?account_token=' + ACCOUNT_TOKEN + '&embedded=true';
    if (cwId)   url += '&cw_account_id=' + cwId;
    if (viewMode === 'products') {
      url += '#/settings/products';
    } else if (viewMode === 'agenda') {
      url += '#/agenda';
    } else if (funnelId) {
      url += '#/board/' + funnelId;
    } else {
      url += '#/board';
    }

    if (iframe.src !== url) iframe.src = url;
    currentFunnelId = funnelId || null;
    panelEl.classList.add('crm-open');
    updateActiveNavItem(viewMode);
  }

  var currentNavMode = 'kanban';
  function updateActiveNavItem(mode) {
    currentNavMode = mode || 'kanban';
    var items = document.querySelectorAll('.crm-nav-item');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('crm-active', items[i].getAttribute('data-nav') === currentNavMode);
    }
    var h = document.getElementById('crm-group-header');
    if (h) h.classList.toggle('crm-active', panelEl && panelEl.classList.contains('crm-open'));
  }

  /* ── Ícones SVG sem emoji (estilo Chatwoot) ── */
  var NAV_ICONS = {
    funnels: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><rect x="2" y="3" width="4" height="18" rx="1.2"/><rect x="9" y="3" width="4" height="12" rx="1.2"/><rect x="16" y="3" width="4" height="15" rx="1.2"/></svg>',
    products:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    agenda:  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
  };

  function populateFunnels(list) {
    funnelListCache = list;
    var ul = document.getElementById('crm-funnel-list');
    if (!ul) return;
    ul.innerHTML = '';

    /* ── Items de navegação fixos ── */
    var navDefs = [
      { id: 'funnels',  icon: NAV_ICONS.funnels,  label: 'Funis',            mode: 'funnels',  disabled: false },
      { id: 'products', icon: NAV_ICONS.products, label: 'Produtos / Serv.', mode: 'products', disabled: false },
      { id: 'agenda',   icon: NAV_ICONS.agenda,   label: 'Agenda',           mode: 'agenda',   disabled: false }
    ];

    navDefs.forEach(function(def) {
      var li  = document.createElement('li');
      var btn = document.createElement('button');
      btn.className = 'crm-funnel-item crm-nav-item' + (def.disabled ? ' crm-nav-disabled' : '');
      btn.setAttribute('data-nav', def.id);
      btn.disabled = def.disabled;
      btn.innerHTML =
        def.icon +
        '<span style="margin-left:8px">' + def.label + '</span>' +
        (def.disabled ? '<span style="font-size:10px;color:#9babb4;margin-left:auto">(em breve)</span>' : '');
      if (!def.disabled) {
        btn.addEventListener('click', (function(mode) {
          return function(e) {
            e.stopPropagation();
            openPanelWithView(mode, this);
          };
        })(def.mode));
      }
      li.appendChild(btn);
      ul.appendChild(li);
    });

    log('nav CRM montado | funis disponíveis:', list.length);
  }

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
    /*
     * Busca SOMENTE labels de nível superior do nav (não sub-itens
     * como "Caixa de Entrada" que ficam dentro de "Conversas").
     * Insere sempre como PRIMEIRO filho do container encontrado.
     */
    var allEls = document.querySelectorAll('span, a, button, li, div');
    var topTexts = [
      'Conversas',     'Conversations',
      'Contatos',      'Contacts',
      'Relatórios',    'Reports',
      'Campanhas',     'Campaigns',
      'Central de Ajuda', 'Help Center',
      'Configurações', 'Settings'
    ];

    for (var t = 0; t < topTexts.length; t++) {
      for (var e = 0; e < allEls.length; e++) {
        var el = allEls[e];
        /* Apenas folhas ou elementos com único filho SVG */
        var hasOnlySvg = el.children.length === 1 &&
                         (el.children[0].tagName || '').toUpperCase() === 'SVG';
        if (el.children.length > 0 && !hasOnlySvg) continue;
        if (el.textContent.trim() !== topTexts[t]) continue;
        if (!el.offsetParent) continue;

        /* Sobe até encontrar um container COLUNA com ≥3 filhos */
        var node = el;
        for (var steps = 0; steps < 14; steps++) {
          var parent = node.parentElement;
          if (!parent || parent === document.body) break;
          if (parent.children.length >= 3 && isColumnContainer(parent)) {
            log('inserção via "' + topTexts[t] + '" | ' + parent.tagName +
                ' ' + window.getComputedStyle(parent).display + ' | filhos:' + parent.children.length);
            return { container: parent, before: parent.firstChild };
          }
          node = parent;
        }
      }
    }

    /* Fallback via hrefs de itens de nível superior */
    var hrefs = [
      'a[href*="/contacts"]', 'a[href*="/reports"]', 'a[href*="/campaigns"]'
    ];
    for (var i = 0; i < hrefs.length; i++) {
      var link = document.querySelector(hrefs[i]);
      if (!link || !link.offsetParent) continue;
      var n = link;
      for (var s = 0; s < 12; s++) {
        var p = n.parentElement;
        if (!p || p === document.body) break;
        if (p.children.length >= 3 && isColumnContainer(p)) {
          log('inserção via href', hrefs[i]);
          return { container: p, before: p.firstChild };
        }
        n = p;
      }
    }

    /* Fallback genérico */
    var fb = ['aside nav', '.woot-sidebar nav', '.woot-sidebar', 'aside'];
    for (var j = 0; j < fb.length; j++) {
      var found = document.querySelector(fb[j]);
      if (found) { log('fallback:', fb[j]); return { container: found, before: found.firstChild }; }
    }
    return null;
  }

  function injectSidebar() {
    if (document.getElementById('crm-sidebar-group')) return;
    injectStyles();
    ensurePanel();

    var pt = findInsertionPoint();
    if (!pt) { log('ponto de inserção não encontrado'); return; }

    var group = document.createElement('div');
    group.id = 'crm-sidebar-group';
    group.innerHTML =
      '<button id="crm-group-header">' +
        '<div id="crm-header-left">' + CRM_ICON + '<span>CRM</span></div>' +
        CHEVRON_ICON +
      '</button>' +
      '<ul id="crm-funnel-list">' +
        '<li class="crm-skeleton" style="height:22px"></li>' +
        '<li class="crm-skeleton" style="height:22px;width:70%;margin-top:2px"></li>' +
      '</ul>';

    if (pt.before) pt.container.insertBefore(group, pt.before);
    else pt.container.appendChild(group);

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
    log('sidebar CRM injetado');
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * BOTÃO "FUNÇÕES EXTRAS" — junto ao "Resolver" no header da conversa
   * ═══════════════════════════════════════════════════════════════════════ */
  function findResolverButton() {
    var all = document.querySelectorAll('button, [role="button"]');
    for (var i = 0; i < all.length; i++) {
      var btn = all[i];
      if (!btn.offsetParent) continue;
      var txt = (btn.textContent || '').trim();
      /* Match exato ou starts-with para cobrir "Resolver ▾" */
      if (txt === 'Resolver' || txt === 'Resolve' ||
          txt === 'Reopen' || txt === 'Reabrir' ||
          txt.startsWith('Resolver') || txt.startsWith('Resolve')) {
        return btn;
      }
    }
    return null;
  }

  function injectHeaderButton() {
    var url    = window.location.href;
    var isConv = /\/conversations\/\d+/.test(url) ||
                 /\/inbox-view/.test(url) ||
                 /\/dashboard/.test(url) ||
                 /\/mentions/.test(url) ||
                 /\/notifications/.test(url);

    /* Remove botão antigo se a URL mudou */
    var existingBtn = document.getElementById('crm-extras-btn');
    if (existingBtn) {
      if (existingBtn.offsetParent && url === lastHeaderUrl) return; /* ainda válido */
      existingBtn.remove();
    }

    if (!isConv) return;

    var resolverBtn = findResolverButton();
    if (!resolverBtn) {
      headerBtnRetry++;
      if (headerBtnRetry < 40) setTimeout(injectHeaderButton, 400);
      return;
    }
    headerBtnRetry = 0;
    lastHeaderUrl  = url;

    var btn = document.createElement('button');
    btn.id = 'crm-extras-btn';
    btn.innerHTML =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="12" r="3"/>' +
      '<path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>' +
      '<path d="M4.93 4.93a10 10 0 0 0 0 14.14"/>' +
      '</svg> Fun\u00e7\u00f5es Extras';

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      openExtrasModal();
    });

    /*
     * Inserção: sobe do botão "Resolver" até achar seu container direto
     * na barra de ações (geralmente um div com múltiplos filhos).
     * Insere o botão ANTES desse container.
     */
    var target = resolverBtn;
    var par = resolverBtn.parentElement;
    /* Se está num split-button (wrapper com poucos filhos), usa o wrapper */
    if (par && par.children.length <= 3 && par !== document.body) target = par;

    if (target.parentElement) {
      target.parentElement.insertBefore(btn, target);
      log('Funcoes Extras injetado');
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * MODAL — FUNÇÕES EXTRAS
   * ═══════════════════════════════════════════════════════════════════════ */
  function closeModal() {
    if (modalEl) { modalEl.remove(); modalEl = null; }
  }

  function bindClose() {
    var closeBtn = document.getElementById('crm-modal-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modalEl) modalEl.addEventListener('click', function(e) {
      if (e.target === modalEl) closeModal();
    });
  }

  function openExtrasModal() {
    closeModal();
    modalEl = document.createElement('div');
    modalEl.id = 'crm-modal-overlay';
    modalEl.innerHTML =
      '<div id="crm-modal">' +
        '<div id="crm-modal-header">' +
          '<span>Fun\u00e7\u00f5es Extras</span>' +
          '<button id="crm-modal-close-btn">\u2715</button>' +
        '</div>' +
        '<div id="crm-modal-body"></div>' +
      '</div>';
    document.body.appendChild(modalEl);
    bindClose();
    renderMainMenu();
  }

  function setModalHeader(leftHtml, showClose) {
    var header = document.getElementById('crm-modal-header');
    if (!header) return;
    header.innerHTML = leftHtml + (showClose !== false
      ? '<button id="crm-modal-close-btn">\u2715</button>'
      : '');
    bindClose();
  }

  /* ── Menu principal ── */
  function renderMainMenu() {
    setModalHeader('<span>Fun\u00e7\u00f5es Extras</span>');

    var body = document.getElementById('crm-modal-body');
    if (!body) return;

    var ICON_FUNNEL =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="2" y="3" width="4" height="18" rx="1.2"/><rect x="9" y="3" width="4" height="12" rx="1.2"/><rect x="16" y="3" width="4" height="15" rx="1.2"/></svg>';
    var ICON_CLOCK =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
    var ICON_FLOW =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>';
    var ICON_CAL =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';

    body.innerHTML =
      '<button class="crm-extra-option" id="crm-opt-funil">' +
        '<div class="crm-opt-icon">' + ICON_FUNNEL + '</div>' +
        '<div class="crm-opt-info">' +
          '<div class="crm-opt-title">Associar ao Funil</div>' +
          '<div class="crm-opt-desc">Vincular conversa a uma etapa do kanban</div>' +
        '</div>' +
        '<span class="crm-opt-arrow">\u203A</span>' +
      '</button>' +
      '<button class="crm-extra-option" id="crm-opt-agenda">' +
        '<div class="crm-opt-icon">' + ICON_CLOCK + '</div>' +
        '<div class="crm-opt-info">' +
          '<div class="crm-opt-title">Agendar Mensagem</div>' +
          '<div class="crm-opt-desc">Programar envio automático para esta conversa</div>' +
        '</div>' +
        '<span class="crm-opt-arrow">\u203A</span>' +
      '</button>' +
      '<button class="crm-extra-option crm-opt-disabled">' +
        '<div class="crm-opt-icon">' + ICON_FLOW + '</div>' +
        '<div class="crm-opt-info">' +
          '<div class="crm-opt-title">Flow Sequ\u00eancia</div>' +
          '<div class="crm-opt-desc">Em breve</div>' +
        '</div>' +
      '</button>' +
      '<button class="crm-extra-option crm-opt-disabled">' +
        '<div class="crm-opt-icon">' + ICON_CAL + '</div>' +
        '<div class="crm-opt-info">' +
          '<div class="crm-opt-title">Agendar Atendimento</div>' +
          '<div class="crm-opt-desc">Em breve</div>' +
        '</div>' +
      '</button>';

    document.getElementById('crm-opt-funil').addEventListener('click', renderFunnelPicker);
    document.getElementById('crm-opt-agenda').addEventListener('click', renderScheduleForm);
  }

  /* ── Agendar Mensagem ── */
  function renderScheduleForm() {
    setModalHeader(
      '<button class="crm-modal-back-btn" id="crm-modal-back">\u2039 Voltar</button>'
    );
    document.getElementById('crm-modal-back').addEventListener('click', renderMainMenu);

    var url = window.location.href;
    var cm  = url.match(/\/conversations\/(\d+)/);
    var conversationId = cm ? cm[1] : '';

    /* Data/hora padrão: 1h a partir de agora, arredondado para 30min */
    var now = new Date();
    now.setMinutes(now.getMinutes() + 60 - (now.getMinutes() % 30));
    var pad = function(n) { return String(n).padStart(2, '0'); };
    var defaultDt = now.getFullYear() + '-' + pad(now.getMonth()+1) + '-' + pad(now.getDate()) +
                    'T' + pad(now.getHours()) + ':' + pad(now.getMinutes());

    var body = document.getElementById('crm-modal-body');
    if (!body) return;
    body.innerHTML =
      '<div style="padding:4px 0 8px">' +
        /* Templates dropdown (populado via API assíncrona) */
        '<div style="margin-bottom:12px">' +
          '<label style="font-size:11px;font-weight:600;color:#6b7280;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">Modelo aprovado (WhatsApp)</label>' +
          '<select id="crm-sched-tpl" style="width:100%;border:1px solid #e4e7ed;border-radius:8px;padding:8px 10px;font-size:13px;box-sizing:border-box">' +
            '<option value="">Carregando modelos…</option>' +
          '</select>' +
        '</div>' +
        '<div style="margin-bottom:12px">' +
          '<label style="font-size:11px;font-weight:600;color:#6b7280;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">Mensagem *</label>' +
          '<textarea id="crm-sched-msg" rows="4" placeholder="Digite a mensagem ou selecione um modelo acima…" ' +
            'style="width:100%;border:1px solid #e4e7ed;border-radius:8px;padding:8px 10px;font-size:13px;resize:vertical;box-sizing:border-box;font-family:inherit"></textarea>' +
        '</div>' +
        '<div style="margin-bottom:12px">' +
          '<label style="font-size:11px;font-weight:600;color:#6b7280;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">Data e hora *</label>' +
          '<input id="crm-sched-dt" type="datetime-local" value="' + defaultDt + '" ' +
            'style="width:100%;border:1px solid #e4e7ed;border-radius:8px;padding:8px 10px;font-size:13px;box-sizing:border-box" />' +
        '</div>' +
        '<div style="margin-bottom:12px">' +
          '<label style="font-size:11px;font-weight:600;color:#6b7280;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">Conversa Chatwoot</label>' +
          '<input id="crm-sched-conv" type="number" value="' + conversationId + '" placeholder="ID da conversa (ex: 42)" ' +
            'style="width:100%;border:1px solid #e4e7ed;border-radius:8px;padding:8px 10px;font-size:13px;box-sizing:border-box" />' +
        '</div>' +
        '<div id="crm-sched-err" style="color:#dc2626;font-size:12px;margin-bottom:8px;display:none"></div>' +
        '<button id="crm-sched-save" ' +
          'style="width:100%;padding:10px;background:#1f93ff;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">' +
          'Agendar mensagem' +
        '</button>' +
      '</div>';

    /* Carrega templates WhatsApp do Chatwoot via backend */
    fetch(KANBAN_URL + '/api/v1/accounts/message_templates', { headers: apiHeaders() })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var tplSel = document.getElementById('crm-sched-tpl');
        if (!tplSel) return;
        var list = Array.isArray(data) ? data : (data.payload || data.templates || []);
        if (!list.length) {
          tplSel.innerHTML = '<option value="">Nenhum modelo aprovado encontrado</option>';
          return;
        }
        tplSel.innerHTML = '<option value="">— Selecionar modelo —</option>' +
          list.filter(function(t) {
            return !t.status || t.status === 'approved' || t.status === 'APPROVED';
          }).map(function(t) {
            var body = t.body || t.content || t.components && (t.components.find(function(c){return c.type==='BODY';}) || {}).text || '';
            return '<option value="' + encodeURIComponent(body) + '">' + (t.name || t.title || 'Template') + '</option>';
          }).join('');
        tplSel.addEventListener('change', function() {
          var msgEl = document.getElementById('crm-sched-msg');
          if (!msgEl) return;
          if (tplSel.value) msgEl.value = decodeURIComponent(tplSel.value);
        });
      })
      .catch(function() {
        var tplSel = document.getElementById('crm-sched-tpl');
        if (tplSel) tplSel.innerHTML = '<option value="">Não foi possível carregar modelos</option>';
      });

    document.getElementById('crm-sched-save').addEventListener('click', function() {
      var msg   = (document.getElementById('crm-sched-msg').value || '').trim();
      var dt    = document.getElementById('crm-sched-dt').value;
      var conv  = document.getElementById('crm-sched-conv').value;
      var errEl = document.getElementById('crm-sched-err');

      if (!msg)  { errEl.textContent = 'Mensagem obrigatória.'; errEl.style.display = ''; return; }
      if (!dt)   { errEl.textContent = 'Data obrigatória.'; errEl.style.display = ''; return; }
      errEl.style.display = 'none';

      var btn = document.getElementById('crm-sched-save');
      btn.disabled = true; btn.textContent = 'Salvando…';

      var payload = { message: msg, scheduled_at: dt };
      if (conv) payload.chatwoot_conversation_id = Number(conv);

      fetch(KANBAN_URL + '/api/v1/scheduled_messages', {
        method: 'POST',
        headers: Object.assign({}, apiHeaders(), { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ scheduled_message: payload })
      })
      .then(function(r) {
        if (!r.ok) return r.json().then(function(d) { throw d; });
        return r.json();
      })
      .then(function() {
        setModalHeader('<span>Fun\u00e7\u00f5es Extras</span>');
        var b2 = document.getElementById('crm-modal-body');
        if (b2) b2.innerHTML =
          '<div class="crm-status-msg">' +
            '<div class="crm-status-icon" style="color:#16a34a">' +
              '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
            '</div>' +
            '<div class="crm-status-title">Mensagem agendada!</div>' +
            '<div class="crm-status-sub">Será enviada em ' + new Date(dt).toLocaleString('pt-BR') + '</div>' +
          '</div>';
        setTimeout(closeModal, 2200);
      })
      .catch(function(e) {
        btn.disabled = false; btn.textContent = 'Agendar mensagem';
        var errs = (e && e.errors) ? e.errors.join(', ') : 'Erro ao agendar.';
        errEl.textContent = errs; errEl.style.display = '';
      });
    });
  }

  /* ── Picker de funis (com check de duplicidade) ── */
  function renderFunnelPicker() {
    setModalHeader(
      '<button class="crm-modal-back-btn" id="crm-modal-back">\u2039 Voltar</button>'
    );
    document.getElementById('crm-modal-back').addEventListener('click', renderMainMenu);

    var body = document.getElementById('crm-modal-body');
    if (!body) return;
    body.innerHTML =
      '<div id="crm-funnel-items">' +
        '<div style="color:#9babb4;font-size:13px;padding:8px">Verificando...</div>' +
      '</div>';

    /* Verifica se já existe lead para esta conversa */
    var url = window.location.href;
    var cm  = url.match(/\/conversations\/(\d+)/);
    var conversationId = cm ? cm[1] : null;

    function renderFunnelList(existingLead) {
      var container = document.getElementById('crm-funnel-items');
      if (!container) return;

      var html = '';

      /* Mostra lead existente (se houver) */
      if (existingLead) {
        html +=
          '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 14px;margin-bottom:12px">' +
            '<div style="font-size:11px;color:#1d4ed8;font-weight:600;margin-bottom:2px">JÁ ASSOCIADO</div>' +
            '<div style="font-size:13px;color:#1e3a5f;font-weight:500">' + (existingLead.title || 'Lead') + '</div>' +
            '<div style="font-size:11px;color:#3b82f6;margin-top:2px">Etapa: ' + (existingLead.stage_name || '—') + '</div>' +
          '</div>' +
          '<div class="crm-picker-title" style="margin-top:8px">Mover para outro funil:</div>';
      } else {
        html += '<div class="crm-picker-title">Selecione um funil:</div>';
      }

      container.innerHTML = html + '<div id="crm-funnel-list-inner"><div style="color:#9babb4;font-size:13px;padding:8px">Carregando...</div></div>';

      fetchFunnels(function(funnels) {
        var inner = document.getElementById('crm-funnel-list-inner');
        if (!inner) return;
        if (!funnels.length) {
          inner.innerHTML = '<div style="color:#9babb4;font-size:13px;padding:8px">Nenhum funil encontrado</div>';
          return;
        }
        inner.innerHTML = '';
        funnels.forEach(function(f) {
          var btn = document.createElement('button');
          btn.className = 'crm-picker-item';
          btn.innerHTML =
            '<span style="width:10px;height:10px;border-radius:50%;background:' + (f.color || '#1f93ff') + ';flex-shrink:0"></span>' +
            '<span class="crm-picker-name">' + (f.name || 'Funil') + '</span>' +
            '<span class="crm-picker-meta">' + (f.stages_count !== undefined ? f.stages_count + ' etapas' : '') + '</span>' +
            '<span class="crm-opt-arrow">\u203A</span>';
          btn.addEventListener('click', function() { renderStagePicker(f, existingLead); });
          inner.appendChild(btn);
        });
      });
    }

    if (conversationId) {
      fetch(KANBAN_URL + '/api/v1/leads?conversation_id=' + conversationId, {
        headers: apiHeaders()
      })
      .then(function(r) { return r.json(); })
      .then(function(leads) {
        renderFunnelList(Array.isArray(leads) && leads.length ? leads[0] : null);
      })
      .catch(function() { renderFunnelList(null); });
    } else {
      renderFunnelList(null);
    }
  }

  /* ── Picker de etapas ── */
  function renderStagePicker(funnel, existingLead) {
    setModalHeader(
      '<button class="crm-modal-back-btn" id="crm-modal-back">\u2039 Voltar</button>'
    );
    document.getElementById('crm-modal-back').addEventListener('click', function() { renderFunnelPicker(); });

    var body = document.getElementById('crm-modal-body');
    if (!body) return;
    body.innerHTML =
      '<div class="crm-picker-title">' + (funnel.name || 'Funil') + '</div>' +
      '<div id="crm-stage-items">' +
        '<div style="color:#9babb4;font-size:13px;padding:8px">Carregando etapas...</div>' +
      '</div>';

    fetchStages(funnel.id, function(stages) {
      var container = document.getElementById('crm-stage-items');
      if (!container) return;
      if (!stages.length) {
        container.innerHTML = '<div style="color:#9babb4;font-size:13px;padding:8px">Nenhuma etapa encontrada</div>';
        return;
      }
      container.innerHTML = '';
      stages.forEach(function(stage) {
        var btn = document.createElement('button');
        btn.className = 'crm-picker-item';
        btn.innerHTML =
          '<span style="width:10px;height:10px;border-radius:50%;background:' + (stage.color || '#1f93ff') + ';flex-shrink:0"></span>' +
          '<span class="crm-picker-name">' + (stage.name || 'Etapa') + '</span>' +
          '<span class="crm-opt-arrow">\u203A</span>';
        btn.addEventListener('click', (function(s) { return function() { doAssociate(funnel, s, this, existingLead); }; })(stage));
        container.appendChild(btn);
      });
    });
  }

  /* ── Criar/mover lead ── */
  function doAssociate(funnel, stage, btn, existingLead) {
    btn.disabled = true;
    btn.style.opacity = '.5';

    createLeadForConversation(funnel.id, stage.id, function(err) {
      var body = document.getElementById('crm-modal-body');
      if (!body) return;

      if (err) {
        btn.disabled = false;
        btn.style.opacity = '1';
        var errDiv = document.createElement('div');
        errDiv.style.cssText = 'color:#dc2626;font-size:12px;padding:8px;text-align:center';
        errDiv.textContent = '\u274C Erro ao associar. Tente novamente.';
        body.appendChild(errDiv);
        return;
      }

      /* Sucesso */
      setModalHeader('<span>Fun\u00e7\u00f5es Extras</span>');
      body.innerHTML =
        '<div class="crm-status-msg">' +
          '<div class="crm-status-icon" style="color:#16a34a">' +
            '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
          '</div>' +
          '<div class="crm-status-title">Associado com sucesso!</div>' +
          '<div class="crm-status-sub">' + funnel.name + ' \u2192 ' + stage.name + '</div>' +
        '</div>';
      setTimeout(closeModal, 1800);
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * ROTA SPA — detectar navegação e re-injetar o botão
   * ═══════════════════════════════════════════════════════════════════════ */
  function onUrlChange() {
    closeModal();
    headerBtnRetry = 0;
    setTimeout(injectHeaderButton, 600);
    setTimeout(injectHeaderButton, 1400);
    setTimeout(injectHeaderButton, 2800);
  }

  function watchRoutes() {
    var lastUrl = window.location.href;
    function check() {
      var cur = window.location.href;
      if (cur !== lastUrl) { lastUrl = cur; onUrlChange(); }
    }
    window.addEventListener('hashchange', check);
    window.addEventListener('popstate', check);
    /* Detecta pushState do Vue Router que não dispara eventos */
    setInterval(check, 600);
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * BOOTSTRAP
   * ═══════════════════════════════════════════════════════════════════════ */

  /* MutationObserver APENAS para redetectar o sidebar após SPA navigation.
   * Debounced para não interferir no ciclo de render do Vue.          */
  var sidebarObserver = new MutationObserver(function() {
    clearTimeout(sidebarTimer);
    sidebarTimer = setTimeout(function() {
      if (!document.getElementById('crm-sidebar-group')) injectSidebar();
    }, 400);
  });

  /* Retry periódico para o sidebar */
  var sidebarInterval = setInterval(function() {
    retryCount++;
    if (document.getElementById('crm-sidebar-group')) {
      clearInterval(sidebarInterval);
      return;
    }
    injectSidebar();
    if (retryCount >= MAX_RETRIES) clearInterval(sidebarInterval);
  }, 500);

  /* ── postMessage: iframe pede para abrir uma conversa ── */
  window.addEventListener('message', function(e) {
    if (!e.data || e.data.type !== 'crm-open-conversation') return;
    var convId = e.data.conversationId;
    if (!convId) return;
    var accountMatch = window.location.href.match(/\/accounts\/(\d+)/);
    var accountId = accountMatch ? accountMatch[1] : '1';
    window.location.href = '/app/accounts/' + accountId + '/conversations/' + convId;
  });

  /*
   * Fecha o painel quando o usuário clica num item de nav que NÃO é do CRM.
   * Usa capture:true para interceptar antes que o Vue Router navegue.
   * Se o clique foi dentro do grupo CRM ou do painel, ignora.
   */
  function watchNonCrmClicks() {
    document.addEventListener('click', function(e) {
      if (!panelEl || !panelEl.classList.contains('crm-open')) return;

      var target = e.target;

      /* Clique dentro do grupo CRM no sidebar → não fechar */
      var crmGroup = document.getElementById('crm-sidebar-group');
      if (crmGroup && crmGroup.contains(target)) return;

      /* Clique dentro do painel (conteúdo ou barra) → não fechar */
      var crmContent = document.getElementById('crm-panel-content');
      if (crmContent && crmContent.contains(target)) return;

      /* Clique dentro do modal de Funções Extras → não fechar */
      if (modalEl && modalEl.contains(target)) return;

      /*
       * Verifica se o clique foi num elemento de navegação do Chatwoot
       * (link, botão ou qualquer ancestral que pareça item de nav).
       * Critério: está fora do CRM e está dentro do sidebar (left ≤ getSidebarWidth()).
       */
      var rect = target.getBoundingClientRect ? target.getBoundingClientRect() : null;
      if (rect && rect.right <= getSidebarWidth() + 16) {
        /* Clique está dentro da área do sidebar — fechar painel */
        closePanel();
        return;
      }

      /* Também fecha se o clique foi num <a> ou <button> com href/data-key fora do CRM */
      var node = target;
      for (var i = 0; i < 8; i++) {
        if (!node) break;
        var tag = (node.tagName || '').toUpperCase();
        if (tag === 'A' || tag === 'BUTTON') {
          var href = node.getAttribute('href') || '';
          /* Links de rota interna do Chatwoot (não CRM) → fecha painel */
          if (href && href !== '#' && !href.startsWith('javascript')) {
            var r2 = node.getBoundingClientRect ? node.getBoundingClientRect() : null;
            if (r2 && r2.right <= getSidebarWidth() + 16) {
              closePanel();
            }
          }
          break;
        }
        node = node.parentElement;
      }
    }, true /* capture */);
  }

  function boot() {
    log('iniciando v4.5');
    injectStyles();
    ensurePanel();
    injectSidebar();
    watchRoutes();
    watchNonCrmClicks();
    /* Tenta injetar botão Funções Extras na página atual */
    setTimeout(injectHeaderButton, 800);
    setTimeout(injectHeaderButton, 1600);
    setTimeout(injectHeaderButton, 3000);
    /* Observer do sidebar */
    sidebarObserver.observe(document.body || document.documentElement,
      { childList: true, subtree: true });
  }

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot);

})();
