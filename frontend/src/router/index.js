import { createRouter, createWebHistory } from 'vue-router'
import LoginPage     from '@/views/LoginPage.vue'
import RegisterPage  from '@/views/RegisterPage.vue'
import DashBoard     from '@/views/DashBoard.vue'
import PedalBoard    from '@/views/PedalBoard.vue'
import IRLibraryView from '@/views/IRLibraryView.vue'
import IRCreateView  from '@/views/IRCreateView.vue'
import MyIRsView     from '@/views/MyIRsView.vue'

const PUBLIC_ROUTES = ['login', 'register']

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
  ],
})

router.beforeEach((to) => {
  const isLoggedIn = !!localStorage.getItem('token')
  if (!isLoggedIn && !PUBLIC_ROUTES.includes(to.name)) {
    return { name: 'login' }
  }
  if (isLoggedIn && PUBLIC_ROUTES.includes(to.name)) {
    return { name: 'dashboard' }
  }
})

export default router