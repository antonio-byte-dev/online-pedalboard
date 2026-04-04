<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useIRLibrary } from '@/composables/useIRLibrary'

const router = useRouter()

const {
  irs, total, loading, error, params,
  uploading, uploadError,
  listIRs, uploadIR, deleteIR,
  nextPage, prevPage, hasNext, hasPrev,
  currentPage, totalPages, recordIRUsage,
  toggleFavorite,
} = useIRLibrary()

// — Search debounce —
let searchTimer = null
function onSearch(e) {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    params.search = e.target.value
    params.skip   = 0
    listIRs()
  }, 350)
}

// — Upload modal state —
const showUpload   = ref(false)
const uploadName   = ref('')
const uploadDesc   = ref('')
const uploadTags   = ref('')
const uploadFile   = ref(null)
const uploadInput  = ref(null)
const uploadSuccess = ref(false)

function openUpload() {
  showUpload.value   = true
  uploadSuccess.value = false
  uploadError.value  = null
}

function closeUpload() {
  showUpload.value = false
  uploadName.value = ''
  uploadDesc.value = ''
  uploadTags.value = ''
  uploadFile.value = null
}

function onFileSelect(e) {
  uploadFile.value = e.target.files?.[0] ?? null
}

function onIRClick(ir) {
  recordIRUsage(ir.id)  // fire-and-forget
  router.push('/pedalboard?ir=' + ir.id)
}

function toggleFavoritesFilter() {
  params.favorites_only = !params.favorites_only
  params.skip = 0
  listIRs()
}


async function submitUpload() {
  if (!uploadFile.value || !uploadName.value.trim()) return
  try {
    await uploadIR({
      name:        uploadName.value.trim(),
      description: uploadDesc.value.trim() || undefined,
      tags:        uploadTags.value.trim() || undefined,
      file:        uploadFile.value,
    })
    uploadSuccess.value = true
    setTimeout(closeUpload, 1200)
  } catch {
    // uploadError is set by the composable
  }
}

// — Delete —
const confirmDeleteId = ref(null)

async function handleDelete(id) {
  if (confirmDeleteId.value !== id) {
    // First click — ask for confirmation
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

// — Format helpers —
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

const currentUserId = () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) return null
    return JSON.parse(atob(token.split('.')[1])).sub
  } catch { return null }
}

onMounted(() => listIRs())
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
      <span class="lib-nav__title">IR Library</span>
      <button class="lib-nav__upload" @click="openUpload">
        + Upload IR
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
          placeholder="SEARCH IRs..."
          :value="params.search"
          @input="onSearch"
        />
      </div>
      <button
        class="lib-filter-btn"
        :class="{ 'is-active': params.favorites_only }"
        @click="toggleFavoritesFilter"
        title="Show favorites only"
      >
        ★ Favorites
      </button>
      <span class="lib-count">
        {{ total }} IR{{ total !== 1 ? 's' : '' }}
      </span>
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
        @click="onIRClick(ir)"
        title="Load on pedalboard"
      >
        <div class="ir-row__info">
          <span class="ir-row__name">{{ ir.name }}</span>
          <span class="ir-row__meta">
  <span v-if="ir.tags">{{ ir.tags }}</span>
  <span v-if="ir.author_username">{{ ir.author_username }}</span>  <!-- ← add -->
  <span>{{ formatSize(ir.file_size) }}</span>
  <span>{{ formatDate(ir.created_at) }}</span>
</span>

<!-- in ir-row__actions, before download button -->

        </div>

        <div class="ir-row__actions">
          <a
          class="ir-row__btn ir-row__btn--fav"
        :class="{ 'is-favorited': ir.is_favorited }"
        @click.stop="toggleFavorite(ir.id)"
        :title="ir.is_favorited ? 'Remove from favorites' : 'Add to favorites'"
            >★</a>
          <a
            class="ir-row__btn"
            :href="ir.file_url"
            target="_blank"
            download
            title="Download"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1v8M6.5 9L3 6M6.5 9L10 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="square"/>
              <path d="M1 11h11" stroke="currentColor" stroke-width="1.4" stroke-linecap="square"/>
            </svg>
          </a>
          <button
            v-if="ir.author_id === currentUserId()"
            class="ir-row__btn ir-row__btn--delete"
            :class="{ 'is-confirming': confirmDeleteId === ir.id }"
            @click="handleDelete(ir.id)"
            :title="confirmDeleteId === ir.id ? 'Click again to confirm' : 'Delete'"
          >
            {{ confirmDeleteId === ir.id ? 'Sure?' : '✕' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="lib-empty">
      <p class="lib-empty__text">No IRs found.</p>
      <button class="lib-empty__btn" @click="openUpload">Upload the first one</button>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages() > 1" class="lib-pagination">
      <button class="lib-page-btn" :disabled="!hasPrev()" @click="prevPage">← Prev</button>
      <span class="lib-page-info">{{ currentPage() }} / {{ totalPages() }}</span>
      <button class="lib-page-btn" :disabled="!hasNext()" @click="nextPage">Next →</button>
    </div>

    <!-- Upload modal -->
    <Teleport to="body">
      <div v-if="showUpload" class="modal-backdrop" @click.self="closeUpload">
        <div class="modal">

          <div class="modal__header">
            <span class="modal__title">Upload IR</span>
            <button class="modal__close" @click="closeUpload">✕</button>
          </div>

          <div class="modal__body">

            <div v-if="uploadSuccess" class="modal__success">
              IR uploaded successfully.
            </div>

            <template v-else>
              <div class="modal__field">
                <label class="modal__label">Name *</label>
                <input
                  class="modal__input"
                  v-model="uploadName"
                  placeholder="e.g. Marshall 1960A SM57"
                  maxlength="120"
                />
              </div>

              <div class="modal__field">
                <label class="modal__label">Description</label>
                <input
                  class="modal__input"
                  v-model="uploadDesc"
                  placeholder="Optional notes"
                />
              </div>

              <div class="modal__field">
                <label class="modal__label">Tags</label>
                <input
                  class="modal__input"
                  v-model="uploadTags"
                  placeholder="e.g. 4x12, vintage, bright"
                />
              </div>

              <div class="modal__field">
                <label class="modal__label">File * (.wav)</label>
                <div
                  class="modal__dropzone"
                  :class="{ 'has-file': uploadFile }"
                  @click="uploadInput?.click()"
                >
                  <span v-if="uploadFile" class="modal__dropzone-name">{{ uploadFile.name }}</span>
                  <span v-else class="modal__dropzone-hint">Click to select .wav file</span>
                  <input
                    ref="uploadInput"
                    type="file"
                    accept=".wav,.WAV"
                    style="display:none"
                    @change="onFileSelect"
                  />
                </div>
              </div>

              <div v-if="uploadError" class="modal__error">{{ uploadError }}</div>

              <button
                class="modal__submit"
                :disabled="!uploadFile || !uploadName.trim() || uploading"
                @click="submitUpload"
              >
                {{ uploading ? 'Uploading...' : 'Upload' }}
              </button>
            </template>

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

/* — Nav — */
.lib-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 32px;
  border-bottom: 1px solid var(--border, #2a2a2a);
  flex-shrink: 0;
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

.lib-nav__back  { color: var(--text-secondary, #666666); }
.lib-nav__back:hover  { color: var(--text-primary, #e8e8e8); }

.lib-nav__upload {
  color: #e8ff47;
  border: 1px solid #e8ff47;
  padding: 4px 12px;
  border-radius: 2px;
  transition: background 150ms, color 150ms;
}
.lib-nav__upload:hover {
  background: #e8ff47;
  color: #0a0a0a;
}

/* — Toolbar — */
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

/* — Error / Loading — */
.lib-error {
  margin: 24px 32px;
  padding: 10px 14px;
  border: 1px solid var(--accent-distortion, #e8340a);
  color: var(--accent-distortion, #e8340a);
  font-size: 0.65rem;
  letter-spacing: 0.05em;
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

/* — IR list — */
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
  cursor: pointer;
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
  text-decoration: none;
  transition: border-color 150ms, color 150ms;
}

.ir-row__btn:hover { border-color: var(--text-primary, #e8e8e8); color: var(--text-primary, #e8e8e8); }

.ir-row__btn--delete:hover         { border-color: var(--accent-distortion, #e8340a); color: var(--accent-distortion, #e8340a); }
.ir-row__btn--delete.is-confirming { border-color: var(--accent-distortion, #e8340a); color: var(--accent-distortion, #e8340a); width: auto; padding: 0 8px; }

/* — Empty state — */
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

/* — Pagination — */
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

/* — Modal — */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
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
  line-height: 1;
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

.modal__dropzone {
  background: var(--bg-board, #0a0a0a);
  border: 1px dashed var(--border-bright, #333333);
  padding: 18px;
  text-align: center;
  cursor: pointer;
  transition: border-color 150ms;
}
.modal__dropzone:hover,
.modal__dropzone.has-file { border-color: #e8ff47; }

.modal__dropzone-name {
  font-size: 0.65rem;
  color: #e8ff47;
  letter-spacing: 0.05em;
}
.modal__dropzone-hint {
  font-size: 0.62rem;
  color: var(--text-label, #444444);
  letter-spacing: 0.08em;
}

.modal__error {
  font-size: 0.62rem;
  color: var(--accent-distortion, #e8340a);
  letter-spacing: 0.05em;
}

.modal__success {
  padding: 20px;
  text-align: center;
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  color: var(--accent-reverb, #0ae85a);
  text-transform: uppercase;
}
.lib-filter-btn {
  font-family: var(--font-display, 'Rajdhani', sans-serif);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  background: none;
  border: 1px solid var(--border-bright, #333333);
  color: var(--text-secondary, #666666);
  padding: 4px 12px;
  border-radius: 2px;
  cursor: pointer;
  transition: all 150ms;
}
.lib-filter-btn:hover      { border-color: #e8ff47; color: #e8ff47; }
.lib-filter-btn.is-active  { border-color: #e8ff47; color: #e8ff47; background: rgba(232,255,71,0.08); }

.ir-row__btn--fav           { color: var(--text-label, #444444); }
.ir-row__btn--fav:hover     { border-color: #e8ff47; color: #e8ff47; }
.ir-row__btn--fav.is-favorited { border-color: #e8ff47; color: #e8ff47; }

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