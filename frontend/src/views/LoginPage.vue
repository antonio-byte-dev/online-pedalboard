<template>
  <div class="login">
    <BasePanel class="login-box">
      <h2>ENTER RIG</h2>
 
      <BaseInput v-model="username" placeholder="USERNAME" />
      <BaseInput v-model="password" type="password" placeholder="PASSWORD" />
 
      <BaseButton class="lib-nav__upload" @click="login">
        POWER ON
      </BaseButton>
      <p class="switch">
        No rig yet?
        <span @click="goRegister">CREATE</span>
      </p>
    </BasePanel>
  </div>
</template>
 
<script setup>
import BasePanel from '@/components/ui/BasePanel.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
 
const router = useRouter()
const username = ref('')
const password = ref('')
 
const goRegister = () => {
  router.push('/register')
}
const login = async () => {
  try {
    const formData = new URLSearchParams()
    formData.append('username', username.value)
    formData.append('password', password.value)

    const res = await fetch('http://localhost:8000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    })

    if (!res.ok) throw new Error('Login failed')

    const data = await res.json()

    // 💾 Save token
    localStorage.setItem('token', data.access_token)

    alert('Welcome back. Rig loaded.')

    // 🚀 Redirect
    router.push('/dashboard')

  } catch (err) {
    console.error(err)
    alert('Invalid credentials')
  }
}
</script>
 
<style scoped>
.login {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
 
.login-box {
  width: 340px;
  padding: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}
 
.login-box :deep(input) {
  width: 100%;
  box-sizing: border-box;
}
 
.login-box :deep(button) {
  width: 100%;
  white-space: nowrap;
  color: var(--text-primary);
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
h2 {
  font-family: var(--font-display);
  letter-spacing: 0.3em;
  font-size: 0.8em;
  color: var(--text-secondary);
  margin-bottom: 16px;
}
</style>
 