// ==UserScript==
// @name         Kanban no Chatwoot — Vai Agência Novo Foco
// @namespace    https://vai-novofoco-kanban-chatwoot-frontend.dutk9f.easypanel.host
// @version      1.0.0
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
    #kanban-panel {
      position: fixed;
      top: 0; left: 68px; right: 0; bottom: 0;
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

    .dark #kanban-panel      { background: #1c2b33; }
    .dark #kanban-panel-bar  { background: #243641; border-color: #3a4a54; }
    .dark #kanban-panel-bar span { color: #e5eef3; }
    .dark #kanban-panel-close    { color: #9babb4; }
    .dark #kanban-panel-close:hover { background: #3a4a54; color: #e5eef3; }

    #kanban-nav-li {
      list-style: none; display: flex;
      align-items: center; justify-content: center; width: 100%;
    }
    #kanban-nav-btn {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 3px; width: 100%;
      padding: 8px 6px; margin: 2px 0;
      background: none; border: none; border-radius: 8px;
      cursor: pointer; color: #6b7280;
      transition: background .15s, color .15s;
    }
    #kanban-nav-btn:hover   { background: rgba(31,147,255,.08); color: #1f93ff; }
    #kanban-nav-btn.kn-active { background: rgba(31,147,255,.14); color: #1f93ff; }
    .dark #kanban-nav-btn        { color: #9babb4; }
    .dark #kanban-nav-btn:hover  { background: rgba(31,147,255,.12); color: #1f93ff; }
    .dark #kanban-nav-btn.kn-active { background: rgba(31,147,255,.18); color: #1f93ff; }
    #kanban-nav-btn svg  { display: block; }
    #kanban-nav-btn span { font-size: 9px; font-weight: 500; white-space: nowrap; }
  `;

  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.appendChild(s);

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

  let navBtn = null;
  const open  = () => { panel.classList.add('kp-open');    navBtn?.classList.add('kn-active'); };
  const close = () => { panel.classList.remove('kp-open'); navBtn?.classList.remove('kn-active'); };
  const toggle= () => panel.classList.contains('kp-open') ? close() : open();

  document.getElementById('kanban-panel-close').addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  /* ─── BOTÃO ──────────────────────────────────────────────────────────── */
  const ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="4" height="18" rx="1.5"/><rect x="9" y="3" width="4" height="12" rx="1.5"/><rect x="16" y="3" width="4" height="15" rx="1.5"/></svg>';

  function buildLi() {
    const li = document.createElement('li');
    li.id = 'kanban-nav-li';
    li.innerHTML = '<button id="kanban-nav-btn" title="Kanban">' + ICON + '<span>Kanban</span></button>';
    navBtn = li.querySelector('#kanban-nav-btn');
    navBtn.addEventListener('click', toggle);
    return li;
  }

  /* ─── INJEÇÃO ────────────────────────────────────────────────────────── */
  const SELECTORS = [
    '.primary-nav .primary-nav__items:not(.primary-nav__items--bottom)',
    '.primary-nav ul:first-of-type',
    '.primary-nav ul',
    'aside nav ul',
    '.sidebar-nav ul',
  ];

  function inject() {
    if (document.getElementById('kanban-nav-li')) return;
    for (const sel of SELECTORS) {
      const nav = document.querySelector(sel);
      if (nav) { nav.appendChild(buildLi()); console.log('[Kanban] ✅ injetado'); return; }
    }
  }

  new MutationObserver(inject).observe(document.body, { childList: true, subtree: true });
  [0, 300, 800, 1500, 3000, 5000].forEach(ms => setTimeout(inject, ms));
})();
