<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { useAuthStore } from '@/stores/auth'
import BudgetBar from '@/components/BudgetBar.vue'
import AddBudgetModal from '@/components/AddBudgetModal.vue'
import AuthModal from '@/components/AuthModal.vue'
import SettingsModal from '@/components/SettingsModal.vue'

const budgetStore = useBudgetStore()
const authStore = useAuthStore()
const showAddModal = ref(false)
const showAuthModal = ref(false)
const showSettingsModal = ref(false)

const handleAddBudget = (name: string, value: number, color: string) => {
  budgetStore.addBudget(name, value, color)
}

const handleProfileClick = () => {
  if (authStore.isAuthenticated) {
    // Mostrar menu de perfil ou logout
    if (confirm('Deseja fazer logout?')) {
      authStore.signOut()
    }
  } else {
    showAuthModal.value = true
  }
}

// Quando o usuário faz login/logout
watch(() => authStore.user, async (newUser, oldUser) => {
  if (newUser && !oldUser) {
    // Usuário acabou de fazer login
    await budgetStore.migrateBudgetsToFirestore(newUser.uid)
    await budgetStore.loadBudgets(newUser.uid)
  } else if (!newUser && oldUser) {
    // Usuário fez logout
    budgetStore.stopBudgetsListener()
  }
})
// Carrega budgets do usuário autenticado na inicialização
onMounted(async () => {
  if (authStore.user) {
    await budgetStore.loadBudgets(authStore.user.uid)
  }
})
</script>

<template>
  <div class="app-container">
    <div class="budget-list">
      <div v-if="budgetStore.budgets.length === 0" class="empty-state">
        <div class="empty-state-card">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
          </svg>
          <h3>Nenhum budget criado</h3>
          <p>Clique no botão + abaixo para criar seu primeiro budget e começar a acompanhar seus gastos</p>
        </div>
      </div>

      <BudgetBar v-for="budget in budgetStore.budgets" :key="budget.id" :budget="budget" />
    </div>

    <div class="bottom-nav">
      <button class="nav-button" title="Configurações" @click="showSettingsModal = true">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 20 20">
          <g fill="none">
            <path fill="url(#SVGPftDHeRF)"
              d="M16 5.117V10.5h-3V5.117a20 20 0 0 1-.29-.554a8 8 0 0 1-.148-.313A.6.6 0 0 1 12.5 4q0-.086.07-.312q.071-.228.157-.493t.171-.5q.087-.234.125-.351a.46.46 0 0 1 .18-.242A.55.55 0 0 1 13.5 2h2q.164 0 .29.094a.57.57 0 0 1 .187.25q.03.109.117.344l.18.5q.093.265.156.492q.062.225.07.32a.7.7 0 0 1-.062.242q-.063.15-.141.32a3 3 0 0 1-.164.313a2 2 0 0 0-.133.242" />
            <path fill="url(#SVGBGOkQeOY)"
              d="M17 11.5h-5v4.055q0 .507.203.953t.547.781A2.5 2.5 0 0 0 14.5 18q.5 0 .953-.195a2.7 2.7 0 0 0 .797-.524q.345-.327.547-.773a2.3 2.3 0 0 0 .203-.953z" />
            <path fill="url(#SVG58viBcga)"
              d="M17 12v-1.5a.6.6 0 0 0-.07-.273a.37.37 0 0 0-.172-.149a1 1 0 0 0-.235-.062a2 2 0 0 0-.257-.016h-3.532q-.14 0-.265.016a.7.7 0 0 0-.235.07a.44.44 0 0 0-.171.148a.5.5 0 0 0-.063.266V12z" />
            <path fill="url(#SVGFNnBvbYS)"
              d="M5.78 2.126a.5.5 0 0 1 .22.415v3.457a1 1 0 0 0 2 0V2.541a.5.5 0 0 1 .688-.463A4.501 4.501 0 0 1 9 10.282v5.716a2 2 0 1 1-4 0v-5.716a4.5 4.5 0 0 1 .312-8.204a.5.5 0 0 1 .467.048" />
            <defs>
              <linearGradient id="SVGPftDHeRF" x1="15.833" x2="12.81" y1=".38" y2="16.965"
                gradientUnits="userSpaceOnUse">
                <stop stop-color="#2bdabe" />
                <stop offset=".853" stop-color="#0067bf" />
              </linearGradient>
              <linearGradient id="SVGBGOkQeOY" x1="16.999" x2="10.446" y1="18.145" y2="13.592"
                gradientUnits="userSpaceOnUse">
                <stop stop-color="#ff6f47" />
                <stop offset="1" stop-color="#ffcd0f" />
              </linearGradient>
              <linearGradient id="SVG58viBcga" x1="13.376" x2="14.043" y1="10.484" y2="12.151"
                gradientUnits="userSpaceOnUse">
                <stop stop-color="#ffa43d" />
                <stop offset="1" stop-color="#fb5937" />
              </linearGradient>
              <linearGradient id="SVGFNnBvbYS" x1="10" x2="4.8" y1="-1" y2="18.48" gradientUnits="userSpaceOnUse">
                <stop stop-color="#2bdabe" />
                <stop offset="1" stop-color="#0067bf" />
              </linearGradient>
            </defs>
          </g>
        </svg>
      </button>

      <button class="nav-button add-button" @click="showAddModal = true" title="Adicionar Budget">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <g fill="none">
            <path fill="url(#SVGau1xsAGW)"
              d="M30 16c0 7.732-6.268 14-14 14S2 23.732 2 16S8.268 2 16 2s14 6.268 14 14" />
            <path fill="url(#SVGYbPd5clO)"
              d="M15 10a1 1 0 1 1 2 0v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5h-5a1 1 0 1 1 0-2h5z" />
            <defs>
              <linearGradient id="SVGau1xsAGW" x1="3" x2="22.323" y1="7.25" y2="27.326" gradientUnits="userSpaceOnUse">
                <stop stop-color="#52d17c" />
                <stop offset="1" stop-color="#22918b" />
              </linearGradient>
              <linearGradient id="SVGYbPd5clO" x1="11.625" x2="15.921" y1="10.428" y2="25.592"
                gradientUnits="userSpaceOnUse">
                <stop stop-color="#fff" />
                <stop offset="1" stop-color="#e3ffd9" />
              </linearGradient>
            </defs>
          </g>
        </svg>
      </button>

      <button class="nav-button" title="Perfil" @click="handleProfileClick">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32">
          <g fill="none">
            <path fill="#212121"
              d="M7.5 18A3.5 3.5 0 0 0 4 21.5v.5c0 2.393 1.523 4.417 3.685 5.793C9.859 29.177 12.802 30 16 30s6.14-.823 8.315-2.206C26.477 26.418 28 24.394 28 22v-.5a3.5 3.5 0 0 0-3.5-3.5z" />
            <path fill="url(#SVGKCH4Jk8K)"
              d="M7.5 18A3.5 3.5 0 0 0 4 21.5v.5c0 2.393 1.523 4.417 3.685 5.793C9.859 29.177 12.802 30 16 30s6.14-.823 8.315-2.206C26.477 26.418 28 24.394 28 22v-.5a3.5 3.5 0 0 0-3.5-3.5z" />
            <path fill="url(#SVGcp1ycBLD)"
              d="M7.5 18A3.5 3.5 0 0 0 4 21.5v.5c0 2.393 1.523 4.417 3.685 5.793C9.859 29.177 12.802 30 16 30s6.14-.823 8.315-2.206C26.477 26.418 28 24.394 28 22v-.5a3.5 3.5 0 0 0-3.5-3.5z" />
            <path fill="#242424" d="M16 16a7 7 0 1 0 0-14a7 7 0 0 0 0 14" />
            <path fill="url(#SVGUxDSsduC)" d="M16 16a7 7 0 1 0 0-14a7 7 0 0 0 0 14" />
            <defs>
              <linearGradient id="SVGKCH4Jk8K" x1="9.707" x2="13.584" y1="19.595" y2="31.977"
                gradientUnits="userSpaceOnUse">
                <stop offset=".125" stop-color="#9c6cfe" />
                <stop offset="1" stop-color="#7a41dc" />
              </linearGradient>
              <linearGradient id="SVGcp1ycBLD" x1="16" x2="21.429" y1="16.571" y2="36.857"
                gradientUnits="userSpaceOnUse">
                <stop stop-color="#885edb" stop-opacity="0" />
                <stop offset="1" stop-color="#e362f8" />
              </linearGradient>
              <linearGradient id="SVGUxDSsduC" x1="12.329" x2="19.464" y1="3.861" y2="15.254"
                gradientUnits="userSpaceOnUse">
                <stop offset=".125" stop-color="#9c6cfe" />
                <stop offset="1" stop-color="#7a41dc" />
              </linearGradient>
            </defs>
          </g>
        </svg>
        <span v-if="authStore.isAuthenticated" class="auth-indicator"></span>
      </button>
    </div>

    <AddBudgetModal :show="showAddModal" @close="showAddModal = false" @submit="handleAddBudget" />
    <AuthModal :show="showAuthModal" @close="showAuthModal = false" />
    <SettingsModal :show="showSettingsModal" @close="showSettingsModal = false" />
  </div>
</template>

<style scoped>
.app-container {
  max-width: 600px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: #fafafa;
  background-image:
    url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d4d4d4' fill-opacity='0.12' transform='scale(0.8)'%3E%3C!-- Moeda --%3E%3Ccircle cx='15' cy='15' r='8' stroke='%23d4d4d4' stroke-width='1.5' fill='none'/%3E%3Ctext x='15' y='19' text-anchor='middle' font-size='10' font-weight='bold' fill='%23d4d4d4'%3E$%3C/text%3E%3C!-- Cartão de crédito --%3E%3Crect x='45' y='8' width='18' height='12' rx='2' stroke='%23d4d4d4' stroke-width='1.2' fill='none'/%3E%3Cline x1='45' y1='11' x2='63' y2='11' stroke='%23d4d4d4' stroke-width='1.5'/%3E%3Cline x1='48' y1='15' x2='52' y2='15' stroke='%23d4d4d4' stroke-width='1'/%3E%3C!-- Porquinho --%3E%3Cellipse cx='85' cy='18' rx='9' ry='7' stroke='%23d4d4d4' stroke-width='1.2' fill='none'/%3E%3Ccircle cx='82' cy='17' r='1' fill='%23d4d4d4'/%3E%3Crect x='83' y='13' width='4' height='3' rx='1' fill='none' stroke='%23d4d4d4' stroke-width='1'/%3E%3Cline x1='85' y1='24' x2='85' y2='28' stroke='%23d4d4d4' stroke-width='1.5'/%3E%3Cline x1='90' y1='24' x2='90' y2='28' stroke='%23d4d4d4' stroke-width='1.5'/%3E%3C!-- Gráfico --%3E%3Cpath d='M10 45 L15 40 L20 43 L25 38' stroke='%23d4d4d4' stroke-width='1.5' fill='none'/%3E%3Ccircle cx='10' cy='45' r='1.5' fill='%23d4d4d4'/%3E%3Ccircle cx='15' cy='40' r='1.5' fill='%23d4d4d4'/%3E%3Ccircle cx='20' cy='43' r='1.5' fill='%23d4d4d4'/%3E%3Ccircle cx='25' cy='38' r='1.5' fill='%23d4d4d4'/%3E%3C!-- Calculadora --%3E%3Crect x='48' y='38' width='14' height='18' rx='2' stroke='%23d4d4d4' stroke-width='1.2' fill='none'/%3E%3Crect x='50' y='40' width='10' height='4' fill='%23d4d4d4' fill-opacity='0.3'/%3E%3Ccircle cx='52' cy='48' r='1' fill='%23d4d4d4'/%3E%3Ccircle cx='56' cy='48' r='1' fill='%23d4d4d4'/%3E%3Ccircle cx='60' cy='48' r='1' fill='%23d4d4d4'/%3E%3Ccircle cx='52' cy='52' r='1' fill='%23d4d4d4'/%3E%3Ccircle cx='56' cy='52' r='1' fill='%23d4d4d4'/%3E%3Ccircle cx='60' cy='52' r='1' fill='%23d4d4d4'/%3E%3C!-- Cifrão --%3E%3Cpath d='M85 42 Q82 42 82 45 Q82 47 85 47 Q88 47 88 50 Q88 52 85 52' stroke='%23d4d4d4' stroke-width='1.5' fill='none'/%3E%3Cline x1='85' y1='40' x2='85' y2='54' stroke='%23d4d4d4' stroke-width='1.5'/%3E%3C!-- Carteira --%3E%3Cpath d='M10 70 L25 70 L25 82 L10 82 Z' stroke='%23d4d4d4' stroke-width='1.2' fill='none'/%3E%3Cline x1='10' y1='73' x2='25' y2='73' stroke='%23d4d4d4' stroke-width='1.2'/%3E%3Crect x='15' y='75' width='8' height='5' rx='1' fill='none' stroke='%23d4d4d4' stroke-width='1'/%3E%3C!-- Tag de preço --%3E%3Cpath d='M45 70 L55 70 L60 76 L55 82 L45 82 Z' stroke='%23d4d4d4' stroke-width='1.2' fill='none'/%3E%3Ccircle cx='49' cy='76' r='1.5' fill='%23d4d4d4'/%3E%3Ctext x='54' y='79' font-size='6' fill='%23d4d4d4'%3E$%3C/text%3E%3C!-- Saco de dinheiro --%3E%3Cpath d='M85 80 Q82 85 85 88 Q88 85 85 80' stroke='%23d4d4d4' stroke-width='1.2' fill='none'/%3E%3Ccircle cx='85' cy='92' r='6' stroke='%23d4d4d4' stroke-width='1.2' fill='none'/%3E%3Ctext x='85' y='95' text-anchor='middle' font-size='7' font-weight='bold' fill='%23d4d4d4'%3E$%3C/text%3E%3C/g%3E%3C/svg%3E");
  background-size: 200px 200px;
  position: relative;
  padding-bottom: 80px;
}

.budget-list {
  padding: 20px;
  position: relative;
  z-index: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 60px 30px;
  color: #999;
}

.empty-state-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 40px 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-state svg {
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 20px;
  color: #666;
  margin-bottom: 12px;
}

.empty-state p {
  font-size: 14px;
  line-height: 1.6;
  max-width: 300px;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 70px;
  background-color: #e0e0e0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  margin: 0 auto;
}

.nav-button {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 10px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  position: relative;
}

.nav-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.auth-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background-color: #4CAF50;
  border-radius: 50%;
  border: 2px solid #e0e0e0;
}

.add-button {
  width: 56px;
  height: 56px;
  background-color: transparent;
  border: none;
  box-shadow: none;
}

.add-button:hover {
  background-color: transparent;
  transform: scale(1.1);
}

@media (min-width: 601px) {
  .bottom-nav {
    left: 50%;
    transform: translateX(-50%);
  }
}
</style>
