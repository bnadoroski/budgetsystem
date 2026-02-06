import { db } from '@/config/firebase'
import { collection, addDoc, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LogEntry {
    id?: string
    level: LogLevel
    message: string
    context?: string // Ex: 'budget.addBudget', 'auth.signIn'
    data?: Record<string, any>
    error?: {
        name: string
        message: string
        stack?: string
    }
    userId?: string
    userEmail?: string
    deviceInfo?: {
        platform: string
        userAgent: string
        language: string
        screenSize: string
        appVersion: string
    }
    timestamp: Date
    sessionId: string
}

// Gera um ID de sessão único para rastrear logs de uma mesma sessão
const generateSessionId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// Informações do dispositivo
const getDeviceInfo = () => ({
    platform: navigator.platform || 'unknown',
    userAgent: navigator.userAgent,
    language: navigator.language,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0'
})

class LoggerService {
    private sessionId: string
    private userId: string | null = null
    private userEmail: string | null = null
    private localLogs: LogEntry[] = []
    private maxLocalLogs = 500 // Máximo de logs em memória
    private logLevel: LogLevel = 'info' // Nível mínimo para logar
    private enableRemoteLogging = true // Se envia para Firebase
    private enableConsoleLogging = true // Se mostra no console

    // Níveis em ordem de severidade
    private levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal']

    constructor() {
        this.sessionId = generateSessionId()
        this.loadLocalLogs()
        this.setupGlobalErrorHandlers()

        // Log de início de sessão
        this.info('App iniciado', 'app.start', {
            sessionId: this.sessionId,
            deviceInfo: getDeviceInfo()
        })
    }

    // Configura handlers globais de erro
    private setupGlobalErrorHandlers() {
        // Erros não capturados
        window.addEventListener('error', (event) => {
            this.fatal('Erro não capturado', 'global.error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            }, event.error)
        })

        // Promise rejections não tratadas
        window.addEventListener('unhandledrejection', (event) => {
            const error = event.reason instanceof Error
                ? event.reason
                : new Error(String(event.reason))

            this.fatal('Promise não tratada', 'global.unhandledrejection', {
                reason: String(event.reason)
            }, error)
        })

        // Captura quando o app volta do background (pode ter tido crash)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.info('App voltou ao foreground', 'app.resume')
            } else {
                this.info('App foi para background', 'app.pause')
            }
        })
    }

    // Define o usuário atual (chamar após login)
    setUser(userId: string | null, email: string | null) {
        this.userId = userId
        this.userEmail = email
        if (userId) {
            this.info('Usuário autenticado', 'auth.identified', { userId, email })
        }
    }

    // Configura nível mínimo de log
    setLogLevel(level: LogLevel) {
        this.logLevel = level
    }

    // Habilita/desabilita logging remoto
    setRemoteLogging(enabled: boolean) {
        this.enableRemoteLogging = enabled
    }

    // Verifica se deve logar baseado no nível
    private shouldLog(level: LogLevel): boolean {
        return this.levels.indexOf(level) >= this.levels.indexOf(this.logLevel)
    }

    // Cria entrada de log
    private createLogEntry(
        level: LogLevel,
        message: string,
        context?: string,
        data?: Record<string, any>,
        error?: Error
    ): LogEntry {
        const entry: LogEntry = {
            level,
            message,
            context,
            data,
            userId: this.userId || undefined,
            userEmail: this.userEmail || undefined,
            deviceInfo: getDeviceInfo(),
            timestamp: new Date(),
            sessionId: this.sessionId
        }

        if (error) {
            entry.error = {
                name: error.name,
                message: error.message,
                stack: error.stack
            }
        }

        return entry
    }

    // Salva log localmente
    private saveLocally(entry: LogEntry) {
        this.localLogs.push(entry)

        // Remove logs antigos se exceder limite
        if (this.localLogs.length > this.maxLocalLogs) {
            this.localLogs = this.localLogs.slice(-this.maxLocalLogs)
        }

        // Persiste no localStorage (últimos 100 para não ocupar muito espaço)
        try {
            const logsToSave = this.localLogs.slice(-100).map(log => ({
                ...log,
                timestamp: log.timestamp.toISOString()
            }))
            localStorage.setItem('app_logs', JSON.stringify(logsToSave))
        } catch (e) {
            // Ignora erros de storage
        }
    }

    // Carrega logs do localStorage
    private loadLocalLogs() {
        try {
            const saved = localStorage.getItem('app_logs')
            if (saved) {
                const parsed = JSON.parse(saved)
                this.localLogs = parsed.map((log: any) => ({
                    ...log,
                    timestamp: new Date(log.timestamp)
                }))
            }
        } catch (e) {
            // Ignora erros
        }
    }

    // Envia log para Firebase (apenas erros e fatais por padrão)
    private async sendToRemote(entry: LogEntry) {
        if (!this.enableRemoteLogging) return
        if (!this.userId) return // Só envia se tiver usuário logado

        // Só envia warn, error e fatal para o Firebase
        if (this.levels.indexOf(entry.level) < this.levels.indexOf('warn')) return

        try {
            const logsRef = collection(db, 'logs')
            await addDoc(logsRef, {
                ...entry,
                timestamp: Timestamp.fromDate(entry.timestamp)
            })
        } catch (e) {
            // Falha silenciosa - não queremos loop de erros
            console.error('Falha ao enviar log remoto:', e)
        }
    }

    // Loga no console
    private logToConsole(entry: LogEntry) {
        if (!this.enableConsoleLogging) return

        const prefix = `[${entry.level.toUpperCase()}] ${entry.context || 'app'}:`
        const style = {
            debug: 'color: gray',
            info: 'color: blue',
            warn: 'color: orange',
            error: 'color: red',
            fatal: 'color: white; background: red; font-weight: bold'
        }

        console.log(`%c${prefix}`, style[entry.level], entry.message, entry.data || '')

        if (entry.error) {
            console.error(entry.error.stack || entry.error.message)
        }
    }

    // Método principal de log
    private log(
        level: LogLevel,
        message: string,
        context?: string,
        data?: Record<string, any>,
        error?: Error
    ) {
        if (!this.shouldLog(level)) return

        const entry = this.createLogEntry(level, message, context, data, error)

        this.logToConsole(entry)
        this.saveLocally(entry)
        this.sendToRemote(entry)

        return entry
    }

    // Métodos de conveniência
    debug(message: string, context?: string, data?: Record<string, any>) {
        return this.log('debug', message, context, data)
    }

    info(message: string, context?: string, data?: Record<string, any>) {
        return this.log('info', message, context, data)
    }

    warn(message: string, context?: string, data?: Record<string, any>, error?: Error) {
        return this.log('warn', message, context, data, error)
    }

    error(message: string, context?: string, data?: Record<string, any>, error?: Error) {
        return this.log('error', message, context, data, error)
    }

    fatal(message: string, context?: string, data?: Record<string, any>, error?: Error) {
        return this.log('fatal', message, context, data, error)
    }

    // Retorna logs locais
    getLogs(level?: LogLevel, limit?: number): LogEntry[] {
        let logs = [...this.localLogs]

        if (level) {
            const minIndex = this.levels.indexOf(level)
            logs = logs.filter(log => this.levels.indexOf(log.level) >= minIndex)
        }

        logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

        if (limit) {
            logs = logs.slice(0, limit)
        }

        return logs
    }

    // Busca logs remotos do usuário
    async getRemoteLogs(userId: string, limitCount: number = 50): Promise<LogEntry[]> {
        try {
            const logsRef = collection(db, 'logs')
            const q = query(
                logsRef,
                where('userId', '==', userId),
                orderBy('timestamp', 'desc'),
                limit(limitCount)
            )

            const snapshot = await getDocs(q)
            return snapshot.docs.map(doc => {
                const data = doc.data()
                return {
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp.toDate()
                } as LogEntry
            })
        } catch (e) {
            console.error('Erro ao buscar logs remotos:', e)
            return []
        }
    }

    // Limpa logs locais
    clearLocalLogs() {
        this.localLogs = []
        localStorage.removeItem('app_logs')
        this.info('Logs locais limpos', 'logger.clear')
    }

    // Exporta logs para compartilhamento/debug
    exportLogs(): string {
        const logs = this.getLogs()
        return JSON.stringify(logs, null, 2)
    }

    // Obtém ID da sessão atual
    getSessionId(): string {
        return this.sessionId
    }

    // Obtém estatísticas de logs
    getStats() {
        const logs = this.localLogs
        return {
            total: logs.length,
            byLevel: {
                debug: logs.filter(l => l.level === 'debug').length,
                info: logs.filter(l => l.level === 'info').length,
                warn: logs.filter(l => l.level === 'warn').length,
                error: logs.filter(l => l.level === 'error').length,
                fatal: logs.filter(l => l.level === 'fatal').length
            },
            sessionId: this.sessionId,
            oldestLog: logs.length > 0 ? logs[0]?.timestamp ?? null : null,
            newestLog: logs.length > 0 ? logs[logs.length - 1]?.timestamp ?? null : null
        }
    }
}

// Singleton
export const logger = new LoggerService()

// Composable para uso em componentes Vue
export function useLogger() {
    return {
        debug: logger.debug.bind(logger),
        info: logger.info.bind(logger),
        warn: logger.warn.bind(logger),
        error: logger.error.bind(logger),
        fatal: logger.fatal.bind(logger),
        getLogs: logger.getLogs.bind(logger),
        getStats: logger.getStats.bind(logger),
        exportLogs: logger.exportLogs.bind(logger),
        clearLocalLogs: logger.clearLocalLogs.bind(logger),
        setUser: logger.setUser.bind(logger),
        getSessionId: logger.getSessionId.bind(logger)
    }
}

export default logger
