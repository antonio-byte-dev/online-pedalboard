<template>
  <div class="dashboard">

    <!-- Scan-line boot effect -->
    <div class="dashboard__scanline" :class="{ 'dashboard__scanline--done': booted }" />

    <!-- Header -->
    <header class="dashboard__header">
  <div class="dashboard__greeting">
    <span class="dashboard__eyebrow">Signal path ready</span>
    <h1 class="dashboard__title">YOUR RIG</h1>
  </div>
  <div class="dashboard__header-right">
    <div class="dashboard__status">
      <span class="status-dot" />
      <span class="status-label">{{ statusLabel }}</span>
    </div>
    <button class="dashboard__logout" @click="logout">
      Log out
    </button>
  </div>
</header>

    <!-- Stats row -->
    <section class="dashboard__stats">
      <div class="stat-card" v-for="stat in stats" :key="stat.label">
        <span class="stat-card__value" :class="{ 'stat-card__value--loading': statsLoading }">{{ stat.value }}</span>
        <span class="stat-card__label">{{ stat.label }}</span>
      </div>
    </section>

    <!-- Action cards -->
<section class="dashboard__actions">

  <button class="action-card action-card--primary" @click="router.push('/library')">
    <div class="action-card__icon">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="3" y="6" width="26" height="20" rx="2" stroke="currentColor" stroke-width="1.5"/>
        <line x1="3" y1="12" x2="29" y2="12" stroke="currentColor" stroke-width="1"/>
        <line x1="3" y1="18" x2="29" y2="18" stroke="currentColor" stroke-width="1"/>
        <line x1="10" y1="6" x2="10" y2="26" stroke="currentColor" stroke-width="1"/>
      </svg>
    </div>
    <div class="action-card__text">
      <span class="action-card__title">Browse IRs</span>
      <span class="action-card__desc">Explore the cabinet library</span>
    </div>
    <span class="action-card__arrow">→</span>
  </button>

  <button class="action-card" @click="router.push('/my-irs')">
    <div class="action-card__icon">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="2" stroke="currentColor" stroke-width="1.5"/>
        <line x1="9" y1="11" x2="23" y2="11" stroke="currentColor" stroke-width="1.5"/>
        <line x1="9" y1="16" x2="23" y2="16" stroke="currentColor" stroke-width="1.5"/>
        <line x1="9" y1="21" x2="16" y2="21" stroke="currentColor" stroke-width="1.5"/>
      </svg>
    </div>
    <div class="action-card__text">
      <span class="action-card__title">My IRs</span>
      <span class="action-card__desc">Manage your uploads</span>
    </div>
    <span class="action-card__arrow">→</span>
  </button>

  <button class="action-card" @click="router.push('/pedalboard/')">
    <div class="action-card__icon">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="2"  y="10" width="28" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="9"  cy="16" r="3" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="16" cy="16" r="3" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="23" cy="16" r="3" stroke="currentColor" stroke-width="1.5"/>
        <line x1="2" y1="16" x2="6" y2="16" stroke="currentColor" stroke-width="1.5"/>
        <line x1="26" y1="16" x2="30" y2="16" stroke="currentColor" stroke-width="1.5"/>
      </svg>
    </div>
    <div class="action-card__text">
      <span class="action-card__title">Pedalboard</span>
      <span class="action-card__desc">Open your signal chain</span>
    </div>
    <span class="action-card__arrow">→</span>
  </button>

</section>

    <!-- Recent IRs -->
    <section class="dashboard__recent" v-if="recentIRs.length">
      <h2 class="dashboard__section-title">Recently Used</h2>
      <div class="recent-list">
        <div
          class="recent-item"
          v-for="ir in recentIRs"
          :key="ir.id"
          @click="router.push('/pedalboard?ir=' + ir.id)"
        >
          <div class="recent-item__waveform">
            <svg width="48" height="24" viewBox="0 0 48 24" preserveAspectRatio="none">
              <polyline
                :points="ir.wavePoints"
                fill="none"
                stroke="#e8ff47"
                stroke-width="1.2"
                opacity="0.7"
              />
            </svg>
          </div>
          <div class="recent-item__info">
            <span class="recent-item__name">{{ ir.name }}</span>
            <span class="recent-item__meta">{{ ir.meta }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Empty recent state -->
    <section class="dashboard__recent" v-else>
      <h2 class="dashboard__section-title">Recently Used</h2>
      <div class="recent-empty">
        <span>── No IRs loaded yet. Browse the library to get started. ──</span>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const router = useRouter()
const booted = ref(false)
const statsLoading = ref(true)

const statusLabel = ref('Audio engine idle')
const recentIRs = ref([])

const stats = ref([
  { value: '—', label: 'Total IRs' },
  { value: '—', label: 'Last Login' },
  { value: '—', label: 'Your Uploads' },
  { value: '44.1', label: 'kHz' },
])

function logout() {
  localStorage.removeItem('token')
  router.push('/')
}
function formatLastLogin(iso) {
  if (!iso) return 'Never'
  const d = new Date(iso)
  const diffMins  = Math.floor((Date.now() - d) / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays  = Math.floor(diffHours / 24)
  if (diffMins  < 1)  return 'Just now'
  if (diffMins  < 60) return diffMins + 'm ago'
  if (diffHours < 24) return diffHours + 'h ago'
  if (diffDays  < 7)  return diffDays + 'd ago'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

async function fetchStats() {
  statsLoading.value = true
  try {
    const token = localStorage.getItem('token')
    const res = await fetch(`${BASE_URL}/auth/me/stats`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if (!res.ok) throw new Error('Failed to fetch stats')
    const data = await res.json()
    stats.value = [
      { value: String(data.total_irs),             label: 'Total IRs' },
      { value: formatLastLogin(data.last_login),    label: 'Last Login' },
      { value: String(data.user_uploads),           label: 'Your Uploads' },
      { value: '44.1',                              label: 'kHz' },
    ]
  } catch (e) {
    console.error('Stats fetch failed:', e)
  } finally {
    statsLoading.value = false
  }
}

function generateWavePoints() {
  const points = []
  for (let x = 0; x <= 48; x += 3) {
    const y = 12 + (Math.random() - 0.5) * 16
    points.push(`${x},${y}`)
  }
  return points.join(' ')
}

async function fetchRecentIR() {
  const token = localStorage.getItem('token')
  if (!token) return

  try {
    const res = await fetch(`${BASE_URL}/auth/me/recent-ir`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const ir = await res.json()
    if (!ir) return

    recentIRs.value = [{
      id:         ir.id,
      name:       ir.name,
      meta:       ir.duration ? `${ir.duration.toFixed(1)}s` : '',
      usedAt:     formatLastLogin(ir.last_used_at),  // reuse your existing formatter
      wavePoints: generateWavePoints(),
    }]
  } catch (e) {
    console.error('Recent IR fetch failed:', e)
  }
}




onMounted(() => {
  setTimeout(() => { booted.value = true }, 800)
  fetchStats()
  fetchRecentIR() 
})


</script>

<style scoped>
/* — Layout — */
.dashboard__header-right {
  display: flex;
  align-items: center;
  gap: 20px;
  padding-bottom: 4px;
}

.dashboard__logout {
  font-family: var(--font-display, 'Rajdhani', sans-serif);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  background: none;
  border: 1px solid rgba(255,255,255,0.08);
  color: #d0d0d0;
  padding: 4px 12px;
  border-radius: 2px;
  cursor: pointer;
  transition: border-color 150ms, color 150ms;
}
.dashboard__logout:hover {
  border-color: #e8340a;
  color: #e8340a;
}
.dashboard {
  box-sizing: border-box;
  width: 100%;
  flex: 1;

  padding: 48px;
  display: flex;
  flex-direction: column;
  gap: 40px;
  position: relative;
  overflow-x: hidden;
}

/* Grid texture */


/* Radial accent glow in top-left */


.dashboard > * { position: relative; z-index: 1; }


.dashboard__scanline--done {
  opacity: 0;
  transition: opacity 0.4s;
}
@keyframes scanline-sweep {
  from { transform: translateY(-100%); opacity: 0.6; }
  to   { transform: translateY(100vh); opacity: 0; }
}

/* — Header — */
.dashboard__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding-bottom: 24px;
  animation: fade-up 0.5s ease both;
}

.dashboard__eyebrow {
  display: block;
  font-family: var(--font-mono, 'DM Mono', monospace);
  font-size: 0.65rem;
  color: #606070;
  letter-spacing: 0.1em;
  margin-bottom: 6px;
}

.dashboard__title {
  font-family: var(--font-display, 'Rajdhani', sans-serif);
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #f0f0f4;
  line-height: 1;
}

.dashboard__status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 4px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #47ffb8;
  box-shadow: 0 0 8px #47ffb8;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

.status-label {
  font-family: var(--font-mono, 'DM Mono', monospace);
  font-size: 0.65rem;
  color: #606070;
  letter-spacing: 0.08em;
}

/* — Stats — */
.dashboard__stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  animation: fade-up 0.5s 0.1s ease both;
}

@media (max-width: 640px) {
  .dashboard__stats { grid-template-columns: repeat(2, 1fr); }
}

.stat-card {
  background: #111114;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 4px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-card__value {
  font-family: var(--font-mono, 'DM Mono', monospace);
  font-size: 1.6rem;
  font-weight: 500;
  color: #e8ff47;
  line-height: 1;
  letter-spacing: -0.02em;
}

.stat-card__label {
  font-family: var(--font-display, 'Rajdhani', sans-serif);
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #606070;
}

/* — Action cards — */
.dashboard__actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  animation: fade-up 0.5s 0.2s ease both;
}

@media (max-width: 768px) {
  .dashboard__actions { grid-template-columns: 1fr; }
}

.action-card {
  background: #18181c;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 6px;
  padding: 24px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: border-color 200ms, box-shadow 200ms, transform 120ms;
  position: relative;
  overflow: hidden;
}

/* Top accent line revealed on hover */
.action-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: #e8ff47;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 250ms ease;
}

.action-card:hover {
  border-color: rgba(232,255,71,0.3);
  box-shadow: 0 0 24px rgba(232,255,71,0.08);
  transform: translateY(-2px);
}

.action-card:hover::before {
  transform: scaleX(1);
}

.action-card:active {
  transform: translateY(0) scale(0.99);
}

/* Primary variant — pedalboard CTA */
.action-card--primary {
  border-color: rgba(232,255,71,0.25);
  background: #1a1a18;
}

.action-card--primary::before {
  transform: scaleX(1); /* always visible */
  background: #e8ff47;
}

.action-card--primary:hover {
  border-color: #e8ff47;
  box-shadow: 0 0 32px rgba(232,255,71,0.15);
}

.action-card__icon {
  color: #e8ff47;
  flex-shrink: 0;
  opacity: 0.8;
  transition: opacity 200ms;
}
.action-card:hover .action-card__icon { opacity: 1; }

.action-card__text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}

.action-card__title {
  font-family: var(--font-display, 'Rajdhani', sans-serif);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #f0f0f4;
}

.action-card__desc {
  font-family: var(--font-mono, 'DM Mono', monospace);
  font-size: 0.65rem;
  color: #606070;
  letter-spacing: 0.04em;
}

.action-card__arrow {
  font-size: 1.1rem;
  color: #e8ff47;
  opacity: 0;
  transform: translateX(-6px);
  transition: opacity 200ms, transform 200ms;
  flex-shrink: 0;
}
.action-card:hover .action-card__arrow {
  opacity: 1;
  transform: translateX(0);
}

/* — Recent IRs — */
.dashboard__recent {
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: fade-up 0.5s 0.3s ease both;
}

.dashboard__section-title {
  font-family: var(--font-display, 'Rajdhani', sans-serif);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #606070;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recent-item {
  display: grid;
  grid-template-columns: 56px 1fr auto;
  align-items: center;
  gap: 16px;
  padding: 10px 14px;
  background: #111114;
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 150ms, background 150ms;
}

.recent-item:hover {
  background: #18181c;
  border-color: rgba(232,255,71,0.2);
}

.recent-item__waveform {
  display: flex;
  align-items: center;
}

.recent-item__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.recent-item__name {
  font-family: var(--font-display, 'Rajdhani', sans-serif);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #f0f0f4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-item__meta {
  font-family: var(--font-mono, 'DM Mono', monospace);
  font-size: 0.6rem;
  color: #606070;
}

.recent-item__time {
  font-family: var(--font-mono, 'DM Mono', monospace);
  font-size: 0.6rem;
  color: #404050;
  white-space: nowrap;
  flex-shrink: 0;
}

.recent-empty {
  padding: 24px;
  text-align: center;
  font-family: var(--font-mono, 'DM Mono', monospace);
  font-size: 0.65rem;
  color: #404050;
  letter-spacing: 0.08em;
  background: #111114;
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 4px;
}

/* — Shared animation — */
.stat-card__value--loading {
  opacity: 0.3;
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 0.3; }
  50%       { opacity: 0.1; }
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>