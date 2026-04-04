<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useIRLibrary } from '@/composables/useIRLibrary'

const router = useRouter()

const {
  irs, total, loading, error, params,
  listMyIRs, deleteIR, updateIR,
  nextPage, prevPage, hasNext, hasPrev,
  currentPage, totalPages,
} = useIRLibrary()

// — Search —
let searchTimer = null
function onSearch(e) {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    params.search = e.target.value
    params.skip   = 0
    listMyIRs()
  }, 350)
}

// — Edit modal —
const showEdit   = ref(false)
const editIR     = ref(null)
const editName   = ref('')
const editTags   = ref('')
const editSaving = ref(false)
const editError  = ref(null)

function openEdit(ir) {
  editIR.value    = ir
  editName.value  = ir.name
  editTags.value  = ir.tags ?? ''
  editError.value = null
  showEdit.value  = true
}

function closeEdit() {
  showEdit.value = false
  editIR.value   = null
}

async function submitEdit() {
  if (!editName.value.trim()) return
  editSaving.value = true
  editError.value  = null
  try {
    await updateIR(editIR.value.id, {
      name: editName.value.trim(),
      tags: editTags.value.trim() || null,
    })
    closeEdit()
  } catch (e) {
    editError.value = e.message
  } finally {
    editSaving.value = false
  }
}

// — Delete —
const confirmDeleteId = ref(null)

async function handleDelete(id) {
  if (confirmDeleteId.value !== id) {
    confirmDeleteId.value = id
    setTimeout(() => { confirmDeleteId.value = null }, 3000)
    return
  }
  try {
    await deleteIR(id)
    confirmDeleteId.value = null
  } catch (e) {
    console.error(e)
  }
}

// — Helpers —
function formatSize(bytes) {
  if (!bytes) return '—'
  return bytes > 1_000_000
    ? `${(bytes / 1_000_000).toFixed(1)} MB`
    : `${(bytes / 1_000).toFixed(0)} KB`
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

onMounted(() => listMyIRs())
</script>

<template>
  <div class="library-view">

    <!-- Nav -->
    <nav class="lib-nav">
      <button class="lib-nav__back" @click="router.push('/dashboard')">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
        </svg>
        Dashboard
      </button>
      <span class="lib-nav__title">My IRs</span>
      <button class="lib-nav__upload" @click="router.push('/library')">
        Browse All
      </button>
    </nav>

    <!-- Toolbar -->
    <div class="lib-toolbar">
      <div class="lib-search">
        <svg class="lib-search__icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4" stroke="currentColor" stroke-width="1.5"/>
          <path d="M10 10L13 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
        </svg>
        <input
          class="lib-search__input"
          type="text"
          placeholder="SEARCH YOUR IRs..."
          :value="params.search"
          @input="onSearch"
        />
      </div>
      <span class="lib-count">{{ total }} IR{{ total !== 1 ? 's' : '' }}</span>
    </div>

    <!-- Error -->
    <div v-if="error" class="lib-error">{{ error }}</div>

    <!-- Loading -->
    <div v-if="loading" class="lib-loading">
      <span class="lib-loading__text">Loading...</span>
    </div>

    <!-- IR list -->
    <div v-else-if="irs.length" class="lib-list">
      <div
        v-for="ir in irs"
        :key="ir.id"
        class="ir-row"
      >
        <div class="ir-row__info">
          <span class="ir-row__name">{{ ir.name }}</span>
          <span class="ir-row__meta">
            <span v-if="ir.tags">{{ ir.tags }}</span>
            <span>{{ formatSize(ir.file_size) }}</span>
            <span>{{ formatDate(ir.created_at) }}</span>
          </span>
        </div>

        <div class="ir-row__actions">
          <button
            class="ir-row__btn ir-row__btn--edit"
            @click.stop="openEdit(ir)"
            title="Edit"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8 2L10 4L4 10H2V8L8 2Z" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/>
            </svg>
          </button>
          <button
            class="ir-row__btn ir-row__btn--delete"
            :class="{ 'is-confirming': confirmDeleteId === ir.id }"
            @click.stop="handleDelete(ir.id)"
            :title="confirmDeleteId === ir.id ? 'Click again to confirm' : 'Delete'"
          >
            {{ confirmDeleteId === ir.id ? 'Sure?' : '✕' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="lib-empty">
      <p class="lib-empty__text">You haven't uploaded any IRs yet.</p>
      <button class="lib-empty__btn" @click="router.push('/library')">Go to library</button>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages() > 1" class="lib-pagination">
      <button class="lib-page-btn" :disabled="!hasPrev()" @click="prevPage">← Prev</button>
      <span class="lib-page-info">{{ currentPage() }} / {{ totalPages() }}</span>
      <button class="lib-page-btn" :disabled="!hasNext()" @click="nextPage">Next →</button>
    </div>

    <!-- Edit modal -->
    <Teleport to="body">
      <div v-if="showEdit" class="modal-backdrop" @click.self="closeEdit">
        <div class="modal">
          <div class="modal__header">
            <span class="modal__title">Edit IR</span>
            <button class="modal__close" @click="closeEdit">✕</button>
          </div>
          <div class="modal__body">
            <div class="modal__field">
              <label class="modal__label">Name *</label>
              <input
                class="modal__input"
                v-model="editName"
                placeholder="IR name"
                maxlength="120"
              />
            </div>
            <div class="modal__field">
              <label class="modal__label">Tags</label>
              <input
                class="modal__input"
                v-model="editTags"
                placeholder="e.g. 4x12, vintage, bright"
              />
            </div>
            <div v-if="editError" class="modal__error">{{ editError }}</div>
            <button
              class="modal__submit"
              :disabled="!editName.trim() || editSaving"
              @click="submitEdit"
            >
              {{ editSaving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
.library-view {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  font-family: var(--font-ui, 'DM Mono', monospace);
}

.lib-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 32px;
  border-bottom: 1px solid var(--border, #2a2a2a);
}

.lib-nav__title {
  font-family: var(--font-display, 'Rajdhani', sans-serif);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-label, #444444);
}

.lib-nav__back,
.lib-nav__upload {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-display, 'Rajdhani', sans-serif);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 0;
  transition: color 150ms;
}

.lib-nav__back { color: var(--text-secondary, #666666); }
.lib-nav__back:hover { color: var(--text-primary, #e8e8e8); }

.lib-nav__upload {
  color: #e8ff47;
  border: 1px solid #e8ff47;
  padding: 4px 12px;
  border-radius: 2px;
  transition: background 150ms, color 150ms;
}
.lib-nav__upload:hover { background: #e8ff47; color: #0a0a0a; }

.lib-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 32px;
  border-bottom: 1px solid var(--border, #2a2a2a);
}

.lib-search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-pedal, #111111);
  border: 1px solid var(--border, #2a2a2a);
  padding: 6px 12px;
  max-width: 360px;
}

.lib-search__icon { color: var(--text-label, #444444); flex-shrink: 0; }

.lib-search__input {
  background: none;
  border: none;
  outline: none;
  color: var(--text-primary, #e8e8e8);
  font-family: var(--font-display, 'Rajdhani', sans-serif);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  width: 100%;
}
.lib-search__input::placeholder { color: var(--text-label, #444444); }

.lib-count {
  font-size: 0.6rem;
  color: var(--text-label, #444444);
  letter-spacing: 0.1em;
  white-space: nowrap;
}

.lib-error {
  margin: 24px 32px;
  padding: 10px 14px;
  border: 1px solid var(--accent-distortion, #e8340a);
  color: var(--accent-distortion, #e8340a);
  font-size: 0.65rem;
}

.lib-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px;
}

.lib-loading__text {
  font-size: 0.65rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-label, #444444);
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

.lib-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 8px 32px;
  gap: 2px;
}

.ir-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 14px;
  border: 1px solid transparent;
  border-bottom-color: var(--border, #2a2a2a);
  transition: background 150ms, border-color 150ms;
}

.ir-row:hover {
  background: var(--bg-pedal, #111111);
  border-color: var(--border-bright, #333333);
}

.ir-row__info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.ir-row__name {
  font-family: var(--font-display, 'Rajdhani', sans-serif);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-primary, #e8e8e8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ir-row__meta {
  display: flex;
  gap: 12px;
  font-size: 0.6rem;
  color: var(--text-label, #444444);
  letter-spacing: 0.05em;
}

.ir-row__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 150ms;
}
.ir-row:hover .ir-row__actions { opacity: 1; }

.ir-row__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: none;
  border: 1px solid var(--border-bright, #333333);
  color: var(--text-secondary, #666666);
  font-size: 0.6rem;
  cursor: pointer;
  transition: border-color 150ms, color 150ms;
}

.ir-row__btn--edit:hover { border-color: #e8ff47; color: #e8ff47; }
.ir-row__btn--delete:hover { border-color: var(--accent-distortion, #e8340a); color: var(--accent-distortion, #e8340a); }
.ir-row__btn--delete.is-confirming { border-color: var(--accent-distortion, #e8340a); color: var(--accent-distortion, #e8340a); width: auto; padding: 0 8px; }

.lib-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 64px;
}

.lib-empty__text {
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  color: var(--text-label, #444444);
}

.lib-empty__btn {
  font-family: var(--font-display, 'Rajdhani', sans-serif);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  background: none;
  border: 1px solid #e8ff47;
  color: #e8ff47;
  padding: 8px 20px;
  cursor: pointer;
  transition: background 150ms, color 150ms;
}
.lib-empty__btn:hover { background: #e8ff47; color: #0a0a0a; }

.lib-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px 32px;
  border-top: 1px solid var(--border, #2a2a2a);
}

.lib-page-btn {
  font-family: var(--font-display, 'Rajdhani', sans-serif);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  background: none;
  border: 1px solid var(--border-bright, #333333);
  color: var(--text-secondary, #666666);
  padding: 5px 14px;
  cursor: pointer;
  transition: all 150ms;
}
.lib-page-btn:hover:not(:disabled) { border-color: var(--text-primary); color: var(--text-primary); }
.lib-page-btn:disabled { opacity: 0.25; cursor: not-allowed; }

.lib-page-info {
  font-size: 0.6rem;
  color: var(--text-label, #444444);
  letter-spacing: 0.1em;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(3px);
}

.modal {
  background: var(--bg-pedal, #111111);
  border: 1px solid var(--border-bright, #333333);
  width: 100%;
  max-width: 440px;
  animation: slide-up 200ms ease both;
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border, #2a2a2a);
  background: var(--bg-pedal-top, #161616);
}

.modal__title {
  font-family: var(--font-display, 'Rajdhani', sans-serif);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--text-secondary, #666666);
}

.modal__close {
  background: none;
  border: none;
  color: var(--text-label, #444444);
  cursor: pointer;
  font-size: 0.75rem;
  padding: 2px 6px;
  transition: color 150ms;
}
.modal__close:hover { color: var(--text-primary, #e8e8e8); }

.modal__body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal__field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.modal__label {
  font-family: var(--font-display, 'Rajdhani', sans-serif);
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-label, #444444);
}

.modal__input {
  background: var(--bg-board, #0a0a0a);
  border: 1px solid var(--border, #2a2a2a);
  color: var(--text-primary, #e8e8e8);
  font-family: var(--font-ui, 'DM Mono', monospace);
  font-size: 0.7rem;
  padding: 8px 10px;
  outline: none;
  transition: border-color 150ms;
  width: 100%;
  box-sizing: border-box;
}
.modal__input:focus { border-color: var(--border-bright, #333333); }

.modal__error {
  font-size: 0.62rem;
  color: var(--accent-distortion, #e8340a);
  letter-spacing: 0.05em;
}

.modal__submit {
  font-family: var(--font-display, 'Rajdhani', sans-serif);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  background: #e8ff47;
  border: none;
  color: #0a0a0a;
  padding: 10px;
  cursor: pointer;
  width: 100%;
  transition: opacity 150ms;
}
.modal__submit:disabled { opacity: 0.35; cursor: not-allowed; }
.modal__submit:hover:not(:disabled) { opacity: 0.85; }
</style>