/**
 * Kanban/CRM Inject — item CRM nativo no sidebar do Chatwoot
 * Robusto: aguarda DOM + Vue, sem erros de null.
 */
(function () {
  'use strict';

  /* ─── CONFIGURAÇÃO ──────────────────────────────────────────────────── */
  var KANBAN_URL    = 'https://vai-novofoco-kanban-chatwoot-frontend.dutk9f.easypanel.host';
  var ACCOUNT_TOKEN = '0fb0a7572850a512f7127633a15e844673bd3e6cf839fa75';

  /* ─── GUARD duplo ───────────────────────────────────────────────────── */
  if (window.__crmInjected) return;
  window.__crmInjected = true;

  /* ─── ESTADO ─────────────────────────────────────────────────────────── */
  var menuOpen = true;
  var currentFunnelId = null;
  var panelEl = null;

  /* ─── ESTILOS ────────────────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('crm-inject-style')) return;
    var s = document.createElement('style');
    s.id = 'crm-inject-style';
    s.textContent = [
      '#crm-panel{position:fixed;top:0;left:200px;right:0;bottom:0;background:#fff;',
      'z-index:9998;display:none;flex-direction:column;',
      'box-shadow:-3px 0 12px rgba(0,0,0,.18)}',
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
      '#crm-sidebar-group{list-style:none;margin:0;padding:0}',
      '#crm-group-header{display:flex;align-items:center;justify-content:space-between;',
      'padding:6px 8px;border-radius:8px;cursor:pointer;',
      'color:#3d4f58;font-size:12px;font-weight:600;letter-spacing:.04em;',
      'text-transform:uppercase;width:100%;background:none;border:none;',
      'transition:background .15s,color .15s}',
      '#crm-group-header:hover{background:rgba(31,147,255,.06);color:#1f93ff}',
      '#crm-group-header.crm-active{color:#1f93ff}',
      'html.dark #crm-group-header{color:#9babb4}',
      'html.dark #crm-group-header:hover{background:rgba(31,147,255,.1);color:#1f93ff}',
      '#crm-header-left{display:flex;align-items:center;gap:6px}',
      '#crm-chevron{transition:transform .2s;flex-shrink:0}',
      '#crm-chevron.open{transform:rotate(90deg)}',
      '#crm-funnel-list{list-style:none;margin:0;padding:0;',
      'display:none;flex-direction:column;gap:1px}',
      '#crm-funnel-list.open{display:flex}',
      '.crm-funnel-item{display:flex;align-items:center;',
      'padding:5px 8px 5px 28px;border-radius:6px;',
      'font-size:13px;color:#3d4f58;cursor:pointer;',
      'background:none;border:none;width:100%;text-align:left;',
      'transition:background .12s,color .12s}',
      '.crm-funnel-item:hover{background:rgba(31,147,255,.07);color:#1f93ff}',
      '.crm-funnel-item.crm-active{background:rgba(31,147,255,.12);color:#1f93ff;font-weight:500}',
      'html.dark .crm-funnel-item{color:#9babb4}',
      'html.dark .crm-funnel-item:hover{background:rgba(31,147,255,.1);color:#1f93ff}',
      '.crm-funnel-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;',
      'background:#1f93ff;margin-right:6px;display:inline-block}',
      '.crm-skeleton{height:28px;border-radius:6px;background:#e4e7ed;',
      'margin:2px 0;animation:crm-pulse 1.2s ease infinite}',
      '@keyframes crm-pulse{0%,100%{opacity:1}50%{opacity:.4}}'
    ].join('');
    var head = document.head || document.getElementsByTagName('head')[0];
    if (head) head.appendChild(s);
  }

  /* ─── PAINEL IFRAME ─────────────────────────────────────────────────── */
  function ensurePanel() {
    if (panelEl || !document.body) return false;
    panelEl = document.createElement('div');
    panelEl.id = 'crm-panel';
    panelEl.innerHTML =
      '<div id="crm-panel-bar">' +
        '<span>\uD83D\uDCCB CRM \u2014 Kanban</span>' +
        '<button id="crm-panel-close" title="Fechar (Esc)">\u2715</button>' +
      '</div>' +
      '<iframe id="crm-iframe" src="" title="CRM Kanban"></iframe>';
    document.body.appendChild(panelEl);

    document.getElementById('crm-panel-close').addEventListener('click', closePanel);
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') closePanel(); });
    return true;
  }

  function syncPanelLeft() {
    if (!panelEl) return;
    var aside = document.querySelector('aside');
    if (aside) panelEl.style.left = aside.offsetWidth + 'px';
  }

  function openPanel(funnelId) {
    if (!panelEl) return;
    syncPanelLeft();
    var iframe = document.getElementById('crm-iframe');
    if (!iframe) return;
    var url = KANBAN_URL + '/?account_token=' + ACCOUNT_TOKEN + '&embedded=true';
    if (funnelId) url += '#/board/' + funnelId;
    if (iframe.src !== url) iframe.src = url;
    currentFunnelId = funnelId;
    panelEl.classList.add('crm-open');
    updateActiveItem();
  }

  function closePanel() {
    if (!panelEl) return;
    panelEl.classList.remove('crm-open');
    currentFunnelId = null;
    updateActiveItem();
  }

  /* ─── BUSCAR FUNIS ──────────────────────────────────────────────────── */
  function fetchFunnels(cb) {
    fetch(KANBAN_URL + '/api/v1/funnels', {
      headers: {
        'X-Account-Token': ACCOUNT_TOKEN,
        'Content-Type': 'application/json'
      }
    })
    .then(function(r){ return r.json(); })
    .then(function(data){ cb(Array.isArray(data) ? data : (data.funnels || [])); })
    .catch(function(){ cb([]); });
  }

  /* ─── SVG ICONS ─────────────────────────────────────────────────────── */
  var CRM_ICON =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="2" y="3" width="4" height="18" rx="1.2"/>' +
    '<rect x="9" y="3" width="4" height="12" rx="1.2"/>' +
    '<rect x="16" y="3" width="4" height="15" rx="1.2"/>' +
    '</svg>';

  var CHEVRON_ICON =
    '<svg id="crm-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<polyline points="9 18 15 12 9 6"/>' +
    '</svg>';

  /* ─── ACTIVE STATE ──────────────────────────────────────────────────── */
  function updateActiveItem() {
    document.querySelectorAll('.crm-funnel-item').forEach(function(el){
      var fid = el.getAttribute('data-funnel-id');
      el.classList.toggle('crm-active', fid && Number(fid) === currentFunnelId);
    });
    var header = document.getElementById('crm-group-header');
    if (header) header.classList.toggle('crm-active', !!currentFunnelId);
  }

  /* ─── POPULAR FUNIS ─────────────────────────────────────────────────── */
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
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        openPanel(f.id);
      });
      li.appendChild(btn);
      ul.appendChild(li);
    });
  }

  /* ─── ENCONTRAR "CONVERSAS" ─────────────────────────────────────────── */
  function findConversasGroup() {
    var nav = document.querySelector('aside nav');
    if (!nav) return null;
    var children = Array.from(nav.children);
    for (var i = 0; i < children.length; i++) {
      var nodes = children[i].querySelectorAll('*');
      for (var j = 0; j < nodes.length; j++) {
        if (nodes[j].children.length === 0 &&
            nodes[j].textContent.trim() === 'Conversas') {
          return children[i];
        }
      }
    }
    return children[0] || null;
  }

  /* ─── INJEÇÃO PRINCIPAL ─────────────────────────────────────────────── */
  function inject() {
    if (document.getElementById('crm-sidebar-group')) return; // já injetado

    // Garantir estilos e painel
    injectStyles();
    ensurePanel();

    var anchor = findConversasGroup();
    if (!anchor) return; // nav ainda não renderizou, observer vai re-tentar

    // Montar grupo CRM
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

    anchor.parentNode.insertBefore(group, anchor.nextSibling);

    // Toggle dropdown
    var header = document.getElementById('crm-group-header');
    var list   = document.getElementById('crm-funnel-list');
    var chev   = document.getElementById('crm-chevron');

    if (header && list) {
      header.addEventListener('click', function(){
        menuOpen = !menuOpen;
        list.classList.toggle('open', menuOpen);
        if (chev) chev.classList.toggle('open', menuOpen);
      });
      // Abrir automaticamente
      list.classList.add('open');
      if (chev) chev.classList.add('open');
    }

    // Buscar funis
    fetchFunnels(function(data){
      populateFunnels(data);
      updateActiveItem();
    });

    console.log('[CRM Inject] \u2705 sidebar CRM injetado');
  }

  /* ─── BOOTSTRAP ─────────────────────────────────────────────────────── */
  function boot() {
    // Observer para quando o Vue renderizar o sidebar
    var obs = new MutationObserver(function(){
      if (document.querySelector('aside nav') && !document.getElementById('crm-sidebar-group')) {
        inject();
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });

    // Tentativas escalonadas como fallback
    [0, 500, 1000, 2000, 3500, 5000].forEach(function(ms){
      setTimeout(inject, ms);
    });
  }

  // Aguardar body estar pronto
  if (document.body) {
    boot();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    setTimeout(boot, 0);
  }

})();
