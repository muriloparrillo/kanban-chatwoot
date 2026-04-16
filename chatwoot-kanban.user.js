// ==UserScript==
// @name         Kanban no Chatwoot — Vai Agência Novo Foco
// @namespace    https://vai-novofoco-kanban-chatwoot-frontend.dutk9f.easypanel.host
// @version      1.1.0
// @description  Adiciona o Kanban como item nativo no menu lateral do Chatwoot
// @author       Murilo Parrillo
// @match        https://vai.agencianovofoco.com.br/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  /* ─── CONFIGURAÇÃO ──────────────────────────────────────────────────── */
  const KANBAN_URL = 'https://vai-novofoco-kanban-chatwoot-frontend.dutk9f.easypanel.host';
  const ACCOUNT_TOKEN = '0fb0a7572850a512f7127633a15e844673bd3e6cf839fa75';
  const KANBAN_FULL_URL = KANBAN_URL + '/?account_token=' + ACCOUNT_TOKEN;

  /* ─── GUARD ─────────────────────────────────────────────────────────── */
  if (window.__kanbanInjected) return;
  window.__kanbanInjected = true;

  /* ─── ESTILOS ────────────────────────────────────────────────────────── */
  const CSS = `
    /* Painel overlay — abre por cima do conteúdo */
    #kanban-panel {
      position: fixed;
      top: 0;
      left: 200px;   /* largura do aside do Chatwoot */
      right: 0;
      bottom: 0;
      background: #fff;
      z-index: 9998;
      display: none;
      flex-direction: column;
      box-shadow: -3px 0 12px rgba(0,0,0,0.18);
    }
    #kanban-panel.kp-open { display: flex; }
    #kanban-panel iframe  { flex: 1; width: 100%; border: none; }

    #kanban-panel-bar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 6px 14px; min-height: 42px;
      background: #f8f9fa; border-bottom: 1px solid #e4e7ed;
    }
    #kanban-panel-bar span { font-size: 13px; font-weight: 600; color: #1c2b33; }
    #kanban-panel-close {
      background: none; border: none; cursor: pointer;
      padding: 4px 8px; border-radius: 6px; font-size: 16px; color: #6b7280;
    }
    #kanban-panel-close:hover { background: #e4e7ed; color: #1c2b33; }

    /* Modo escuro (Chatwoot adiciona classe "dark" no <html>) */
    html.dark #kanban-panel      { background: #1c2b33; }
    html.dark #kanban-panel-bar  { background: #243641; border-color: #3a4a54; }
    html.dark #kanban-panel-bar span { color: #e5eef3; }
    html.dark #kanban-panel-close    { color: #9babb4; }
    html.dark #kanban-panel-close:hover { background: #3a4a54; color: #e5eef3; }

    /* Item de menu — estilo Chatwoot Tailwind moderno */
    #kanban-nav-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      margin: 0;
      border-radius: 8px;
      cursor: pointer;
      background: none;
      border: none;
      width: 100%;
      text-align: left;
      color: #3d4f58;
      font-size: 13px;
      font-weight: 500;
      transition: background .15s, color .15s;
      text-decoration: none;
    }
    #kanban-nav-item:hover              { background: #f0f4f8; color: #1f93ff; }
    #kanban-nav-item.kn-active          { background: #e8f4ff; color: #1f93ff; font-weight: 600; }

    html.dark #kanban-nav-item          { color: #9babb4; }
    html.dark #kanban-nav-item:hover    { background: rgba(255,255,255,0.06); color: #1f93ff; }
    html.dark #kanban-nav-item.kn-active{ background: rgba(31,147,255,0.15); color: #1f93ff; }

    #kanban-nav-item svg { flex-shrink: 0; }
    #kanban-nav-item span { line-height: 1; }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  /* ─── PAINEL ─────────────────────────────────────────────────────────── */
  const panel = document.createElement('div');
  panel.id = 'kanban-panel';
  panel.innerHTML =
    '<div id="kanban-panel-bar">' +
      '<span>📋 Kanban</span>' +
      '<button id="kanban-panel-close" title="Fechar (Esc)">✕</button>' +
    '</div>' +
    '<iframe src="' + KANBAN_FULL_URL + '" allow="*" title="Kanban"></iframe>';
  document.body.appendChild(panel);

  // Ajusta left dinamicamente (caso o aside tenha largura diferente de 200px)
  function syncPanelLeft() {
    const aside = document.querySelector('aside');
    if (aside) panel.style.left = aside.offsetWidth + 'px';
  }

  let navBtn = null;
  const open   = () => { syncPanelLeft(); panel.classList.add('kp-open');    navBtn?.classList.add('kn-active'); };
  const close  = () => { panel.classList.remove('kp-open'); navBtn?.classList.remove('kn-active'); };
  const toggle = () => panel.classList.contains('kp-open') ? close() : open();

  document.getElementById('kanban-panel-close').addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  /* ─── BOTÃO ──────────────────────────────────────────────────────────── */
  const ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" ' +
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="2" y="3" width="4" height="18" rx="1.5"/>' +
    '<rect x="9" y="3" width="4" height="12" rx="1.5"/>' +
    '<rect x="16" y="3" width="4" height="15" rx="1.5"/>' +
    '</svg>';

  function buildButton() {
    const btn = document.createElement('button');
    btn.id = 'kanban-nav-item';
    btn.innerHTML = ICON + '<span>Kanban</span>';
    btn.addEventListener('click', toggle);
    navBtn = btn;
    return btn;
  }

  /* ─── INJEÇÃO ────────────────────────────────────────────────────────── */
  // No Chatwoot moderno: aside > nav (grid scrollável)
  function getNav() {
    return document.querySelector('aside nav') || document.querySelector('nav');
  }

  function inject() {
    if (document.getElementById('kanban-nav-item')) return;
    const nav = getNav();
    if (!nav) return;

    // Cria um wrapper para o botão, imitando a estrutura de um grupo do sidebar
    const wrapper = document.createElement('div');
    wrapper.id = 'kanban-nav-wrapper';
    wrapper.style.cssText = 'padding: 2px 0;';
    wrapper.appendChild(buildButton());

    // Insere no início do nav (antes dos outros grupos)
    nav.insertBefore(wrapper, nav.firstChild);
    console.log('[Kanban] ✅ Botão injetado no nav');
  }

  new MutationObserver(inject).observe(document.body, { childList: true, subtree: true });
  [0, 300, 800, 1500, 3000, 5000].forEach(ms => setTimeout(inject, ms));

})();
