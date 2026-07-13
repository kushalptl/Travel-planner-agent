/**
 * ═══════════════════════════════════════════════════════════════════
 *  TravelAI — IBM Watsonx.ai Travel Planner  |  Frontend Application
 * ═══════════════════════════════════════════════════════════════════
 */

'use strict';

/* ── State ────────────────────────────────────────────────────────────── */
const State = {
  activeTab:   'chat',
  theme:       localStorage.getItem('theme') || 'light',
  tripContext: {
    destination: '',
    days:        7,
    budget:      '',
    people:      2,
    style:       'mixed',
  },
  members:     [],
  leafletMap:  null,
  leafletMarker: null,
  memberCount: 0,
};

/* ── DOM Refs ─────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const DOM = {
  body:           document.body,
  html:           document.documentElement,
  themeToggle:    $('themeToggle'),
  themeIcon:      $('themeIcon'),
  statusDot:      $('statusDot'),
  statusText:     $('statusText'),
  chatMessages:   $('chatMessages'),
  chatInput:      $('chatInput'),
  sendBtn:        $('sendBtn'),
  clearChatBtn:   $('clearChatBtn'),
  exportChatBtn:  $('exportChatBtn'),
  quickPrompts:   $('quickPrompts'),
  tripContextBar: $('tripContextBar'),
  tcDest:         $('tcDest'),
  tcDays:         $('tcDays'),
  tcBudget:       $('tcBudget'),
  tcPeople:       $('tcPeople'),
  heroSearch:     $('heroSearch'),
  heroSearchBtn:  $('heroSearchBtn'),
  weatherContent: $('weatherContent'),
  mapContainer:   $('mapContainer'),
  openOsmLink:    $('openOsmLink'),
  refreshWeather: $('refreshWeather'),
  forecastRow:    $('forecastRow'),
  checklist:      $('checklist'),
  resetChecklist: $('resetChecklist'),
  dashDest:       $('dashDest'),
  dashDays:       $('dashDays'),
  dashBudget:     $('dashBudget'),
  dashTravelers:  $('dashTravelers'),
  // Itinerary
  itinDest:       $('itinDest'),
  itinDuration:   $('itinDuration'),
  itinTravelers:  $('itinTravelers'),
  itinBudget:     $('itinBudget'),
  itinStyle:      $('itinStyle'),
  itinGroupType:  $('itinGroupType'),
  itinOutput:     $('itinOutput'),
  generateItinBtn:$('generateItinBtn'),
  copyItinBtn:    $('copyItinBtn'),
  downloadItinBtn:$('downloadItinBtn'),
  // Budget
  budgetDest:     $('budgetDest'),
  budgetDuration: $('budgetDuration'),
  budgetTravelers:$('budgetTravelers'),
  calcBudgetBtn:  $('calcBudgetBtn'),
  budgetOutput:   $('budgetOutput'),
  estimateBox:    $('estimateBox'),
  estimateTotal:  $('estimateTotal'),
  estimateBars:   $('estimateBars'),
  // Group
  groupName:      $('groupName'),
  groupDest:      $('groupDest'),
  groupDuration:  $('groupDuration'),
  groupBudget:    $('groupBudget'),
  membersList:    $('membersList'),
  addMemberBtn:   $('addMemberBtn'),
  planGroupBtn:   $('planGroupBtn'),
  groupOutput:    $('groupOutput'),
  costSplitterSection: $('costSplitterSection'),
  // Modal
  ctxDest:        $('ctxDest'),
  ctxDays:        $('ctxDays'),
  ctxBudget:      $('ctxBudget'),
  ctxPeople:      $('ctxPeople'),
  ctxStyle:       $('ctxStyle'),
  saveTripContext:$('saveTripContext'),
};

/* ── Toast ────────────────────────────────────────────────────────────── */
function showToast(msg, type = 'info') {
  const el    = $('appToast');
  const body  = $('toastBody');
  body.textContent = msg;
  el.className = `toast align-items-center border-0 text-bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'dark'}`;
  bootstrap.Toast.getOrCreateInstance(el, { delay: 3500 }).show();
}

/* ── Theme ────────────────────────────────────────────────────────────── */
function applyTheme(theme) {
  State.theme = theme;
  DOM.html.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  DOM.themeIcon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
  // Rebuild map tiles on theme change
  if (State.leafletMap) {
    State.leafletMap.eachLayer(l => { if (l instanceof L.TileLayer) State.leafletMap.removeLayer(l); });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors', maxZoom: 18,
    }).addTo(State.leafletMap);
  }
}

DOM.themeToggle.addEventListener('click', () => applyTheme(State.theme === 'dark' ? 'light' : 'dark'));
applyTheme(State.theme);

/* ── Tab Navigation ───────────────────────────────────────────────────── */
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', e => {
    e.preventDefault();
    const target = tab.dataset.tab;
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
    tab.classList.add('active');
    $(`tab-${target}`).classList.add('active');
    State.activeTab = target;

    if (target === 'dashboard') updateDashboard();
  });
});

/* ── Health Check ─────────────────────────────────────────────────────── */
async function checkHealth() {
  try {
    const r    = await fetch('/api/health');
    const data = await r.json();
    const ok   = data.ai_ready || data.model_ready;
    DOM.statusDot.className  = `status-dot ${ok ? 'online' : 'offline'}`;
    DOM.statusText.textContent = ok ? `Online · Groq AI` : 'Model not configured';
  } catch {
    DOM.statusDot.className  = 'status-dot offline';
    DOM.statusText.textContent = 'Server unreachable';
  }
}

checkHealth();
setInterval(checkHealth, 60_000);

/* ── Welcome Message ──────────────────────────────────────────────────── */
function injectWelcome() {
  const msg = `## 👋 Hello! I'm **TravelAI**, your AI travel companion.

I can help you:
- 🗺️ **Create personalised day-by-day itineraries** for any destination
- 💰 **Analyse and optimise your travel budget** 
- 🌦️ **Check live weather** and recommend best travel seasons
- 👨‍👩‍👧 **Coordinate group and family trips** with cost splitting
- 🏨 **Recommend hotels, transport, and activities** for every budget
- 🛡️ **Advise on visas, safety, and health requirements**

**Try asking me something like:**
> *"Plan a 10-day trip to Japan for 2 people with a $4,000 budget"*
> *"What are the best beaches in Bali in July?"*
> *"Family itinerary for Rome with 2 young kids"*

*Or use the quick prompts below, or set your trip context with the ✏️ Edit button.*`;

  appendMessage('ai', msg);
}

injectWelcome();

/* ── Chat Helpers ─────────────────────────────────────────────────────── */
function formatTime(d = new Date()) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderMarkdown(text) {
  if (window.marked) {
    marked.setOptions({ breaks: true, gfm: true });
    return marked.parse(text);
  }
  // Fallback: basic formatting
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function appendMessage(role, content) {
  const isAI   = role === 'ai';
  const row    = document.createElement('div');
  row.className = `msg-row ${isAI ? 'ai' : 'user'}`;

  const avatar = document.createElement('div');
  avatar.className = `msg-avatar ${isAI ? 'ai' : 'user'}`;
  avatar.innerHTML = isAI ? '<i class="bi bi-robot"></i>' : '<i class="bi bi-person-fill"></i>';

  const col    = document.createElement('div');
  col.className = 'd-flex flex-column align-items-' + (isAI ? 'start' : 'end');

  const bubble = document.createElement('div');
  bubble.className = `msg-bubble ${isAI ? 'ai' : 'user'}`;
  bubble.innerHTML  = isAI ? renderMarkdown(content) : escapeHtml(content);

  const time   = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = formatTime();

  col.appendChild(bubble);
  col.appendChild(time);
  row.appendChild(avatar);
  row.appendChild(col);

  DOM.chatMessages.appendChild(row);
  DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
  return bubble;
}

function showTyping() {
  const row  = document.createElement('div');
  row.className = 'msg-row ai'; row.id = 'typingRow';
  row.innerHTML = `
    <div class="msg-avatar ai"><i class="bi bi-robot"></i></div>
    <div class="msg-bubble ai"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
  DOM.chatMessages.appendChild(row);
  DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
}

function removeTyping() { const r = $('typingRow'); if (r) r.remove(); }

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
          .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ── Send Chat Message ────────────────────────────────────────────────── */
async function sendMessage(text) {
  const msg = (text || DOM.chatInput.value).trim();
  if (!msg) return;

  DOM.chatInput.value = '';
  autoResizeTextarea(DOM.chatInput);
  DOM.sendBtn.disabled = true;
  $('quickPrompts').style.display = 'none';

  appendMessage('user', msg);
  showTyping();

  try {
    const body = {
      message:     msg,
      destination: State.tripContext.destination,
      trip_context: {
        destination: State.tripContext.destination,
        duration:    State.tripContext.days,
        budget:      State.tripContext.budget,
        travelers:   State.tripContext.people,
        style:       State.tripContext.style,
      },
    };

    const res  = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    const data = await res.json();
    removeTyping();

    if (data.error) {
      appendMessage('ai', `⚠️ **Error:** ${data.error}`);
    } else {
      appendMessage('ai', data.reply || data.response || 'No response received.');
      if (data.context?.weather) renderWeatherWidget(data.context.weather);
      if (data.context?.coords)  renderMap(data.context.coords.lat, data.context.coords.lon);
    }
  } catch (err) {
    removeTyping();
    appendMessage('ai', `⚠️ **Network error:** ${err.message}. Please check your connection and server.`);
  } finally {
    DOM.sendBtn.disabled = false;
    DOM.chatInput.focus();
  }
}

DOM.sendBtn.addEventListener('click', () => sendMessage());

DOM.chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}
DOM.chatInput.addEventListener('input', () => autoResizeTextarea(DOM.chatInput));

/* Quick prompts */
DOM.quickPrompts.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => sendMessage(chip.dataset.prompt));
});

/* Hero search */
DOM.heroSearchBtn.addEventListener('click', () => {
  const dest = DOM.heroSearch.value.trim();
  if (!dest) return;
  State.tripContext.destination = dest;
  updateContextBar();
  // Switch to chat tab
  document.querySelector('[data-tab="chat"]').click();
  sendMessage(`Tell me everything about visiting ${dest} — best time to go, top attractions, estimated budget, and any travel tips.`);
});
DOM.heroSearch.addEventListener('keydown', e => { if (e.key === 'Enter') DOM.heroSearchBtn.click(); });

/* Clear chat */
DOM.clearChatBtn.addEventListener('click', async () => {
  if (!confirm('Clear all chat history?')) return;
  await fetch('/api/clear', { method: 'POST' });
  DOM.chatMessages.innerHTML = '';
  injectWelcome();
  $('quickPrompts').style.display = 'flex';
  showToast('Chat cleared.', 'info');
});

/* Export chat */
DOM.exportChatBtn.addEventListener('click', () => {
  const lines = [];
  DOM.chatMessages.querySelectorAll('.msg-bubble').forEach(b => {
    const role = b.classList.contains('user') ? 'You' : 'TravelAI';
    lines.push(`[${role}]\n${b.innerText}\n`);
  });
  const blob = new Blob([lines.join('\n---\n')], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href = url;
  a.download = `travelai-chat-${Date.now()}.txt`; a.click();
  URL.revokeObjectURL(url);
  showToast('Chat exported!', 'success');
});

/* ── Trip Context ─────────────────────────────────────────────────────── */
function updateContextBar() {
  const c = State.tripContext;
  DOM.tcDest.textContent   = c.destination || 'No destination';
  DOM.tcDays.textContent   = c.days ? `${c.days} days` : '– days';
  DOM.tcBudget.textContent = c.budget ? `$${c.budget}` : 'No budget';
  DOM.tcPeople.textContent = `${c.people || 1} traveler${c.people !== 1 ? 's' : ''}`;
}

DOM.saveTripContext.addEventListener('click', () => {
  State.tripContext.destination = DOM.ctxDest.value.trim();
  State.tripContext.days        = parseInt(DOM.ctxDays.value) || 7;
  State.tripContext.budget      = DOM.ctxBudget.value.trim();
  State.tripContext.people      = parseInt(DOM.ctxPeople.value) || 1;
  State.tripContext.style       = DOM.ctxStyle.value;
  updateContextBar();

  if (State.tripContext.destination) {
    loadWeather(State.tripContext.destination);
  }
  showToast('Trip context updated!', 'success');
});

/* Sync modal inputs from state when modal opens */
$('tripContextModal').addEventListener('show.bs.modal', () => {
  const c = State.tripContext;
  DOM.ctxDest.value   = c.destination;
  DOM.ctxDays.value   = c.days;
  DOM.ctxBudget.value = c.budget;
  DOM.ctxPeople.value = c.people;
  DOM.ctxStyle.value  = c.style;
});

/* ── Weather Widget ───────────────────────────────────────────────────── */
const wmoIcons = {
  0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',
  51:'🌦️',53:'🌦️',61:'🌧️',63:'🌧️',65:'🌧️',
  71:'❄️',73:'❄️',75:'❄️',80:'🌦️',81:'🌦️',82:'⛈️',95:'⛈️',96:'⛈️',
};

async function loadWeather(city) {
  DOM.weatherContent.innerHTML = `<div class="p-3 text-center"><div class="spinner-primary spinner mx-auto"></div></div>`;
  try {
    const r    = await fetch(`/api/weather/${encodeURIComponent(city)}`);
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    renderWeatherWidget(data);
    renderForecast(data.weekly || []);
  } catch (e) {
    DOM.weatherContent.innerHTML = `<div class="p-3 text-center text-muted"><i class="bi bi-exclamation-triangle me-1"></i>${e.message}</div>`;
  }
}

function renderWeatherWidget(w) {
  const icon = wmoIcons[0] || '🌡️';     // Use temp-based icons
  const tempIcon = w.temp >= 30 ? '🌞' : w.temp >= 20 ? '⛅' : w.temp >= 10 ? '🌤️' : '❄️';
  DOM.weatherContent.innerHTML = `
    <div class="weather-main">
      <div class="weather-icon">${tempIcon}</div>
      <div>
        <div class="weather-temp">${w.temp !== null ? w.temp + '°C' : 'N/A'}</div>
        <div class="weather-desc">${w.description || ''}</div>
        <div style="font-size:.78rem;color:var(--text-muted);margin-top:2px">${w.city || ''}</div>
      </div>
    </div>
    <div class="weather-meta">
      <div class="weather-stat">💧 Humidity <strong>${w.humidity ?? 'N/A'}%</strong></div>
      <div class="weather-stat">💨 Wind <strong>${w.windspeed ?? 'N/A'} km/h</strong></div>
    </div>`;

  if (w.lat && w.lon) renderMap(w.lat, w.lon, w.city);
  if (w.weekly)       renderForecast(w.weekly);
}

DOM.refreshWeather.addEventListener('click', () => {
  if (State.tripContext.destination) loadWeather(State.tripContext.destination);
  else showToast('Set a destination first.', 'info');
});

/* ── Map (Leaflet) ────────────────────────────────────────────────────── */
function renderMap(lat, lon, label = '') {
  const container = DOM.mapContainer;

  // Clear placeholder
  if (!State.leafletMap) {
    container.innerHTML = '<div id="leafletMap" style="height:280px;width:100%;"></div>';
    State.leafletMap = L.map('leafletMap', { zoomControl: true, scrollWheelZoom: false }).setView([lat, lon], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(State.leafletMap);
  } else {
    State.leafletMap.setView([lat, lon], 12);
    if (State.leafletMarker) State.leafletMap.removeLayer(State.leafletMarker);
  }

  const customIcon = L.divIcon({
    html: `<div style="background:var(--primary);width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>`,
    iconSize: [28, 28], iconAnchor: [14, 28], className: '',
  });

  State.leafletMarker = L.marker([lat, lon], { icon: customIcon })
    .addTo(State.leafletMap)
    .bindPopup(`<strong>${label || 'Destination'}</strong><br>Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`)
    .openPopup();

  DOM.openOsmLink.href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=12/${lat}/${lon}`;
  DOM.openOsmLink.style.display = 'inline-flex';

  // Force redraw
  setTimeout(() => State.leafletMap.invalidateSize(), 200);
}

/* ── Dashboard ────────────────────────────────────────────────────────── */
function updateDashboard() {
  const c = State.tripContext;
  DOM.dashDest.textContent     = c.destination || '—';
  DOM.dashDays.textContent     = c.days ? `${c.days} days` : '—';
  DOM.dashBudget.textContent   = c.budget ? `$${Number(c.budget).toLocaleString()}` : '—';
  DOM.dashTravelers.textContent= c.people ? `${c.people} ${c.people === 1 ? 'person' : 'people'}` : '—';

  if (c.destination) loadWeather(c.destination);
}

/* ── Forecast Render ──────────────────────────────────────────────────── */
function renderForecast(weekly) {
  if (!weekly || !weekly.length) return;
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  DOM.forecastRow.innerHTML = weekly.map(d => {
    const dt   = new Date(d.date);
    const label= days[dt.getDay()];
    const icon = d.max_temp >= 30 ? '☀️' : d.max_temp >= 20 ? '⛅' : d.max_temp >= 10 ? '🌤️' : '❄️';
    const rain = d.precip_mm > 5 ? '🌧️' : d.precip_mm > 0 ? '🌦️' : icon;
    return `
      <div class="forecast-card">
        <div class="forecast-date">${label}</div>
        <div class="forecast-icon">${rain}</div>
        <div class="forecast-temps">
          <span class="forecast-hi">${d.max_temp?.toFixed(0) ?? '--'}°</span>
          <span style="color:var(--text-muted)"> / </span>
          <span class="forecast-lo">${d.min_temp?.toFixed(0) ?? '--'}°</span>
        </div>
        <div style="font-size:.7rem;color:var(--text-muted);margin-top:3px">${d.precip_mm?.toFixed(1) ?? '0'}mm</div>
      </div>`;
  }).join('');
}

/* ── Pre-trip Checklist ───────────────────────────────────────────────── */
const CHECKLIST_ITEMS = [
  { id: 'c1',  label: '✈️ Book flights',          done: false },
  { id: 'c2',  label: '🏨 Book accommodation',     done: false },
  { id: 'c3',  label: '🛂 Check visa requirements',done: false },
  { id: 'c4',  label: '💉 Check vaccinations',     done: false },
  { id: 'c5',  label: '🛡️ Get travel insurance',   done: false },
  { id: 'c6',  label: '💳 Notify your bank',       done: false },
  { id: 'c7',  label: '📱 Download offline maps',  done: false },
  { id: 'c8',  label: '🧳 Pack luggage',           done: false },
  { id: 'c9',  label: '🔌 Pack adapters/chargers', done: false },
  { id: 'c10', label: '📄 Copy documents',         done: false },
  { id: 'c11', label: '💊 Pack medications',       done: false },
  { id: 'c12', label: '💱 Get local currency',     done: false },
];

let checklistState = JSON.parse(localStorage.getItem('checklist') || 'null') || [...CHECKLIST_ITEMS];

function renderChecklist() {
  DOM.checklist.innerHTML = checklistState.map(item => `
    <label class="checklist-item ${item.done ? 'done' : ''}" data-id="${item.id}">
      <input type="checkbox" ${item.done ? 'checked' : ''} />
      ${item.label}
    </label>`).join('');

  DOM.checklist.querySelectorAll('.checklist-item').forEach(el => {
    el.addEventListener('click', () => {
      const id   = el.dataset.id;
      const item = checklistState.find(i => i.id === id);
      if (item) { item.done = !item.done; saveChecklist(); renderChecklist(); }
    });
  });
}

function saveChecklist() { localStorage.setItem('checklist', JSON.stringify(checklistState)); }

DOM.resetChecklist.addEventListener('click', () => {
  checklistState = CHECKLIST_ITEMS.map(i => ({ ...i, done: false }));
  saveChecklist(); renderChecklist();
});

renderChecklist();

/* ── Itinerary Builder ────────────────────────────────────────────────── */
DOM.generateItinBtn.addEventListener('click', async () => {
  const destination = DOM.itinDest.value.trim();
  const duration    = parseInt(DOM.itinDuration.value) || 7;
  const travelers   = parseInt(DOM.itinTravelers.value) || 2;
  const budget      = parseInt(DOM.itinBudget.value) || 3000;
  const style       = DOM.itinStyle.value;
  const groupType   = DOM.itinGroupType.value;
  const interests   = [...document.querySelectorAll('#interestTags input:checked')].map(i => i.value);

  if (!destination) { showToast('Please enter a destination.', 'error'); DOM.itinDest.focus(); return; }

  DOM.generateItinBtn.disabled = true;
  DOM.generateItinBtn.innerHTML = '<span class="spinner me-2"></span>Generating…';
  DOM.itinOutput.innerHTML = buildSkeletonLoader();
  DOM.copyItinBtn.style.display    = 'none';
  DOM.downloadItinBtn.style.display= 'none';

  try {
    const res  = await fetch('/api/itinerary', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination, duration, travelers, budget, travel_style: style, interests, group_type: groupType }),
    });
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    DOM.itinOutput.innerHTML = renderMarkdown(data.itinerary || 'No itinerary generated.');
    DOM.copyItinBtn.style.display     = 'inline-flex';
    DOM.downloadItinBtn.style.display = 'inline-flex';

    // Save itinerary text for download
    DOM.downloadItinBtn.dataset.text = data.itinerary;
    DOM.downloadItinBtn.dataset.dest = destination;

    if (data.weather) renderWeatherWidget(data.weather);
    showToast(`Itinerary for ${destination} created!`, 'success');
  } catch (e) {
    DOM.itinOutput.innerHTML = `<div class="text-center py-4"><i class="bi bi-exclamation-triangle text-danger" style="font-size:2rem"></i><p class="mt-2 text-danger">${e.message}</p></div>`;
  } finally {
    DOM.generateItinBtn.disabled = false;
    DOM.generateItinBtn.innerHTML = '<i class="bi bi-magic me-2"></i>Generate AI Itinerary';
  }
});

DOM.copyItinBtn.addEventListener('click', () => {
  const text = DOM.itinOutput.innerText;
  navigator.clipboard.writeText(text).then(() => showToast('Itinerary copied!', 'success'));
});

DOM.downloadItinBtn.addEventListener('click', () => {
  const text = DOM.downloadItinBtn.dataset.text || DOM.itinOutput.innerText;
  const dest = DOM.downloadItinBtn.dataset.dest || 'itinerary';
  const blob = new Blob([text], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href = url;
  a.download = `TravelAI-${dest.replace(/\s+/g,'-')}-itinerary.txt`;
  a.click(); URL.revokeObjectURL(url);
});

function buildSkeletonLoader() {
  return Array.from({ length: 8 }, (_, i) => `
    <div class="skeleton-block" style="width:${[80,60,90,70,85,50,75,65][i]}%;height:${i % 3 === 0 ? '22px' : '14px'}"></div>
  `).join('');
}

/* ── Budget Calculator ────────────────────────────────────────────────── */
let selectedTier = 'mid';

document.querySelectorAll('.tier-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedTier = btn.dataset.tier;
    updateLiveEstimate();
  });
});

function updateLiveEstimate() {
  const duration  = parseInt(DOM.budgetDuration.value) || 7;
  const travelers = parseInt(DOM.budgetTravelers.value) || 2;
  const tiers = {
    budget: { accommodation: 30, food: 20, transport: 10, activities: 15, misc: 10 },
    mid:    { accommodation: 80, food: 50, transport: 25, activities: 40, misc: 25 },
    luxury: { accommodation: 250,food: 150,transport: 80, activities: 120,misc: 80 },
  };
  const daily    = tiers[selectedTier] || tiers.mid;
  const flights  = travelers * 600;
  const perDay   = Object.values(daily).reduce((a,b)=>a+b,0);
  const total    = perDay * duration * travelers + flights;

  DOM.estimateBox.style.display = 'block';
  DOM.estimateTotal.textContent = `$${total.toLocaleString()}`;

  const colors = { accommodation:'#2563eb',food:'#059669',transport:'#7c3aed',activities:'#d97706',misc:'#dc2626' };
  const labels = { accommodation:'🏨 Accommodation',food:'🍽️ Food',transport:'🚌 Transport',activities:'🎟️ Activities',misc:'🎒 Misc' };

  DOM.estimateBars.innerHTML = Object.entries(daily).map(([k,v]) => {
    const lineTotal = v * duration * travelers;
    const pct       = Math.round((lineTotal / (total - flights)) * 100);
    return `
      <div class="bar-row">
        <div class="bar-label"><span>${labels[k]||k}</span><span>$${lineTotal.toLocaleString()}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${colors[k]||'var(--primary)'}"></div></div>
      </div>`;
  }).join('') + `
    <div class="bar-row" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
      <div class="bar-label"><span>✈️ Flights (est.)</span><span>$${flights.toLocaleString()}</span></div>
    </div>`;
}

[DOM.budgetDuration, DOM.budgetTravelers].forEach(el => el.addEventListener('input', updateLiveEstimate));

DOM.calcBudgetBtn.addEventListener('click', async () => {
  const destination = DOM.budgetDest.value.trim() || 'the destination';
  const duration    = parseInt(DOM.budgetDuration.value) || 7;
  const travelers   = parseInt(DOM.budgetTravelers.value) || 2;

  DOM.calcBudgetBtn.disabled = true;
  DOM.calcBudgetBtn.innerHTML = '<span class="spinner me-2"></span>Calculating…';
  DOM.budgetOutput.innerHTML  = buildSkeletonLoader();

  try {
    const res  = await fetch('/api/budget', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination, duration, travelers, budget_level: selectedTier }),
    });
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    let html = '';
    if (data.ai_analysis) {
      html += `<div class="mb-3">${renderMarkdown(data.ai_analysis)}</div>`;
    }
    html += `
      <div class="p-3 rounded-3" style="background:var(--bg-surface);border:1px solid var(--border)">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <strong>📊 Quick Summary</strong>
          <span class="badge bg-primary">${selectedTier.toUpperCase()}</span>
        </div>
        <div style="font-size:.85rem">
          <div class="d-flex justify-content-between py-1 border-bottom"><span>Duration</span><strong>${duration} days</strong></div>
          <div class="d-flex justify-content-between py-1 border-bottom"><span>Travelers</span><strong>${travelers}</strong></div>
          <div class="d-flex justify-content-between py-1 border-bottom"><span>Est. Daily / person</span><strong>$${data.daily_per_person}</strong></div>
          <div class="d-flex justify-content-between py-1 fw-bold" style="color:var(--primary)"><span>Total Estimate</span><span>$${data.total_estimate_usd?.toLocaleString()}</span></div>
        </div>
      </div>`;

    DOM.budgetOutput.innerHTML = html;
    updateLiveEstimate();
    showToast('Budget analysis complete!', 'success');
  } catch (e) {
    DOM.budgetOutput.innerHTML = `<div class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle" style="font-size:2rem"></i><p class="mt-2">${e.message}</p></div>`;
  } finally {
    DOM.calcBudgetBtn.disabled = false;
    DOM.calcBudgetBtn.innerHTML = '<i class="bi bi-calculator me-2"></i>Calculate Budget';
  }
});

// Init live estimate on page load
updateLiveEstimate();

/* ── Group Travel ─────────────────────────────────────────────────────── */
function addMember(name = '', age = 30) {
  State.memberCount++;
  const id = `m${State.memberCount}`;
  State.members.push({ id, name: name || `Traveler ${State.memberCount}`, age });
  renderMembers();
  updateCostSplitter();
}

function renderMembers() {
  DOM.membersList.innerHTML = State.members.map(m => {
    const initials = m.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
    return `
      <div class="member-item" data-id="${m.id}">
        <div class="member-avatar">${initials}</div>
        <div class="member-info">
          <input class="member-name-input" style="background:transparent;border:none;outline:none;font-weight:600;font-size:.88rem;color:var(--text);width:100%"
            value="${escapeHtml(m.name)}" data-id="${m.id}" placeholder="Name" />
          <div class="member-age">
            <input type="number" class="member-age-input" style="background:transparent;border:none;outline:none;font-size:.75rem;color:var(--text-muted);width:45px"
              value="${m.age}" data-id="${m.id}" min="1" max="100" /> yrs old
          </div>
        </div>
        <i class="bi bi-x-circle member-remove" data-id="${m.id}"></i>
      </div>`;
  }).join('') || '<p class="text-muted text-center py-2" style="font-size:.85rem">No members yet. Click Add Member.</p>';

  // Event listeners
  DOM.membersList.querySelectorAll('.member-name-input').forEach(inp => {
    inp.addEventListener('input', () => {
      const m = State.members.find(x => x.id === inp.dataset.id);
      if (m) { m.name = inp.value; updateCostSplitter(); }
    });
  });
  DOM.membersList.querySelectorAll('.member-age-input').forEach(inp => {
    inp.addEventListener('input', () => {
      const m = State.members.find(x => x.id === inp.dataset.id);
      if (m) m.age = parseInt(inp.value) || 0;
    });
  });
  DOM.membersList.querySelectorAll('.member-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      State.members = State.members.filter(m => m.id !== btn.dataset.id);
      renderMembers(); updateCostSplitter();
    });
  });
}

function updateCostSplitter() {
  const total = parseInt(DOM.groupBudget.value) || 0;
  if (!State.members.length || !total) {
    DOM.costSplitterSection.innerHTML = '<p class="text-muted text-center py-3">Add members and set a total budget.</p>';
    return;
  }
  const share = Math.round(total / State.members.length);
  DOM.costSplitterSection.innerHTML = `
    <div class="mb-2 d-flex justify-content-between" style="font-size:.85rem">
      <strong>Total Budget</strong><span style="color:var(--primary)">$${total.toLocaleString()}</span>
    </div>
    <div class="mb-3" style="font-size:.78rem;color:var(--text-muted)">
      $${share.toLocaleString()} per person (equal split)
    </div>
    <div class="cost-split-table">
      ${State.members.map(m => `
        <div class="split-row">
          <span class="split-name">${escapeHtml(m.name)}</span>
          <span class="split-share">$${share.toLocaleString()}</span>
        </div>`).join('')}
    </div>`;
}

DOM.addMemberBtn.addEventListener('click', () => addMember());
DOM.groupBudget.addEventListener('input', updateCostSplitter);

// Default 2 members
addMember('Traveler 1', 30);
addMember('Traveler 2', 28);

DOM.planGroupBtn.addEventListener('click', async () => {
  const destination = DOM.groupDest.value.trim();
  const duration    = parseInt(DOM.groupDuration.value) || 10;
  const budget      = parseInt(DOM.groupBudget.value)   || 10000;
  const groupName   = DOM.groupName.value.trim() || 'Our Group';
  const memberNames = State.members.map(m => m.name).join(', ');

  if (!destination) { showToast('Please enter a destination.', 'error'); DOM.groupDest.focus(); return; }
  if (!State.members.length) { showToast('Add at least one group member.', 'error'); return; }

  DOM.planGroupBtn.disabled = true;
  DOM.planGroupBtn.innerHTML = '<span class="spinner me-2"></span>Planning…';
  DOM.groupOutput.innerHTML  = buildSkeletonLoader();

  const prompt = `Plan a ${duration}-day group trip to ${destination} for ${State.members.length} people (${memberNames}). 
Total budget: $${budget}. Group name: "${groupName}".
Include: group activities, accommodation options for ${State.members.length} people, cost per person, 
transport coordination, group dining recommendations, and coordination tips.
Member ages: ${State.members.map(m => `${m.name} (${m.age}yrs)`).join(', ')}.`;

  try {
    const res  = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt, destination }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    DOM.groupOutput.innerHTML = renderMarkdown(data.reply || data.response || 'No plan generated.');
    if (data.context?.weather) renderWeatherWidget(data.context.weather);
    updateCostSplitter();
    showToast('Group plan generated!', 'success');
  } catch (e) {
    DOM.groupOutput.innerHTML = `<div class="text-danger py-3"><i class="bi bi-exclamation-triangle me-1"></i>${e.message}</div>`;
  } finally {
    DOM.planGroupBtn.disabled = false;
    DOM.planGroupBtn.innerHTML = '<i class="bi bi-magic me-2"></i>Generate Group Plan';
  }
});

/* ── Particles Animation (hero bg) ───────────────────────────────────── */
(function initParticles() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:.25;pointer-events:none';
  $('particles').appendChild(canvas);

  const ctx  = canvas.getContext('2d');
  let dots   = [];
  let rafId;

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  function init() {
    dots = Array.from({ length: 55 }, () => ({
      x:  Math.random() * canvas.width,
      y:  Math.random() * canvas.height,
      r:  Math.random() * 2 + 1,
      dx: (Math.random() - .5) * .5,
      dy: (Math.random() - .5) * .5,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dots.forEach(d => {
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.fill();
      d.x += d.dx; d.y += d.dy;
      if (d.x < 0 || d.x > canvas.width)  d.dx *= -1;
      if (d.y < 0 || d.y > canvas.height) d.dy *= -1;
    });
    rafId = requestAnimationFrame(draw);
  }

  resize(); init(); draw();
  window.addEventListener('resize', () => { cancelAnimationFrame(rafId); resize(); init(); draw(); });
})();

/* ── Keyboard Shortcut: / to focus search ────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault();
    DOM.chatInput.focus();
  }
});

/* ── Init ─────────────────────────────────────────────────────────────── */
updateContextBar();
