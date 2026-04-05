import { createRouter, createWebHistory } from 'vue-router'
import LoginPage     from '@/views/LoginPage.vue'
import RegisterPage  from '@/views/RegisterPage.vue'
import DashBoard     from '@/views/DashBoard.vue'
import PedalBoard    from '@/views/PedalBoard.vue'
import IRLibraryView from '@/views/IRLibraryView.vue'
import IRCreateView  from '@/views/IRCreateView.vue'
import MyIRsView     from '@/views/MyIRsView.vue'
import ForgotPasswordView from '@/views/ForgotPasswordView.vue'
import ResetPasswordView from '@/views/ResetPasswordView.vue'

const PUBLIC_ROUTES = ['login', 'register','forgot-password','reset-password']

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/',               name: 'login',     component: LoginPage     },
    { path: '/register',       name: 'register',  component: RegisterPage  },
    { path: '/dashboard',      name: 'dashboard', component: DashBoard     },
    { path: '/pedalboard',     name: 'pedalboard',component: PedalBoard    },
    { path: '/library',        name: 'library',   component: IRLibraryView },
    { path: '/library/create', name: 'ir-create', component: IRCreateView  },
    { path: '/my-irs',         name: 'my-irs',    component: MyIRsView     },
    { path: '/forgot-password', name: 'forgot-password', component: ForgotPasswordView },
    { path: '/reset-password',  name: 'reset-password',  component: ResetPasswordView  },
  ],
})

function isTokenValid() {
  const token = localStorage.getItem('token')
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

router.beforeEach((to) => {
  const loggedIn = isTokenValid()  // ← replaces !!localStorage.getItem('token')
  if (!loggedIn && !PUBLIC_ROUTES.includes(to.name)) {
    localStorage.removeItem('token')  // clean up expired token
    return { name: 'login' }
  }
  if (loggedIn && PUBLIC_ROUTES.includes(to.name)) {
    return { name: 'dashboard' }
  }
})

export default router