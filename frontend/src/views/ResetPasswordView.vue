<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import BasePanel from '@/components/ui/BasePanel.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

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
    <BasePanel class="auth-box">
      <h2>NEW PASSWORD</h2>

      <div v-if="done" class="auth-success">
        Password updated. Redirecting to login...
      </div>

      <template v-else>
        <BaseInput v-model="newPassword" type="password" placeholder="NEW PASSWORD" />
        <div v-if="error" class="auth-error">{{ error }}</div>
        <BaseButton
          class="auth-btn"
          :disabled="loading || !newPassword"
          @click="submit"
        >
          {{ loading ? 'Saving...' : 'Set New Password' }}
        </BaseButton>
      </template>

      <p class="switch">
        <span @click="router.push('/')">Back to login</span>
      </p>
    </BasePanel>
  </div>
</template>

<style scoped>
.auth-view {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-box {
  width: 340px;
  padding: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.auth-box :deep(input) {
  width: 100%;
  box-sizing: border-box;
}

.auth-box :deep(button) {
  width: 100%;
  white-space: nowrap;
  color: var(--text-primary);
}

h2 {
  font-family: var(--font-display);
  letter-spacing: 0.3em;
  font-size: 0.8em;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.auth-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display, 'Rajdhani', sans-serif);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #e8ff47;
  border: 1px solid #e8ff47;
  background: none;
  padding: 4px 12px;
  border-radius: 2px;
  cursor: pointer;
  transition: background 150ms, color 150ms;
  width: 100%;
}
.auth-btn:hover:not(:disabled) {
  background: #e8ff47;
  color: #0a0a0a;
}
.auth-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.auth-error {
  font-family: var(--font-ui, 'DM Mono', monospace);
  font-size: 0.62rem;
  color: #e8340a;
  letter-spacing: 0.05em;
  text-align: center;
}

.auth-success {
  font-family: var(--font-ui, 'DM Mono', monospace);
  font-size: 0.62rem;
  color: #0ae85a;
  letter-spacing: 0.05em;
  text-align: center;
}

.switch {
  margin-top: 12px;
  font-size: 0.6em;
  color: var(--text-secondary);
  text-align: center;
}

.switch span {
  cursor: pointer;
  color: var(--text-primary);
}

.switch span:hover {
  text-decoration: underline;
}
</style>