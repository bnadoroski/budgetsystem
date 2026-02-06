<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLogger, type LogEntry, type LogLevel } from '@/services/LoggerService'

const props = defineProps<{
    show: boolean
}>()

const emit = defineEmits<{
    close: []
}>()

const logger = useLogger()
const logs = ref<LogEntry[]>([])
const filterLevel = ref<LogLevel | 'all'>('all')
const searchQuery = ref('')
const showStats = ref(false)
const stats = ref<ReturnType<typeof logger.getStats> | null>(null)
const isExporting = ref(false)

const filteredLogs = computed(() => {
    let result = logs.value

    // Filtro por nível
    if (filterLevel.value !== 'all') {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal']
        const minIndex = levels.indexOf(filterLevel.value)
        result = result.filter(log => levels.indexOf(log.level) >= minIndex)
    }

    // Filtro por busca
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        result = result.filter(log =>
            log.message.toLowerCase().includes(query) ||
            log.context?.toLowerCase().includes(query) ||
            JSON.stringify(log.data || {}).toLowerCase().includes(query)
        )
    }

    return result
})

const loadLogs = () => {
    logs.value = logger.getLogs()
    stats.value = logger.getStats()
}

const handleClearLogs = () => {
    if (confirm('Tem certeza que deseja limpar todos os logs locais?')) {
        logger.clearLocalLogs()
        loadLogs()
    }
}

const handleExportLogs = async () => {
    isExporting.value = true
    try {
        const logsJson = logger.exportLogs()
        const blob = new Blob([logsJson], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `budget-logs-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
    } finally {
        isExporting.value = false
    }
}

const handleCopyLogs = async () => {
    try {
        const logsJson = logger.exportLogs()
        await navigator.clipboard.writeText(logsJson)
        alert('Logs copiados para a área de transferência!')
    } catch (e) {
        alert('Erro ao copiar logs')
    }
}

const formatTimestamp = (date: Date) => {
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    })
}

const getLevelIcon = (level: LogLevel) => {
    const icons = {
        debug: '🔍',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
        fatal: '💀'
    }
    return icons[level]
}

const getLevelClass = (level: LogLevel) => {
    return `level-${level}`
}

onMounted(() => {
    loadLogs()
})

// Atualiza quando abre
const onShow = () => {
    if (props.show) {
        loadLogs()
    }
}
</script>

<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show" class="modal-overlay" @click.self="emit('close')">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>📋 Logs do App</h2>
                        <button class="close-button" @click="emit('close')">×</button>
                    </div>

                    <div class="toolbar">
                        <div class="filters">
                            <select v-model="filterLevel" class="filter-select">
                                <option value="all">Todos os níveis</option>
                                <option value="debug">🔍 Debug+</option>
                                <option value="info">ℹ️ Info+</option>
                                <option value="warn">⚠️ Warn+</option>
                                <option value="error">❌ Error+</option>
                                <option value="fatal">💀 Fatal</option>
                            </select>

                            <input v-model="searchQuery" type="text" placeholder="Buscar nos logs..."
                                class="search-input" />
                        </div>

                        <div class="actions">
                            <button @click="showStats = !showStats" class="btn-action" title="Estatísticas">
                                📊
                            </button>
                            <button @click="loadLogs" class="btn-action" title="Atualizar">
                                🔄
                            </button>
                            <button @click="handleCopyLogs" class="btn-action" title="Copiar">
                                📋
                            </button>
                            <button @click="handleExportLogs" class="btn-action" :disabled="isExporting"
                                title="Exportar">
                                💾
                            </button>
                            <button @click="handleClearLogs" class="btn-action btn-danger" title="Limpar">
                                🗑️
                            </button>
                        </div>
                    </div>

                    <!-- Stats Panel -->
                    <Transition name="slide">
                        <div v-if="showStats && stats" class="stats-panel">
                            <div class="stat-item">
                                <span class="stat-label">Total</span>
                                <span class="stat-value">{{ stats.total }}</span>
                            </div>
                            <div class="stat-item level-debug">
                                <span class="stat-label">🔍 Debug</span>
                                <span class="stat-value">{{ stats.byLevel.debug }}</span>
                            </div>
                            <div class="stat-item level-info">
                                <span class="stat-label">ℹ️ Info</span>
                                <span class="stat-value">{{ stats.byLevel.info }}</span>
                            </div>
                            <div class="stat-item level-warn">
                                <span class="stat-label">⚠️ Warn</span>
                                <span class="stat-value">{{ stats.byLevel.warn }}</span>
                            </div>
                            <div class="stat-item level-error">
                                <span class="stat-label">❌ Error</span>
                                <span class="stat-value">{{ stats.byLevel.error }}</span>
                            </div>
                            <div class="stat-item level-fatal">
                                <span class="stat-label">💀 Fatal</span>
                                <span class="stat-value">{{ stats.byLevel.fatal }}</span>
                            </div>
                            <div class="stat-item session">
                                <span class="stat-label">Sessão</span>
                                <span class="stat-value small">{{ stats.sessionId }}</span>
                            </div>
                        </div>
                    </Transition>

                    <div class="logs-container">
                        <div v-if="filteredLogs.length === 0" class="empty-state">
                            <span class="empty-icon">📭</span>
                            <p>Nenhum log encontrado</p>
                        </div>

                        <div v-for="log in filteredLogs" :key="log.timestamp.getTime() + log.message" class="log-entry"
                            :class="getLevelClass(log.level)">
                            <div class="log-header">
                                <span class="log-level">{{ getLevelIcon(log.level) }}</span>
                                <span class="log-context">{{ log.context || 'app' }}</span>
                                <span class="log-time">{{ formatTimestamp(log.timestamp) }}</span>
                            </div>
                            <div class="log-message">{{ log.message }}</div>
                            <div v-if="log.data" class="log-data">
                                <pre>{{ JSON.stringify(log.data, null, 2) }}</pre>
                            </div>
                            <div v-if="log.error" class="log-error">
                                <div class="error-name">{{ log.error.name }}: {{ log.error.message }}</div>
                                <pre v-if="log.error.stack" class="error-stack">{{ log.error.stack }}</pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    padding: 16px;
}

.modal-content {
    background: white;
    border-radius: 16px;
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
    margin: 0;
    font-size: 18px;
    color: #333;
}

.close-button {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
    padding: 4px 8px;
    border-radius: 4px;
}

.close-button:hover {
    background: #f0f0f0;
}

.toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #e0e0e0;
    gap: 12px;
    flex-wrap: wrap;
}

.filters {
    display: flex;
    gap: 8px;
    flex: 1;
}

.filter-select {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 14px;
    background: white;
}

.search-input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 14px;
    min-width: 120px;
}

.actions {
    display: flex;
    gap: 4px;
}

.btn-action {
    padding: 8px;
    border: none;
    background: #f5f5f5;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    transition: background 0.2s;
}

.btn-action:hover {
    background: #e0e0e0;
}

.btn-action:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-danger:hover {
    background: #ffebee;
}

.stats-panel {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px 16px;
    background: #f8f9fa;
    border-bottom: 1px solid #e0e0e0;
}

.stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 12px;
    background: white;
    border-radius: 8px;
    min-width: 60px;
}

.stat-label {
    font-size: 11px;
    color: #666;
}

.stat-value {
    font-size: 16px;
    font-weight: 600;
    color: #333;
}

.stat-value.small {
    font-size: 10px;
    font-family: monospace;
}

.stat-item.session {
    flex: 1;
}

.logs-container {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
}

.empty-state {
    text-align: center;
    padding: 40px;
    color: #888;
}

.empty-icon {
    font-size: 48px;
    display: block;
    margin-bottom: 12px;
}

.log-entry {
    margin-bottom: 12px;
    padding: 12px;
    border-radius: 8px;
    border-left: 4px solid #ddd;
    background: #fafafa;
}

.log-entry.level-debug {
    border-left-color: #9e9e9e;
    background: #fafafa;
}

.log-entry.level-info {
    border-left-color: #2196F3;
    background: #e3f2fd;
}

.log-entry.level-warn {
    border-left-color: #ff9800;
    background: #fff3e0;
}

.log-entry.level-error {
    border-left-color: #f44336;
    background: #ffebee;
}

.log-entry.level-fatal {
    border-left-color: #b71c1c;
    background: #ffcdd2;
}

.log-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    font-size: 12px;
}

.log-level {
    font-size: 14px;
}

.log-context {
    font-family: monospace;
    color: #666;
    background: rgba(0, 0, 0, 0.05);
    padding: 2px 6px;
    border-radius: 4px;
}

.log-time {
    color: #999;
    margin-left: auto;
    font-size: 11px;
}

.log-message {
    font-size: 14px;
    color: #333;
    word-break: break-word;
}

.log-data {
    margin-top: 8px;
}

.log-data pre {
    margin: 0;
    padding: 8px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
    font-size: 11px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
}

.log-error {
    margin-top: 8px;
    padding: 8px;
    background: rgba(244, 67, 54, 0.1);
    border-radius: 4px;
}

.error-name {
    font-weight: 600;
    color: #c62828;
    font-size: 13px;
}

.error-stack {
    margin: 8px 0 0 0;
    font-size: 10px;
    color: #666;
    white-space: pre-wrap;
    word-break: break-word;
}

/* Dark Mode */
body.dark-mode .modal-content {
    background: #1e1e2e;
}

body.dark-mode .modal-header {
    border-bottom-color: #333;
}

body.dark-mode .modal-header h2 {
    color: #fff;
}

body.dark-mode .close-button {
    color: #aaa;
}

body.dark-mode .close-button:hover {
    background: #333;
}

body.dark-mode .toolbar {
    border-bottom-color: #333;
}

body.dark-mode .filter-select,
body.dark-mode .search-input {
    background: #2a2a3e;
    border-color: #444;
    color: #fff;
}

body.dark-mode .btn-action {
    background: #2a2a3e;
    color: #fff;
}

body.dark-mode .btn-action:hover {
    background: #3a3a4e;
}

body.dark-mode .stats-panel {
    background: #252535;
}

body.dark-mode .stat-item {
    background: #2a2a3e;
}

body.dark-mode .stat-label {
    color: #888;
}

body.dark-mode .stat-value {
    color: #fff;
}

body.dark-mode .log-entry {
    background: #252535;
}

body.dark-mode .log-entry.level-info {
    background: rgba(33, 150, 243, 0.1);
}

body.dark-mode .log-entry.level-warn {
    background: rgba(255, 152, 0, 0.1);
}

body.dark-mode .log-entry.level-error {
    background: rgba(244, 67, 54, 0.1);
}

body.dark-mode .log-entry.level-fatal {
    background: rgba(183, 28, 28, 0.2);
}

body.dark-mode .log-context {
    background: rgba(255, 255, 255, 0.1);
    color: #aaa;
}

body.dark-mode .log-message {
    color: #ddd;
}

body.dark-mode .log-data pre {
    background: rgba(0, 0, 0, 0.2);
    color: #aaa;
}

body.dark-mode .empty-state {
    color: #666;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.3s;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
    transition: all 0.3s;
}

.slide-enter-from,
.slide-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}
</style>
