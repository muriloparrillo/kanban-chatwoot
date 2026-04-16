/**
 * Kanban Inject — adiciona o Kanban como item nativo no menu lateral do Chatwoot
 *
 * Configuração:
 *   KANBAN_URL   — URL base do seu frontend Kanban
 *   ACCOUNT_TOKEN — token gerado pelo backend ao registrar a conta Chatwoot
 */
(function () {
  'use strict';

  /* ─── CONFIGURAÇÃO ──────────────────────────────────────────────────── */
  const KANBAN_URL = 'https://vai-novofoco-kanban-chatwoot-frontend.dutk9f.easypanel.host';
  const ACCOUNT_TOKEN = '0fb0a7572850a512f7127633a15e844673bd3e6cf839fa75';
  const KANBAN_FULL_URL = KANBAN_URL + '/?account_token=' + ACCOUNT_TOKEN + '&embedded=true';

  /* ─── GUARD: não injetar duas vezes ─────────────────────────────────── */
  if (window.__kanbanInjected) return;
  window.__kanbanInjected = true;

  /* ─── ESTILOS ────────────────────────────────────────────────────────── */
  const CSS = `
    /* ── Painel overlay ── */
    #kanban-panel {
      position: fixed;
      top: 0; left: 200px; right: 0; bottom: 0;
      background: #fff;
      z-index: 9998;
      display: none;
      flex-direction: column;
      box-shadow: -3px 0 12px rgba(0,0,0,0.18);
    }
    #kanban-panel.kp-open { display: flex; }

    #kanban-panel iframe {
      flex: 1;
      width: 100%;
      border: none;
    }

    /* Barra superior do painel */
    #kanban-panel-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 14px;
      min-height: 42px;
      background: #f8f9fa;
      border-bottom: 1px solid #e4e7ed;
    }

    #kanban-panel-bar span {
      font-size: 13px;
      font-weight: 600;
      color: #1c2b33;
    }

    #kanban-panel-close {
      background: none; border: none; cursor: pointer;
      padding: 4px 8px; border-radius: 6px;
      font-size: 16px; color: #6b7280; line-height: 1;
    }
    #kanban-panel-close:hover { background: #e4e7ed; color: #1c2b33; }

    /* Modo escuro */
    .dark #kanban-panel         { background: #1c2b33; }
    .dark #kanban-panel-bar     { background: #243641; border-color: #3a4a54; }
    .dark #kanban-panel-bar span{ color: #e5eef3; }
    .dark #kanban-panel-close   { color: #9babb4; }
    .dark #kanban-panel-close:hover { background: #3a4a54; color: #e5eef3; }

    /* ── Item de menu ── */
    #kanban-nav-li {
      list-style: none;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
    }

    #kanban-nav-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      width: 100%;
      padding: 8px 6px;
      margin: 2px 0;
      background: none;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      color: #6b7280;
      transition: background 0.15s, color 0.15s;
    }
    #kanban-nav-btn:hover              { background: rgba(31,147,255,0.08); color: #1f93ff; }
    #kanban-nav-btn.kn-active          { background: rgba(31,147,255,0.14); color: #1f93ff; }

    .dark #kanban-nav-btn              { color: #9babb4; }
    .dark #kanban-nav-btn:hover        { background: rgba(31,147,255,0.12); color: #1f93ff; }
    .dark #kanban-nav-btn.kn-active    { background: rgba(31,147,255,0.18); color: #1f93ff; }

    #kanban-nav-btn svg { display: block; flex-shrink: 0; }
    #kanban-nav-btn span { font-size: 9px; font-weight: 500; white-space: nowrap; }
  `;

  const styleTag = document.createElement('style');
  styleTag.id = 'kanban-inject-css';
  styleTag.textContent = CSS;
  document.head.appendChild(styleTag);

  /* ─── PAINEL IFRAME ─────────────────────────────────────────────────── */
  const panel = document.createElement('div');
  panel.id = 'kanban-panel';
  panel.innerHTML =
    '<div id="kanban-panel-bar">' +
      '<span>📋 Kanban</span>' +
      '<button id="kanban-panel-close" title="Fechar (Esc)">✕</button>' +
    '</div>' +
    '<iframe src="' + KANBAN_FULL_URL + '" allow="*" title="Kanban"></iframe>';
  document.body.appendChild(panel);

  function openPanel()  { panel.classList.add('kp-open');    navBtn && navBtn.classList.add('kn-active'); }
  function closePanel() { panel.classList.remove('kp-open'); navBtn && navBtn.classList.remove('kn-active'); }
  function togglePanel(){ panel.classList.contains('kp-open') ? closePanel() : openPanel(); }

  document.getElementById('kanban-panel-close').addEventListener('click', closePanel);
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closePanel(); });

  /* ─── BOTÃO DE MENU ─────────────────────────────────────────────────── */
  var navBtn = null;

  const KANBAN_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" ' +
      'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="2"  y="3" width="4" height="18" rx="1.5"/>' +
      '<rect x="9"  y="3" width="4" height="12" rx="1.5"/>' +
      '<rect x="16" y="3" width="4" height="15" rx="1.5"/>' +
    '</svg>';

  function buildNavItem() {
    const li = document.createElement('li');
    li.id = 'kanban-nav-li';
    li.innerHTML =
      '<button id="kanban-nav-btn" title="Kanban — Gestão de Leads">' +
        KANBAN_SVG +
        '<span>Kanban</span>' +
      '</button>';
    navBtn = li.querySelector('#kanban-nav-btn');
    navBtn.addEventListener('click', togglePanel);
    return li;
  }

  /* ─── INJEÇÃO NA SIDEBAR ─────────────────────────────────────────────── */
  /*
   * Chatwoot v3 renderiza a nav primária com a classe .primary-nav
   * e os itens em ul.primary-nav__items  (topo) e  ul.primary-nav__items--bottom (rodapé).
   * Tentamos múltiplos seletores para compatibilidade com diferentes versões.
   */
  const NAV_SELECTORS = [
    '.primary-nav .primary-nav__items:not(.primary-nav__items--bottom)',
    '.primary-nav ul:first-of-type',
    '.primary-nav ul',
    'aside nav ul',
    '.sidebar-nav ul',
  ];

  function findNavList() {
    for (var i = 0; i < NAV_SELECTORS.length; i++) {
      var el = document.querySelector(NAV_SELECTORS[i]);
      if (el) return el;
    }
    return null;
  }

  function injectIfNeeded() {
    if (document.getElementById('kanban-nav-li')) return; // já injetado
    var navList = findNavList();
    if (!navList) return;
    navList.appendChild(buildNavItem());
    console.log('[Kanban Inject] ✅ Botão adicionado ao nav');
  }

  /* ─── OBSERVER: re-inject após re-renders do Vue ─────────────────────── */
  var observer = new MutationObserver(injectIfNeeded);
  observer.observe(document.body, { childList: true, subtree: true });

  /* ─── BOOT ───────────────────────────────────────────────────────────── */
  // Chatwoot é SPA; tentamos em vários momentos após o carregamento.
  injectIfNeeded();
  [300, 800, 1500, 3000, 5000].forEach(function(ms){
    setTimeout(injectIfNeeded, ms);
  });

})();
