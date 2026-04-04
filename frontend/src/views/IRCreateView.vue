<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useIRLibrary } from '@/composables/useIRLibrary'

const router = useRouter()
const { uploadIR, uploading, uploadError } = useIRLibrary()

const name        = ref('')
const description = ref('')
const tags        = ref('')
const success     = ref(false)

async function submit() {
  if (!name.value.trim()) return
  try {
    await uploadIR({
      name:        name.value.trim(),
      description: description.value.trim() || undefined,
      tags:        tags.value.trim()        || undefined,
      file:        null,   // composable generates a dummy WAV
    })
    success.value = true
  } catch {
    // uploadError set by composable
  }
}

function reset() {
  name.value        = ''
  description.value = ''
  tags.value        = ''
  success.value     = false
}
</script>

<template>
  <div class="create-view">

    <!-- Nav -->
    <nav class="create-nav">
      <button class="create-nav__back" @click="router.push('/library')">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
        </svg>
        Library
      </button>
      <span class="create-nav__title">New IR Entry</span>
      <span />
    </nav>

    <!-- Form -->
    <div class="create-body">
      <div class="create-card">

        <!-- Success state -->
        <div v-if="success" class="create-success">
          <p class="create-success__msg">IR entry created.</p>
          <div class="create-success__actions">
            <button class="create-btn create-btn--ghost" @click="reset">Add another</button>
            <button class="create-btn create-btn--primary" @click="router.push('/library')">View library</button>
          </div>
        </div>

        <!-- Form fields -->
        <template v-else>
          <div class="create-field">
            <label class="create-label">Name *</label>
            <input
              class="create-input"
              v-model="name"
              placeholder="e.g. Marshall 1960A SM57"
              maxlength="120"
              @keydown.enter="submit"
            />
          </div>

          <div class="create-field">
            <label class="create-label">Description</label>
            <input
              class="create-input"
              v-model="description"
              placeholder="Optional notes about the cabinet, mic placement…"
            />
          </div>

          <div class="create-field">
            <label class="create-label">Tags</label>
            <input
              class="create-input"
              v-model="tags"
              placeholder="marshall, 4x12, v30, sm57"
            />
            <span class="create-hint">Comma-separated</span>
          </div>

          <div v-if="uploadError" class="create-error">{{ uploadError }}</div>

          <div class="create-actions">
            <button class="create-btn create-btn--ghost" @click="router.push('/library')">
              Cancel
            </button>
            <button
              class="create-btn create-btn--primary"
              :disabled="!name.trim() || uploading"
              @click="submit"
            >
              {{ uploading ? 'Creating…' : 'Create Entry' }}
            </button>
          </div>
        </template>

      </div>
    </div>

  </div>
</template>

<style scoped>
.create-view {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  font-family: var(--font-ui, 'DM Mono', monospace);
}

/* — Nav — */
.create-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 32px;
  border-bottom: 1px solid var(--border, #2a2a2a);
  flex-shrink: 0;
}

.create-nav__title {
  font-family: var(--font-display, 'Rajdhani', sans-serif);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-label, #444444);
}

.create-nav__back {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-display, 'Rajdhani', sans-serif);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-secondary, #666666);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 150ms;
}
.create-nav__back:hover { color: var(--text-primary, #e8e8e8); }

/* — Body — */
.create-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
}

.create-card {
  width: 100%;
  max-width: 480px;
  background: var(--bg-pedal, #111111);
  border: 1px solid var(--border, #2a2a2a);
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 28px;
}

/* — Fields — */
.create-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.create-label {
  font-family: var(--font-display, 'Rajdhani', sans-serif);
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-label, #444444);
}

.create-input {
  background: var(--bg-board, #0a0a0a);
  border: 1px solid var(--border, #2a2a2a);
  color: var(--text-primary, #e8e8e8);
  font-family: var(--font-ui, 'DM Mono', monospace);
  font-size: 0.72rem;
  padding: 9px 12px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 150ms;
}
.create-input:focus         { border-color: var(--border-bright, #333333); }
.create-input::placeholder  { color: var(--text-label, #444444); }

.create-hint {
  font-size: 0.58rem;
  color: var(--text-label, #444444);
  letter-spacing: 0.05em;
}

/* — Error — */
.create-error {
  font-size: 0.62rem;
  color: var(--accent-distortion, #e8340a);
  letter-spacing: 0.05em;
  padding: 8px 10px;
  border: 1px solid var(--accent-distortion, #e8340a);
}

/* — Actions — */
.create-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding-top: 4px;
}

.create-btn {
  font-family: var(--font-display, 'Rajdhani', sans-serif);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  padding: 9px 20px;
  border: 1px solid;
  cursor: pointer;
  transition: background 150ms, color 150ms, opacity 150ms;
}

.create-btn--primary {
  background: #e8ff47;
  border-color: #e8ff47;
  color: #0a0a0a;
}
.create-btn--primary:hover:not(:disabled) { opacity: 0.85; }
.create-btn--primary:disabled { opacity: 0.3; cursor: not-allowed; }

.create-btn--ghost {
  background: transparent;
  border-color: var(--border-bright, #333333);
  color: var(--text-secondary, #666666);
}
.create-btn--ghost:hover { border-color: var(--text-primary); color: var(--text-primary); }

/* — Success — */
.create-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 12px 0;
}

.create-success__msg {
  font-size: 0.65rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent-reverb, #0ae85a);
}

.create-success__actions {
  display: flex;
  gap: 10px;
}
</style>
