<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const router = useRouter()
const email    = ref('')
const sent     = ref(false)
const error    = ref(null)
const loading  = ref(false)

async function submit() {
  loading.value = true
  error.value   = null
  try {
    const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: email.value }),
    })
    if (!res.ok) throw new Error('Something went wrong')
    sent.value = true
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
      <h2>RESET PASSWORD</h2>

      <div v-if="sent" class="auth-success">
        If that email exists, a reset link has been sent.
      </div>

      <template v-else>
        <input
          class="auth-input"
          v-model="email"
          type="email"
          placeholder="EMAIL"
        />
        <div v-if="error" class="auth-error">{{ error }}</div>
        <button class="auth-btn" :disabled="loading" @click="submit">
          {{ loading ? 'Sending...' : 'Send Reset Link' }}
        </button>
      </template>

      <p class="auth-switch">
        <span @click="router.push('/')">Back to login</span>
      </p>
    </div>
  </div>
</template>