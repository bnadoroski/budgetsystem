<template>
    <div class="welcome-screen">
        <div class="welcome-content">
            <!-- Logo/Icon -->
            <div class="welcome-logo">
                <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 32 32">
                    <g fill="none">
                        <path fill="url(#walletGrad1)"
                            d="M3 8.5A3.5 3.5 0 0 1 6.5 5h17A3.5 3.5 0 0 1 27 8.5v15a3.5 3.5 0 0 1-3.5 3.5h-17A3.5 3.5 0 0 1 3 23.5z" />
                        <path fill="url(#walletGrad2)" d="M22 14h7v6h-7a3 3 0 1 1 0-6" />
                        <circle cx="23" cy="17" r="1.5" fill="#fff" />
                        <defs>
                            <linearGradient id="walletGrad1" x1="3" x2="27" y1="5" y2="27"
                                gradientUnits="userSpaceOnUse">
                                <stop stop-color="#667eea" />
                                <stop offset="1" stop-color="#764ba2" />
                            </linearGradient>
                            <linearGradient id="walletGrad2" x1="22" x2="29" y1="14" y2="20"
                                gradientUnits="userSpaceOnUse">
                                <stop stop-color="#52d17c" />
                                <stop offset="1" stop-color="#22918b" />
                            </linearGradient>
                        </defs>
                    </g>
                </svg>
            </div>

            <h1 class="welcome-title">Budget System</h1>
            <p class="welcome-subtitle">Controle seus gastos de forma simples e inteligente</p>

            <!-- Features -->
            <div class="features-list">
                <div class="feature-item">
                    <span class="feature-icon">📊</span>
                    <span class="feature-text">Acompanhe seus orçamentos em tempo real</span>
                </div>
                <div class="feature-item">
                    <span class="feature-icon">🔔</span>
                    <span class="feature-text">Receba alertas de gastos automáticos</span>
                </div>
                <div class="feature-item">
                    <span class="feature-icon">👥</span>
                    <span class="feature-text">Compartilhe budgets com sua família</span>
                </div>
                <div class="feature-item">
                    <span class="feature-icon">📱</span>
                    <span class="feature-text">Captura automática de notificações bancárias</span>
                </div>
            </div>

            <!-- Login Button -->
            <button class="login-button" @click="handleLoginClick">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                <span>Entrar</span>
            </button>

            <p class="login-hint">Faça login para sincronizar seus dados e acessar de qualquer dispositivo</p>

            <!-- Footer dentro do content para ficar acima -->
            <div class="welcome-footer">
                <p>🔒 Seus dados são armazenados de forma segura no Firebase</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const emit = defineEmits(['login'])

const handleLoginClick = () => {
    console.log('🔐 WelcomeScreen: Login button clicked, emitting login event')
    emit('login')
}
</script>

<style scoped>
.welcome-screen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    height: 100vh;
    height: 100dvh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 20px;
    padding-top: max(20px, env(safe-area-inset-top));
    padding-bottom: max(20px, env(safe-area-inset-bottom));
    z-index: 9999;
    overflow-y: auto;
}

.welcome-content {
    text-align: center;
    max-width: 400px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.welcome-logo {
    margin-bottom: 24px;
    animation: float 3s ease-in-out infinite;
}

@keyframes float {

    0%,
    100% {
        transform: translateY(0);
    }

    50% {
        transform: translateY(-10px);
    }
}

.welcome-title {
    color: white;
    font-size: 32px;
    font-weight: 700;
    margin: 0 0 8px 0;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.welcome-subtitle {
    color: rgba(255, 255, 255, 0.9);
    font-size: 16px;
    margin: 0 0 32px 0;
}

.features-list {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 32px;
    text-align: left;
}

.feature-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    color: white;
    font-size: 14px;
}

.feature-item:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.feature-icon {
    font-size: 24px;
    flex-shrink: 0;
}

.feature-text {
    flex: 1;
}

.login-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    padding: 16px 24px;
    background: white;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    color: #667eea;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.login-button svg {
    stroke: #667eea;
}

.login-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.login-button:active {
    transform: translateY(0);
}

.login-hint {
    color: rgba(255, 255, 255, 0.7);
    font-size: 13px;
    margin-top: 16px;
}

.welcome-footer {
    margin-top: 32px;
    text-align: center;
}

.welcome-footer p {
    color: rgba(255, 255, 255, 0.6);
    font-size: 12px;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}

/* Responsivo para telas pequenas */
@media (max-height: 600px) {
    .welcome-logo svg {
        width: 60px;
        height: 60px;
    }

    .welcome-title {
        font-size: 24px;
    }

    .welcome-subtitle {
        font-size: 14px;
        margin-bottom: 20px;
    }

    .features-list {
        padding: 12px;
        margin-bottom: 20px;
    }

    .feature-item {
        padding: 8px 0;
        font-size: 13px;
    }

    .feature-icon {
        font-size: 20px;
    }
}

/* Dark mode - mantém o mesmo estilo pois já é escuro */
body.dark-mode .welcome-screen {
    background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
}
</style>
