import { ref, reactive } from 'vue'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function useIRLibrary() {
  // — State —
  const irs     = ref([])
  const total   = ref(0)
  const loading = ref(false)
  const error   = ref(null)

  const params = reactive({
    search: '',
    tags:   '',
    skip:   0,
    limit:  20,
    favorites_only: false,
  })

  //Record last IR
  async function recordIRUsage(irId) {
  const token = localStorage.getItem('token')
  if (!token) return
  await fetch(`${BASE_URL}/irs/${irId}/use`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}
//Fetch last used IR per user
async function fetchRecentIR() {
  const token = localStorage.getItem('token')
  if (!token) return null
  const res = await fetch(`${BASE_URL}/auth/me/recent-ir`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return await res.json()   // null if no recent IR (FastAPI returns JSON null)
}
  // — Fetch list —
  async function listIRs(overrides = {}) {
    loading.value = true
    error.value   = null

    const p = { ...params, ...overrides }
    const query = new URLSearchParams()
    if (p.search) query.set('search', p.search)
    if (p.tags)   query.set('tags',   p.tags)
    if (p.favorites_only) query.set('favorites_only', 'true')
    query.set('skip',  p.skip)
    query.set('limit', p.limit)

    try {
      const res = await fetch(`${BASE_URL}/irs/?${query}`, {
        headers: authHeaders()
      })
      if (!res.ok) throw new Error(`Failed to fetch IRs (${res.status})`)
      const data = await res.json()
      irs.value   = data.items
      total.value = data.total
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  // — Fetch single IR —
  async function getIR(id) {
    const res = await fetch(`${BASE_URL}/irs/${id}`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`IR not found (${res.status})`)
    return res.json()
  }

  // — Fetch WAV ArrayBuffer for loading into ConvolverNode —
  async function fetchIRArrayBuffer(ir) {
    const res = await fetch(ir.file_url)
    if (!res.ok) throw new Error(`Could not fetch IR audio (${res.status})`)
    return res.arrayBuffer()
  }

  // — Upload —
  const uploading    = ref(false)
  const uploadError  = ref(null)

  async function uploadIR({ name, description, tags, file }) {
    if (!file) throw new Error('A .wav file is required')
    uploading.value   = true
    uploadError.value = null

    const form = new FormData()
    form.append('name', name)
    form.append('file', file)
    if (description) form.append('description', description)
    if (tags)        form.append('tags', tags)

    try {
      const res = await fetch(`${BASE_URL}/irs/`, {
        method:  'POST',
        headers: authHeaders(),   // no Content-Type — let browser set multipart boundary
        body:    form,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail ?? `Upload failed (${res.status})`)
      }
      const created = await res.json()
      // Prepend to local list so it appears immediately
      irs.value   = [created, ...irs.value]
      total.value += 1
      return created
    } catch (err) {
      uploadError.value = err.message
      throw err
    } finally {
      uploading.value = false
    }
  }

  // — Delete —
  async function deleteIR(id) {
    const res = await fetch(`${BASE_URL}/irs/${id}`, {
      method:  'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) throw new Error(`Delete failed (${res.status})`)
    irs.value   = irs.value.filter(ir => ir.id !== id)
    total.value -= 1
  }
  // — Update —
async function updateIR(id, { name, tags }) {
  const res = await fetch(`${BASE_URL}/irs/${id}`, {
    method:  'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name, tags }),
  })
  if (!res.ok) throw new Error(`Update failed (${res.status})`)
  const updated = await res.json()
  const idx = irs.value.findIndex(ir => ir.id === id)
  if (idx !== -1) irs.value[idx] = updated
  return updated
}

// — My IRs —
async function listMyIRs(overrides = {}) {
  loading.value = true
  error.value   = null
  const p = { ...params, ...overrides }
  const query = new URLSearchParams()
  if (p.search) query.set('search', p.search)
  query.set('skip',  p.skip)
  query.set('limit', p.limit)
  try {
    const res = await fetch(`${BASE_URL}/irs/mine?${query}`, {
      headers: authHeaders(),
    })
    if (!res.ok) throw new Error(`Failed to fetch your IRs (${res.status})`)
    const data = await res.json()
    irs.value   = data.items
    total.value = data.total
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function toggleFavorite(id) {
  const ir = irs.value.find(ir => ir.id === id)
  if (!ir) return
  const method = ir.is_favorited ? 'DELETE' : 'POST'
  const res = await fetch(`${BASE_URL}/irs/${id}/favorite`, {
    method,
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`Favorite toggle failed (${res.status})`)
  ir.is_favorited = !ir.is_favorited
}

  // — Pagination helpers —
  function nextPage() {
    params.skip += params.limit
    listIRs()
  }

  function prevPage() {
    params.skip = Math.max(0, params.skip - params.limit)
    listIRs()
  }

  function search(term) {
    params.search = term
    params.skip   = 0
    listIRs()
  }

  function filterByTag(tag) {
    params.tags = tag
    params.skip = 0
    listIRs()
  }
  function isAdmin() {
  try {
    const token = localStorage.getItem('token')
    if (!token) return false
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.is_admin === true
  } catch { return false }
}

  const currentPage = () => Math.floor(params.skip / params.limit) + 1
  const totalPages  = () => Math.ceil(total.value / params.limit)
  const hasNext     = () => params.skip + params.limit < total.value
  const hasPrev     = () => params.skip > 0

  return {
    // state
    irs, total, loading, error, params,
    uploading, uploadError,
    // actions
    listIRs, getIR, fetchIRArrayBuffer, uploadIR, deleteIR,
    recordIRUsage,fetchRecentIR,
    updateIR,listMyIRs,toggleFavorite,isAdmin,
    // pagination
    nextPage, prevPage, search, filterByTag,
    currentPage, totalPages, hasNext, hasPrev,
  }
}