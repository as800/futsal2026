/* ---------- Firebase ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyCRlZ2wN9ykSCWtriVnu1fIawPft1mic7k",
  authDomain: "futsaltik2026.firebaseapp.com",
  projectId: "futsaltik2026",
  storageBucket: "futsaltik2026.firebasestorage.app",
  messagingSenderId: "843872117247",
  appId: "1:843872117247:web:772f70ebde5ff6914bc7ca"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const docRef = db.collection('liga').doc('data');

let isAdmin = false;
let localVersion = 0;
let saveTimer = null;
let firstSnapshotHandled = false;

const colors = ['#FF6B35','#F2B705','#E4483A','#3AA6B9','#8B5CF6'];

/* Data default, dipakai saat pertama kali dokumen Firestore dibuat */
let teams = [
  { name:'PSPP' },
  { name:'PEPSI' },
  { name:'PIKSI' },
  { name:'PSP' },
  { name:'TAKESI' },
];

// mapping tim A-E ke indeks: A=0 PSPP, B=1 PEPSI, C=2 PIKSI, D=3 PSP, E=4 TAKESI
let schedule = [
  { date:'18 Agustus', matches:[
    { home:3, away:4, sh:null, sa:null, goals:[], cards:[] },
    { home:1, away:2, sh:null, sa:null, goals:[], cards:[] },
  ]},
  { date:'19 Agustus', matches:[
    { home:0, away:1, sh:null, sa:null, goals:[], cards:[] },
    { home:2, away:4, sh:null, sa:null, goals:[], cards:[] },
  ]},
  { date:'20 Agustus', matches:[
    { home:0, away:3, sh:null, sa:null, goals:[], cards:[] },
    { home:4, away:1, sh:null, sa:null, goals:[], cards:[] },
  ]},
  { date:'26 Agustus', matches:[
    { home:2, away:3, sh:null, sa:null, goals:[], cards:[] },
    { home:4, away:0, sh:null, sa:null, goals:[], cards:[] },
  ]},
  { date:'27 Agustus', matches:[
    { home:0, away:2, sh:null, sa:null, goals:[], cards:[] },
    { home:1, away:3, sh:null, sa:null, goals:[], cards:[] },
  ]},
];

function initials(name){
  return name.trim().split(/\s+/).map(w=>w[0]).join('').toUpperCase().slice(0,2) || '?';
}

/* ---------- Sinkronisasi Firestore ---------- */
function setSaveStatus(text){
  document.getElementById('save-status').textContent = text;
}

function saveState(){
  localVersion++;
  setSaveStatus('Menyimpan...');
  docRef.set({
    teams, schedule, version: localVersion,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(()=>{
    setSaveStatus('Tersimpan');
  }).catch(()=>{
    setSaveStatus('Gagal menyimpan, cek koneksi');
  });
}

function queueSave(){
  clearTimeout(saveTimer);
  setSaveStatus('Mengetik...');
  saveTimer = setTimeout(saveState, 600);
}

docRef.onSnapshot(snap=>{
  if(!snap.exists){
    if(!firstSnapshotHandled){
      firstSnapshotHandled = true;
      localVersion = 1;
      docRef.set({ teams, schedule, version: localVersion });
      renderAll();
    }
    return;
  }
  const data = snap.data();
  firstSnapshotHandled = true;
  if(data.version === localVersion){ return; }
  teams = data.teams || teams;
  schedule = data.schedule || schedule;
  localVersion = data.version || localVersion;
  renderAll();
}, err=>{
  setSaveStatus('Gagal terhubung ke Firebase');
  renderAll();
});

function renderAll(){
  renderStandings();
  renderSchedule();
  renderScorers();
}

/* ---------- Auth ---------- */
const loginOverlay = document.getElementById('login-overlay');
const loginError = document.getElementById('login-error');

document.getElementById('login-btn').addEventListener('click', ()=>{
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  loginError.classList.remove('show');
  loginOverlay.classList.add('show');
  document.getElementById('login-user').focus();
});
document.getElementById('login-cancel').addEventListener('click', ()=>{
  loginOverlay.classList.remove('show');
});
document.getElementById('login-submit').addEventListener('click', attemptLogin);
document.getElementById('login-pass').addEventListener('keydown', e=>{
  if(e.key === 'Enter') attemptLogin();
});
document.getElementById('logout-btn').addEventListener('click', ()=>{
  auth.signOut();
});

function attemptLogin(){
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  const submitBtn = document.getElementById('login-submit');
  loginError.classList.remove('show');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Memeriksa...';
  auth.signInWithEmailAndPassword(u, p)
    .then(()=>{
      loginOverlay.classList.remove('show');
    })
    .catch(()=>{
      loginError.textContent = 'Email atau password salah.';
      loginError.classList.add('show');
    })
    .finally(()=>{
      submitBtn.disabled = false;
      submitBtn.textContent = 'Masuk';
    });
}

auth.onAuthStateChanged(user=>{
  isAdmin = !!user;
  updateAuthUI();
  renderStandings();
  renderSchedule();
});

function updateAuthUI(){
  const status = document.getElementById('auth-status');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const lockNote = document.getElementById('schedule-lock-note');
  const saveStatus = document.getElementById('save-status');
  if(isAdmin){
    status.classList.add('on');
    status.innerHTML = '<span class="dot"></span>Mode admin';
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    lockNote.style.display = 'none';
    saveStatus.style.display = 'inline';
  } else {
    status.classList.remove('on');
    status.innerHTML = '<span class="dot"></span>Mode publik';
    loginBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
    lockNote.style.display = 'inline-flex';
    saveStatus.style.display = 'none';
  }
}

/* ---------- Tabs ---------- */
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-'+btn.dataset.tab).classList.add('active');
  });
});

/* ---------- Klasemen tim ---------- */
function computeStandings(){
  const stats = teams.map(()=>({m:0,mn:0,s:0,k:0,gm:0,gk:0}));
  schedule.forEach(day=>{
    day.matches.forEach(mt=>{
      if(mt.sh===null || mt.sa===null || mt.sh==='' || mt.sa==='') return;
      const sh = +mt.sh, sa = +mt.sa;
      const H = stats[mt.home], A = stats[mt.away];
      H.m++; A.m++;
      H.gm+=sh; H.gk+=sa;
      A.gm+=sa; A.gk+=sh;
      if(sh>sa){ H.mn++; A.k++; }
      else if(sh<sa){ A.mn++; H.k++; }
      else { H.s++; A.s++; }
    });
  });
  return stats;
}

function renderStandings(){
  const stats = computeStandings();
  const rows = teams.map((t,i)=>({...t, ...stats[i], idx:i}));
  rows.sort((a,b)=>{
    const ptsA=a.mn*3+a.s, ptsB=b.mn*3+b.s;
    if(ptsB!==ptsA) return ptsB-ptsA;
    const sgA=a.gm-a.gk, sgB=b.gm-b.gk;
    if(sgB!==sgA) return sgB-sgA;
    return b.gm-a.gm;
  });

  const tbody = document.getElementById('standings-body');
  tbody.innerHTML = '';
  rows.forEach((t,rank)=>{
    const sg = t.gm - t.gk;
    const pts = t.mn*3 + t.s;
    const tr = document.createElement('tr');
    if(rank===0) tr.className='rank-1';
    const nameField = isAdmin
      ? `<input class="team-name" data-idx="${t.idx}" value="${t.name}">`
      : `<span class="team-name-static">${t.name}</span>`;
    tr.innerHTML = `
      <td class="rank-cell">${rank+1}</td>
      <td class="team-col">
        <div class="team-row">
          <div class="badge" style="background:${colors[t.idx % colors.length]}">${initials(t.name)}</div>
          ${nameField}
        </div>
      </td>
      <td>${t.m}</td>
      <td>${t.mn}</td>
      <td>${t.s}</td>
      <td>${t.k}</td>
      <td>${t.gm}</td>
      <td>${t.gk}</td>
      <td class="${sg>0?'gd-pos':sg<0?'gd-neg':''}">${sg>0?'+':''}${sg}</td>
      <td class="pts-cell">${pts}</td>
    `;
    tbody.appendChild(tr);
  });

  if(isAdmin){
    tbody.querySelectorAll('input.team-name').forEach(inp=>{
      inp.addEventListener('input', e=>{
        teams[+e.target.dataset.idx].name = e.target.value;
        queueSave();
      });
    });
  }
}

/* ---------- Klasemen top skor (agregasi dari input jadwal) ---------- */
function renderScorers(){
  const map = {};
  schedule.forEach(day=>{
    day.matches.forEach(mt=>{
      mt.goals.forEach(g=>{
        const name = (g.player || '').trim();
        if(!name) return;
        const key = name.toLowerCase()+'|'+g.team;
        if(!map[key]) map[key] = { name, team:g.team, goals:0 };
        map[key].goals += (g.count || 0);
      });
    });
  });
  const rows = Object.values(map).sort((a,b)=>b.goals-a.goals);

  const tbody = document.getElementById('scorer-body');
  tbody.innerHTML = '';
  if(rows.length === 0){
    tbody.innerHTML = `<tr><td colspan="4" class="empty-note">Belum ada gol tercatat. Admin dapat menambahkan pencetak gol di tab Jadwal &amp; Summary.</td></tr>`;
    return;
  }
  rows.forEach((r,rank)=>{
    const tr = document.createElement('tr');
    if(rank===0) tr.className='rank-1';
    tr.innerHTML = `
      <td class="rank-cell">${rank+1}</td>
      <td class="team-col">${r.name}</td>
      <td>${teams[r.team] ? teams[r.team].name : '-'}</td>
      <td class="goals-cell">${r.goals}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ---------- Jadwal & summary pertandingan ---------- */
function teamOptionsFor(homeIdx, awayIdx, selected){
  return [homeIdx, awayIdx].map(i=>
    `<option value="${i}" ${i===selected?'selected':''}>${teams[i].name}</option>`
  ).join('');
}

function isMatchScored(mt){
  return mt.sh !== null && mt.sa !== null && mt.sh !== '' && mt.sa !== '';
}

function renderSchedule(){
  const list = document.getElementById('schedule-list');
  list.innerHTML = '';

  schedule.forEach((day, di)=>{
    const dateEl = document.createElement('div');
    dateEl.className = 'day-block';
    dateEl.textContent = day.date;
    list.appendChild(dateEl);

    day.matches.forEach((mt, mi)=>{
      const card = document.createElement('div');
      card.className = `match-card${isMatchScored(mt) ? ' is-completed' : ''}`;

      let goalsHtml;
      if(isAdmin){
        goalsHtml = mt.goals.map((g, gi)=>`
          <div class="entry-row">
            <input class="player-input" data-di="${di}" data-mi="${mi}" data-gi="${gi}" data-field="goal-player" value="${g.player}" placeholder="Nama pemain">
            <select class="team-select" data-di="${di}" data-mi="${mi}" data-gi="${gi}" data-field="goal-team">${teamOptionsFor(mt.home, mt.away, g.team)}</select>
            <input class="player-input" style="flex:0 0 40px;text-align:center;" type="number" min="1" data-di="${di}" data-mi="${mi}" data-gi="${gi}" data-field="goal-count" value="${g.count}">
            <button class="mini-del" data-di="${di}" data-mi="${mi}" data-gi="${gi}" data-field="goal-del" title="Hapus">&times;</button>
          </div>
        `).join('') + `<button class="mini-add" data-di="${di}" data-mi="${mi}" data-field="goal-add">+ Tambah pencetak gol</button>`;
      } else {
        goalsHtml = mt.goals.length
          ? mt.goals.map(g=>`<div class="entry-static">${g.player || '(tanpa nama)'} <span class="muted">&middot; ${teams[g.team]?teams[g.team].name:'-'} &middot; ${g.count} gol</span></div>`).join('')
          : `<div class="entry-static muted">Belum ada data</div>`;
      }

      let cardsHtml;
      if(isAdmin){
        cardsHtml = mt.cards.map((c, ci)=>`
          <div class="entry-row">
            <span class="card-chip ${c.type}"></span>
            <input class="player-input" data-di="${di}" data-mi="${mi}" data-ci="${ci}" data-field="card-player" value="${c.player}" placeholder="Nama pemain">
            <select class="team-select" data-di="${di}" data-mi="${mi}" data-ci="${ci}" data-field="card-team">${teamOptionsFor(mt.home, mt.away, c.team)}</select>
            <select class="card-select" data-di="${di}" data-mi="${mi}" data-ci="${ci}" data-field="card-type">
              <option value="kuning" ${c.type==='kuning'?'selected':''}>Kuning</option>
              <option value="merah" ${c.type==='merah'?'selected':''}>Merah</option>
            </select>
            <button class="mini-del" data-di="${di}" data-mi="${mi}" data-ci="${ci}" data-field="card-del" title="Hapus">&times;</button>
          </div>
        `).join('') + `<button class="mini-add" data-di="${di}" data-mi="${mi}" data-field="card-add">+ Tambah kartu</button>`;
      } else {
        cardsHtml = mt.cards.length
          ? mt.cards.map(c=>`<div class="entry-static"><span class="card-chip ${c.type}"></span>${c.player || '(tanpa nama)'} <span class="muted">&middot; ${teams[c.team]?teams[c.team].name:'-'}</span></div>`).join('')
          : `<div class="entry-static muted">Belum ada data</div>`;
      }

      const scoreField = isAdmin
        ? `<div class="score-box">
             <input class="score" type="number" min="0" data-di="${di}" data-mi="${mi}" data-side="sh" value="${mt.sh===null?'':mt.sh}" placeholder="-">
             <span class="vs-sep">:</span>
             <input class="score" type="number" min="0" data-di="${di}" data-mi="${mi}" data-side="sa" value="${mt.sa===null?'':mt.sa}" placeholder="-">
           </div>`
        : `<div class="score-static">${mt.sh===null?'-':mt.sh} : ${mt.sa===null?'-':mt.sa}</div>`;

      card.innerHTML = `
        <div class="match-head">
          <span class="match-team home">${teams[mt.home].name}</span>
          ${scoreField}
          <span class="match-team away">${teams[mt.away].name}</span>
        </div>
        <div class="summary-grid">
          <div class="summary-col">
            <h4>Pencetak gol</h4>
            ${goalsHtml}
          </div>
          <div class="summary-col">
            <h4>Kartu kuning / merah</h4>
            ${cardsHtml}
          </div>
        </div>
      `;
      list.appendChild(card);
    });
  });

  if(isAdmin) attachScheduleListeners();
}

function attachScheduleListeners(){
  const list = document.getElementById('schedule-list');

  list.querySelectorAll('input.score').forEach(inp=>{
    inp.addEventListener('input', e=>{
      const di=+e.target.dataset.di, mi=+e.target.dataset.mi, side=e.target.dataset.side;
      const v = e.target.value;
      schedule[di].matches[mi][side] = v==='' ? null : Math.max(0, parseInt(v)||0);
      e.target.closest('.match-card').classList.toggle('is-completed', isMatchScored(schedule[di].matches[mi]));
      renderStandings();
      queueSave();
    });
  });

  list.querySelectorAll('[data-field="goal-player"]').forEach(inp=>{
    inp.addEventListener('input', e=>{
      const {di,mi,gi} = e.target.dataset;
      schedule[+di].matches[+mi].goals[+gi].player = e.target.value;
      renderScorers();
      queueSave();
    });
  });
  list.querySelectorAll('[data-field="goal-team"]').forEach(sel=>{
    sel.addEventListener('change', e=>{
      const {di,mi,gi} = e.target.dataset;
      schedule[+di].matches[+mi].goals[+gi].team = +e.target.value;
      renderScorers();
      queueSave();
    });
  });
  list.querySelectorAll('[data-field="goal-count"]').forEach(inp=>{
    inp.addEventListener('input', e=>{
      const {di,mi,gi} = e.target.dataset;
      const v = e.target.value==='' ? 1 : Math.max(1, parseInt(e.target.value)||1);
      schedule[+di].matches[+mi].goals[+gi].count = v;
      renderScorers();
      queueSave();
    });
  });
  list.querySelectorAll('[data-field="goal-del"]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const {di,mi,gi} = e.target.dataset;
      schedule[+di].matches[+mi].goals.splice(+gi,1);
      renderSchedule();
      renderScorers();
      queueSave();
    });
  });
  list.querySelectorAll('[data-field="goal-add"]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const {di,mi} = e.target.dataset;
      const mt = schedule[+di].matches[+mi];
      mt.goals.push({ player:'', team:mt.home, count:1 });
      renderSchedule();
      renderScorers();
      queueSave();
    });
  });

  list.querySelectorAll('[data-field="card-player"]').forEach(inp=>{
    inp.addEventListener('input', e=>{
      const {di,mi,ci} = e.target.dataset;
      schedule[+di].matches[+mi].cards[+ci].player = e.target.value;
      queueSave();
    });
  });
  list.querySelectorAll('[data-field="card-team"]').forEach(sel=>{
    sel.addEventListener('change', e=>{
      const {di,mi,ci} = e.target.dataset;
      schedule[+di].matches[+mi].cards[+ci].team = +e.target.value;
      queueSave();
    });
  });
  list.querySelectorAll('[data-field="card-type"]').forEach(sel=>{
    sel.addEventListener('change', e=>{
      const {di,mi,ci} = e.target.dataset;
      schedule[+di].matches[+mi].cards[+ci].type = e.target.value;
      renderSchedule();
      queueSave();
    });
  });
  list.querySelectorAll('[data-field="card-del"]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const {di,mi,ci} = e.target.dataset;
      schedule[+di].matches[+mi].cards.splice(+ci,1);
      renderSchedule();
      queueSave();
    });
  });
  list.querySelectorAll('[data-field="card-add"]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const {di,mi} = e.target.dataset;
      const mt = schedule[+di].matches[+mi];
      mt.cards.push({ player:'', team:mt.home, type:'kuning' });
      renderSchedule();
      queueSave();
    });
  });
}

/* ---------- Peraturan (accordion) ---------- */
document.querySelectorAll('.rule-toggle').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    btn.closest('.rule-section').classList.toggle('open');
  });
});
document.querySelector('.rule-section')?.classList.add('open');

updateAuthUI();
renderAll();

