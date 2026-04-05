<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const router = useRouter()
const route  = useRoute()

const token       = ref('')
const newPassword = ref('')
const done        = ref(false)
const error       = ref(null)
const loading     = ref(false)

onMounted(() => {
  token.value = route.query.token ?? ''
  if (!token.value) router.push('/')
})

async function submit() {
  loading.value = true
  error.value   = null
  try {
    const res = await fetch(`${BASE_URL}/auth/reset-password`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token: token.value, new_password: newPassword.value }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.detail ?? 'Reset failed')
    }
    done.value = true
    setTimeout(() => router.push('/'), 2000)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-view">
    <div class="auth-box">
      <h2>NEW PASSWORD</h2>

      <div v-if="done" class="auth-success">
        Password updated. Redirecting to login...
      </div>

      <template v-else>
        <input
          class="auth-input"
          v-model="newPassword"
          type="password"
          placeholder="NEW PASSWORD"
        />
        <div v-if="error" class="auth-error">{{ error }}</div>
        <button class="auth-btn" :disabled="loading || !newPassword" @click="submit">
          {{ loading ? 'Saving...' : 'Set New Password' }}
        </button>
      </template>
    </div>
  </div>
</template>