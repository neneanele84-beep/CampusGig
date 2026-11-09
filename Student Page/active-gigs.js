(function () {
  'use strict';

  const GIGS_KEY = 'campusgig-active-gigs';
  const APPS_KEY = 'campusgig-applications';
  const ACCEPTED = ['accepted', 'hired', 'active', 'in progress'];

  try { localStorage.removeItem('campusgig_active_gigs'); } catch (e) {}

  const day = 24 * 60 * 60 * 1000;

  function readList(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  function writeList(key, list) {
    try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) {}
  }

  const appStatus = (app) => String((app && (app.status || app.applicationStatus)) || 'Submitted');
  const appTitle = (app) => app.gigTitle || app.currentPosition || 'Gig';
  const appKey = (app) => `${appTitle(app)}|${app.submittedAt || ''}`;

  const GigStore = {
    getAll() { return readList(GIGS_KEY); },
    saveAll(list) { writeList(GIGS_KEY, list); },

    sync() {
      const gigs = this.getAll();
      let changed = false;
      readList(APPS_KEY).forEach((app) => {
        if (!ACCEPTED.includes(appStatus(app).toLowerCase())) return;
        const key = appKey(app);
        if (gigs.some((g) => g.appKey === key)) return;
        gigs.push({
          id: key,
          appKey: key,
          title: appTitle(app),
          employer: app.employer || app.employerName || app.company || 'Employer',
          pay: app.pay || app.budget || '',
          location: app.location || '',
          description: app.description || '',
          startDate: app.acceptedAt || new Date().toISOString(),
          dueDate: app.dueDate || '',
          status: 'in_progress',
        });
        changed = true;
      });
      if (changed) this.saveAll(gigs);
      return gigs;
    },

    complete(id) {
      const gigs = this.getAll();
      const gig = gigs.find((g) => g.id === id);
      if (!gig) return;
      gig.status = 'completed';
      gig.completedDate = new Date().toISOString();
      this.saveAll(gigs);

      const apps = readList(APPS_KEY);
      const app = apps.find((a) => appKey(a) === gig.appKey);
      if (app) {
        app.status = 'Completed';
        writeList(APPS_KEY, apps);
      }
    },
  };

  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

  async function syncRemoteApplications() {
    try {
      const user = JSON.parse(localStorage.getItem('campusgig-current-user') || '{}');
      if (!user.email) return;
      const response = await fetch(`https://campusgig-jf2e.onrender.com/api/applications/student?email=${encodeURIComponent(user.email)}`);
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && Array.isArray(data.applications)) {
        writeList(APPS_KEY, data.applications);
        render();
      }
    } catch (e) {}
  }

  function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  }

  function dueInfo(dueDate) {
    if (!dueDate || Number.isNaN(new Date(dueDate).getTime())) return null;
    const diff = Math.round((startOfDay(dueDate) - startOfDay(Date.now())) / day);
    if (diff < 0) return { text: `Overdue by ${-diff} day${diff === -1 ? '' : 's'}`, cls: 'ag-due-late' };
    if (diff === 0) return { text: 'Due today', cls: 'ag-due-soon' };
    if (diff <= 2) return { text: `Due in ${diff} day${diff === 1 ? '' : 's'}`, cls: 'ag-due-soon' };
    return { text: `Due in ${diff} days`, cls: 'ag-due-ok' };
  }

  const style = document.createElement('style');
  style.textContent = `
    .ag-section { grid-column: 1; min-width: 0; }
    .ag-section[hidden] { display: none; }
    .ag-heading { display:flex; align-items:flex-end; justify-content:space-between; flex-wrap:wrap; gap:1rem; margin:0.5rem 0 1rem; }
    .ag-heading h2 { margin:0; font-size:1.35rem; }
    .ag-kicker { margin:0 0 0.25rem; color:#86efac; font-size:0.7rem; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; }
    .ag-tabs { display:flex; gap:0.5rem; flex-wrap:wrap; }
    .ag-tab { border:1px solid rgba(148,163,184,0.22); border-radius:9px; background:rgba(255,255,255,0.06); color:var(--text-light); cursor:pointer; font:inherit; font-size:0.78rem; font-weight:700; padding:0.6rem 0.8rem; }
    .ag-tab:hover { color:var(--text-white); }
    .ag-tab.is-active { border-color:rgba(34,197,94,0.45); background:rgba(34,197,94,0.12); color:#bbf7d0; }
    .ag-list { display:grid; gap:0.9rem; }
    .ag-card { padding:1.25rem 1.35rem; border:1px solid rgba(148,163,184,0.2); border-radius:14px; background:rgba(15,23,42,0.82); box-shadow:0 12px 24px rgba(2,6,23,0.18); }
    .ag-top { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.65rem; font-size:0.72rem; }
    .ag-badge { padding:0.35rem 0.65rem; border-radius:999px; font-size:0.7rem; font-weight:700; }
    .ag-badge.in_progress { background:rgba(249,115,22,0.18); color:#fdba74; }
    .ag-badge.completed { background:rgba(34,197,94,0.12); color:#bbf7d0; }
    .ag-due { font-weight:700; }
    .ag-due-ok { color:#86efac; }
    .ag-due-soon { color:#fdba74; }
    .ag-due-late { color:#fca5a5; }
    .ag-card h3 { margin:0.8rem 0 0.25rem; color:var(--text-white); font-size:1.12rem; font-weight:600; }
    .ag-employer { margin:0 0 0.5rem; color:var(--text-muted); font-size:0.78rem; }
    .ag-meta { margin:0; color:#a5b4fc; font-size:0.78rem; line-height:1.6; }
    .ag-desc { max-width:900px; margin:0.75rem 0 0; color:var(--text-light); font-size:0.78rem; line-height:1.6; }
    .ag-footer { display:flex; align-items:center; flex-wrap:wrap; gap:1rem; margin-top:1rem; color:var(--text-muted); font-size:0.72rem; }
    .ag-btn { margin-left:auto; border:1px solid rgba(34,197,94,0.45); border-radius:9px; background:rgba(34,197,94,0.12); color:#bbf7d0; cursor:pointer; font:inherit; font-size:0.78rem; font-weight:700; padding:0.6rem 0.8rem; }
    .ag-btn:hover { background:var(--primary-green); color:#052e16; }
    .ag-empty { padding:2.5rem 1rem; text-align:center; border:1px dashed rgba(148,163,184,0.3); border-radius:14px; background:rgba(15,23,42,0.5); color:var(--text-light); }
    .ag-empty p { margin:0.3rem 0; }
    .ag-empty strong { color:var(--text-white); }
    .ag-empty a { color:#86efac; font-weight:700; text-decoration:none; }
  `;
  document.head.appendChild(style);

  const section = document.createElement('section');
  section.className = 'ag-section';
  section.id = 'active-gigs-section';
  section.hidden = true;
  section.innerHTML = `
    <div class="ag-heading">
      <div>
        <p class="ag-kicker">Your work</p>
        <h2>Active gigs</h2>
      </div>
      <div class="ag-tabs" role="tablist">
        <button type="button" class="ag-tab is-active" data-tab="in_progress" role="tab"></button>
        <button type="button" class="ag-tab" data-tab="completed" role="tab"></button>
      </div>
    </div>
    <div class="ag-list" id="ag-list"></div>
  `;

  let currentTab = 'in_progress';

  function render() {
    const all = GigStore.sync();
    const inProgress = all.filter((g) => g.status === 'in_progress');
    const completed = all.filter((g) => g.status === 'completed');

    section.querySelector('[data-tab="in_progress"]').textContent = `In progress (${inProgress.length})`;
    section.querySelector('[data-tab="completed"]').textContent = `Completed (${completed.length})`;
    section.querySelectorAll('.ag-tab').forEach((t) =>
      t.classList.toggle('is-active', t.dataset.tab === currentTab)
    );

    const list = section.querySelector('#ag-list');
    const items = currentTab === 'in_progress' ? inProgress : completed;

    if (!items.length) {
      list.innerHTML =
        currentTab === 'in_progress'
          ? `<div class="ag-empty"><p><strong>No active gigs yet.</strong></p>
             <p>When an employer accepts your application, the gig will appear here.</p>
             <a href="#applications">Check your applications</a></div>`
          : `<div class="ag-empty"><p><strong>No completed gigs yet.</strong></p></div>`;
    } else {
      list.innerHTML = items
        .map((g) => {
          const isDone = g.status === 'completed';
          const due = isDone ? null : dueInfo(g.dueDate);
          const meta = [g.pay, g.location].filter(Boolean).join(' • ');
          const dates = [`Started ${fmtDate(g.startDate)}`];
          if (isDone) dates.push(`Completed ${fmtDate(g.completedDate)}`);
          else if (due) dates.push(`Due ${fmtDate(g.dueDate)}`);
          return `
          <article class="ag-card">
            <div class="ag-top">
              <span class="ag-badge ${esc(g.status)}">${isDone ? 'Completed' : 'In progress'}</span>
              ${due ? `<span class="ag-due ${due.cls}">${esc(due.text)}</span>` : ''}
            </div>
            <h3>${esc(g.title)}</h3>
            <p class="ag-employer">${esc(g.employer)}</p>
            ${meta ? `<p class="ag-meta">${esc(meta)}</p>` : ''}
            ${g.description ? `<p class="ag-desc">${esc(g.description)}</p>` : ''}
            <div class="ag-footer">
              <span>${esc(dates.join(' • '))}</span>
              ${isDone ? '' : `<button type="button" class="ag-btn" data-complete="${esc(g.id)}">Mark as completed</button>`}
            </div>
          </article>`;
        })
        .join('');
    }

    updateDashboardStat(inProgress.length);
  }

  function updateDashboardStat(count) {
    const icon = document.querySelector('.active-icon');
    const card = icon && icon.closest('.stat-card');
    if (!card) return;
    const num = card.querySelector('.stat-number');
    const note = card.querySelector('.stat-change');
    if (num) num.textContent = count;
    if (note) note.textContent = count ? `${count} in progress` : 'No active gigs yet';
  }

  const HIDE_WHEN_ACTIVE = '.dashboard-only, #find-work, #saved-panel';

  function showPage() {
    document.querySelectorAll(HIDE_WHEN_ACTIVE).forEach((el) => {
      if (el.style.display !== 'none') {
        el.dataset.agHidden = '1';
        el.style.display = 'none';
      }
    });
    section.hidden = false;
    render();
  }

  function hidePage() {
    document.querySelectorAll('[data-ag-hidden]').forEach((el) => {
      el.style.display = '';
      delete el.dataset.agHidden;
    });
    section.hidden = true;
  }

  function route() {
    document.querySelectorAll('.sidebar-menu a').forEach((a) => {
      const href = a.getAttribute('href');
      a.classList.toggle('active', href === location.hash || (!location.hash && href === '#dashboard'));
    });
    if (location.hash === '#active-gigs') showPage();
    else hidePage();
  }

  section.addEventListener('click', (e) => {
    const tab = e.target.closest('.ag-tab');
    if (tab) {
      currentTab = tab.dataset.tab;
      render();
      return;
    }
    const btn = e.target.closest('[data-complete]');
    if (btn && confirm('Mark this gig as completed?')) {
      GigStore.complete(btn.dataset.complete);
      render();
    }
  });

  function init() {
    const anchor = document.getElementById('find-work');
    if (anchor) anchor.insertAdjacentElement('afterend', section);
    else (document.querySelector('.main-content') || document.body).appendChild(section);

    updateDashboardStat(GigStore.sync().filter((g) => g.status === 'in_progress').length);
    syncRemoteApplications();
    window.addEventListener('hashchange', route);
    route();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.CampusGigDev = {
    acceptLatestApplication() {
      const apps = readList(APPS_KEY);
      const app = apps.slice().reverse().find((a) => !ACCEPTED.includes(appStatus(a).toLowerCase()) && appStatus(a).toLowerCase() !== 'completed');
      if (!app) return 'No pending application found. Apply to a gig first.';
      app.status = 'Accepted';
      writeList(APPS_KEY, apps);
      render();
      return `Accepted: ${appTitle(app)}. Open Active Gigs to see it.`;
    },
    addSampleGigs() {
      const iso = (n) => new Date(Date.now() + n * day).toISOString();
      const gigs = GigStore.getAll();
      [
        { title: 'Social Media Assistant for a growing campus brand', employer: 'Zulu Coast Apparel', pay: 'R200 - R250/hr', location: 'University of Zululand: KwaDlangezwa campus', description: 'Plan weekly content and turn simple ideas into short videos for Instagram and TikTok.', startDate: iso(-6), dueDate: iso(4) },
        { title: 'Travel Writer / Content Editor', employer: 'Wandering Zulu Blog', pay: 'R150 - R200/hr', location: 'Remote', description: 'Edit and polish founder-written stories so they read clearly and engagingly.', startDate: iso(-3), dueDate: iso(0) },
        { title: 'Event flyer design', employer: 'Richards Bay Youth Forum', pay: 'R400 fixed', location: 'Richards Bay', description: 'Design a printable A4 flyer for a community youth event.', startDate: iso(-12), dueDate: iso(-2) },
      ].forEach((g, i) => gigs.push(Object.assign({ id: `sample-${Date.now()}-${i}`, appKey: '', status: 'in_progress' }, g)));
      GigStore.saveAll(gigs);
      render();
      return 'Added 3 sample gigs.';
    },
    clearGigs() {
      try { localStorage.removeItem(GIGS_KEY); } catch (e) {}
      render();
      return 'Cleared active gigs.';
    },
  };
})();
