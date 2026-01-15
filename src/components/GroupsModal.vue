<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show" class="modal-overlay" @click.self="emit('close')">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Gerenciar Grupos</h2>
                        <button class="close-button" @click="emit('close')">×</button>
                    </div>

                    <div class="modal-body">
                        <div class="add-group-section">
                            <h3>Criar Novo Grupo</h3>
                            <div class="input-group">
                                <input v-model="newGroupName" type="text"
                                    placeholder="Ex: Contas Fixas, Lazer, Alimentação..."
                                    @keyup.enter="handleAddGroup" />
                                <ColorPicker v-model="newGroupColor" />
                                <button class="add-button" @click="handleAddGroup" :disabled="!newGroupName">
                                    Criar
                                </button>
                            </div>
                        </div>

                        <div class="groups-list">
                            <h3>Grupos Existentes</h3>
                            <div v-if="budgetStore.groups.length === 0" class="no-groups">
                                <p>Nenhum grupo criado ainda</p>
                            </div>

                            <div v-else class="group-items">
                                <div v-for="group in budgetStore.groups" :key="group.id" class="group-item">
                                    <div v-if="editingGroupId === group.id" class="edit-mode">
                                        <input v-model="editName" type="text" class="edit-input" />
                                        <input v-model="editColor" type="color" class="edit-color" />
                                        <div class="edit-actions">
                                            <button class="btn-save" @click="handleSaveEdit">Salvar</button>
                                            <button class="btn-cancel" @click="editingGroupId = null">Cancelar</button>
                                        </div>
                                    </div>

                                    <div v-else class="view-mode">
                                        <div class="group-info">
                                            <div class="group-color" :style="{ backgroundColor: group.color }"></div>
                                            <div class="group-text">
                                                <span class="group-name">{{ group.name }}</span>
                                                <span class="budget-count">({{ getBudgetCount(group.id) }}
                                                    budgets)</span>
                                            </div>
                                        </div>
                                        <div class="group-actions">
                                            <button class="action-btn" @click="handleEditGroup(group)">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                                    stroke="currentColor" stroke-width="2">
                                                    <path
                                                        d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7">
                                                    </path>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z">
                                                    </path>
                                                </svg>
                                            </button>
                                            <button class="action-btn danger" @click="handleDeleteGroup(group.id)">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                                    stroke="currentColor" stroke-width="2">
                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                    <path
                                                        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2">
                                                    </path>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="info-box">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                            <p>Ao criar um budget, você poderá selecioná-lo para um grupo específico. Grupos ajudam a
                                organizar e visualizar melhor suas categorias de gastos.</p>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>

        <!-- Modal de confirmação para excluir grupo -->
        <ConfirmModal
            :show="showDeleteConfirm"
            :title="'Excluir Grupo'"
            :message="deleteConfirmMessage"
            type="danger"
            confirm-text="Excluir"
            confirm-icon="🗑️"
            @confirm="confirmDeleteGroup"
            @cancel="cancelDeleteGroup"
        />

        <!-- Toast de erro -->
        <ToastNotification
            :show="showErrorToast"
            :message="errorMessage"
            type="error"
            @close="showErrorToast = false"
        />
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import type { BudgetGroup } from '@/types/budget'
import ColorPicker from './ColorPicker.vue'
import ConfirmModal from './ConfirmModal.vue'
import ToastNotification from './ToastNotification.vue'

const props = defineProps<{
    show: boolean
    editGroupId?: string | null
    deleteGroupId?: string | null
}>()

const emit = defineEmits<{
    close: []
}>()

const budgetStore = useBudgetStore()
const newGroupName = ref('')
const newGroupColor = ref('#4CAF50')
const editingGroupId = ref<string | null>(null)
const editName = ref('')
const editColor = ref('')
const showDeleteConfirm = ref(false)
const groupIdToDelete = ref<string | null>(null)
const showErrorToast = ref(false)
const errorMessage = ref('')

// Watch para pré-selecionar grupo para edição
watch(() => props.editGroupId, (newEditId) => {
    if (newEditId && props.show) {
        const group = budgetStore.groups.find(g => g.id === newEditId)
        if (group) {
            handleEditGroup(group)
        }
    }
}, { immediate: true })

// Watch para pré-selecionar grupo para deletar
watch(() => props.deleteGroupId, (newDeleteId) => {
    if (newDeleteId && props.show) {
        handleDeleteGroup(newDeleteId)
    }
}, { immediate: true })

// Reset ao fechar modal
watch(() => props.show, (isVisible) => {
    if (!isVisible) {
        editingGroupId.value = null
        showDeleteConfirm.value = false
        groupIdToDelete.value = null
    }
})

const handleAddGroup = async () => {
    if (!newGroupName.value) return

    // Verificar se já existe grupo com mesmo nome
    const nameExists = budgetStore.groups.some(
        g => g.name.toLowerCase() === newGroupName.value.toLowerCase()
    )

    if (nameExists) {
        errorMessage.value = `Já existe um grupo chamado "${newGroupName.value}"`
        showErrorToast.value = true
        return
    }

    console.log('🔵 GroupsModal: handleAddGroup iniciado', { name: newGroupName.value, color: newGroupColor.value })

    try {
        await budgetStore.addGroup(newGroupName.value, newGroupColor.value)
        console.log('✅ GroupsModal: addGroup concluído com sucesso')
    } catch (error) {
        console.error('❌ GroupsModal: Erro ao criar grupo:', error)
    }

    newGroupName.value = ''
    newGroupColor.value = '#4CAF50'
}

const handleEditGroup = (group: BudgetGroup) => {
    editingGroupId.value = group.id
    editName.value = group.name
    editColor.value = group.color
}

const handleSaveEdit = async () => {
    if (editingGroupId.value) {
        await budgetStore.updateGroup(editingGroupId.value, {
            name: editName.value,
            color: editColor.value
        })
        editingGroupId.value = null
    }
}

const handleDeleteGroup = async (groupId: string) => {
    groupIdToDelete.value = groupId
    showDeleteConfirm.value = true
}

const deleteConfirmMessage = computed(() => {
    if (!groupIdToDelete.value) return ''
    const budgetCount = getBudgetCount(groupIdToDelete.value)
    return budgetCount > 0
        ? `Este grupo tem <strong>${budgetCount} budget(s)</strong>. Os budgets não serão deletados, apenas o grupo.`
        : 'Tem certeza que deseja <strong>excluir</strong> este grupo?'
})

const confirmDeleteGroup = async () => {
    if (groupIdToDelete.value) {
        await budgetStore.deleteGroup(groupIdToDelete.value)
    }
    groupIdToDelete.value = null
    showDeleteConfirm.value = false
}

const cancelDeleteGroup = () => {
    groupIdToDelete.value = null
    showDeleteConfirm.value = false
}

const getBudgetCount = (groupId: string) => {
    return budgetStore.budgets.filter(b => b.groupId === groupId).length
}
</script>

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
    z-index: 1000;
    padding: 20px;
}

.modal-content {
    background: white;
    border-radius: 16px;
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
    overflow-x: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    box-sizing: border-box;
}

.modal-header {
    padding: 20px;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    background: white;
    z-index: 10;
}

.modal-header h2 {
    margin: 0;
    font-size: 24px;
    color: #333;
}

.close-button {
    background: none;
    border: none;
    font-size: 32px;
    color: #999;
    cursor: pointer;
    line-height: 1;
    padding: 0;
    width: 32px;
    height: 32px;
}

.close-button:hover {
    color: #333;
}

.modal-body {
    padding: 20px;
    overflow-x: hidden;
    box-sizing: border-box;
}

.add-group-section {
    margin-bottom: 30px;
}

.add-group-section h3,
.groups-list h3 {
    font-size: 16px;
    color: #333;
    margin: 0 0 12px 0;
}

.input-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.input-group input[type="text"] {
    width: 100%;
    padding: 12px;
    font-size: 14px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    transition: border-color 0.3s;
    box-sizing: border-box;
}

.input-group input[type="text"]:focus {
    outline: none;
    border-color: #4a90e2;
}

.add-button {
    padding: 12px 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: transform 0.2s;
    white-space: nowrap;
}

.add-button:hover:not(:disabled) {
    transform: scale(1.02);
}

.add-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.groups-list {
    margin-top: 24px;
}

.no-groups {
    text-align: center;
    padding: 30px;
    color: #999;
    font-size: 14px;
}

.group-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.group-item {
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    padding: 16px;
    background: #fafafa;
}

.view-mode {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.group-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
}

.group-color {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    flex-shrink: 0;
}

.group-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
}

.group-name {
    font-size: 16px;
    color: #333;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.budget-count {
    font-size: 12px;
    color: #999;
}

.group-actions {
    display: flex;
    gap: 8px;
}

.action-btn {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 8px;
    cursor: pointer;
    color: #666;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
}

.action-btn:hover {
    background: #f5f5f5;
    color: #333;
}

.action-btn.danger:hover {
    background: #fee;
    color: #e53e3e;
    border-color: #e53e3e;
}

.edit-mode {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.edit-input {
    padding: 10px;
    font-size: 14px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
}

.edit-input:focus {
    outline: none;
    border-color: #4a90e2;
}

.edit-color {
    height: 40px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    cursor: pointer;
}

.edit-actions {
    display: flex;
    gap: 8px;
}

.btn-save,
.btn-cancel {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: transform 0.2s;
}

.btn-save {
    background: #38a169;
    color: white;
}

.btn-cancel {
    background: #e0e0e0;
    color: #666;
}

.btn-save:hover,
.btn-cancel:hover {
    transform: scale(1.02);
}

.info-box {
    margin-top: 24px;
    padding: 16px;
    background: #e8f4fd;
    border: 1px solid #bee3f8;
    border-radius: 8px;
    display: flex;
    gap: 12px;
    align-items: flex-start;
}

.info-box svg {
    flex-shrink: 0;
    color: #3182ce;
    margin-top: 2px;
}

.info-box p {
    margin: 0;
    font-size: 13px;
    color: #2c5282;
    line-height: 1.5;
}

.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.3s;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
    transition: transform 0.3s;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
    transform: scale(0.9);
}
</style>
