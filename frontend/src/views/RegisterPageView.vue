<template>
  <div class="auth">
    <BasePanel class="auth-box">
      <h2>CREATE RIG</h2>
      <BaseInput v-model="username" placeholder="USERNAME" />
      <BaseInput v-model="email" placeholder="EMAIL" />
      <BaseInput v-model="password" type="password" placeholder="PASSWORD" />
      <BaseInput v-model="confirmPassword" type="password" placeholder="CONFIRM PASSWORD" />

      <Button class="lib-nav__upload" @click="register">
        INITIALIZE
      </Button>

      <p class="switch">
        Already have a rig?
        <span @click="goLogin">ENTER</span>
      </p>
    </BasePanel>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import BasePanel from '@/components/ui/BasePanel.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
const router = useRouter()

const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')

const register = async () => {
  if (password.value !== confirmPassword.value) {
    alert('Passwords do not match')
    return
  }

  try {
    const res = await fetch('http://localhost:8000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        email: email.value,
        password: password.value
      })
    })

    if (!res.ok) throw new Error('Register failed')

    alert('Rig created. Powering on...')
    router.push('/')
  } catch (err) {
    console.error(err)
    alert('Error creating account')
  }
}

const goLogin = () => {
  router.push('/')
}
</script>

<style scoped>
.auth {
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

h2 {
  font-family: var(--font-display);
  letter-spacing: 0.3em;
  font-size: 0.8em;
  color: var(--text-secondary);
  margin-bottom: 16px;
}
</style>