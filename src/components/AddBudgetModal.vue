<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show" class="modal-overlay" @click="close">
                <div class="modal-content" @click.stop>
                    <h2>Novo Budget</h2>
                    <form @submit.prevent="handleSubmit">
                        <div class="form-group">
                            <label for="budget-name">Nome do Budget</label>
                            <input id="budget-name" v-model="budgetName" type="text" required
                                placeholder="Ex: Alimentação" />
                        </div>
                        <div class="form-group">
                            <label for="budget-value">Valor Total</label>
                            <input id="budget-value" v-model.number="budgetValue" type="number" step="0.01" min="0"
                                required placeholder="0.00" />
                        </div>
                        <div class="form-group">
                            <label for="budget-color">Cor</label>
                            <div class="color-picker">
                                <div v-for="color in availableColors" :key="color" class="color-option"
                                    :class="{ selected: budgetColor === color }" :style="{ backgroundColor: color }"
                                    @click="budgetColor = color"></div>
                                <div class="color-option custom-color" :class="{ selected: isCustomColor }">
                                    <input type="color" v-model="budgetColor" class="color-input"
                                        title="Escolher cor personalizada" />
                                    <svg v-if="!isCustomColor" xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                                        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-cancel" @click="close">Cancelar</button>
                            <button type="submit" class="btn-submit">Adicionar</button>
                        </div>
                    </form>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const props = defineProps<{
    show: boolean
}>()

const emit = defineEmits<{
    close: []
    submit: [name: string, value: number, color: string]
}>()

const budgetName = ref('')
const budgetValue = ref<number>(0)
const budgetColor = ref('#4CAF50')

const availableColors = [
    '#4CAF50', // Verde
    '#9C27B0', // Roxo
    '#CDDC39', // Lima
    '#FF9800', // Laranja
    '#2196F3', // Azul
    '#E91E63', // Rosa
    '#00BCD4', // Ciano
    '#FF5722', // Vermelho
    '#795548', // Marrom
    '#607D8B'  // Cinza-azul
]

const isCustomColor = computed(() => {
    return !availableColors.includes(budgetColor.value)
})

watch(() => props.show, (newVal) => {
    if (newVal) {
        budgetName.value = ''
        budgetValue.value = 0
        budgetColor.value = '#4CAF50'
    }
})

const handleSubmit = () => {
    if (budgetName.value && budgetValue.value > 0) {
        emit('submit', budgetName.value, budgetValue.value, budgetColor.value)
        close()
    }
}

const close = () => {
    emit('close')
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
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    border-radius: 12px;
    padding: 24px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

h2 {
    margin: 0 0 20px 0;
    font-size: 24px;
    color: #333;
}

.form-group {
    margin-bottom: 16px;
}

label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
    color: #555;
    font-size: 14px;
}

input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 16px;
    box-sizing: border-box;
    transition: border-color 0.2s;
}

input:focus {
    outline: none;
    border-color: #4CAF50;
}

.color-picker {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.color-option {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
    border: 3px solid transparent;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

.color-option:hover {
    transform: scale(1.1);
}

.color-option.selected {
    border-color: #333;
    box-shadow: 0 0 0 2px #fff, 0 0 0 4px #333;
}

.custom-color {
    background: linear-gradient(135deg,
            #ff0000 0%, #ff7f00 14%, #ffff00 28%,
            #00ff00 42%, #0000ff 57%, #4b0082 71%,
            #9400d3 85%, #ff0000 100%);
    overflow: hidden;
}

.custom-color.selected {
    border-color: #333;
}

.color-input {
    position: absolute;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    border: none;
    padding: 0;
}

.custom-color svg {
    pointer-events: none;
    color: white;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.form-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
}

button {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-cancel {
    background-color: #f0f0f0;
    color: #666;
}

.btn-cancel:hover {
    background-color: #e0e0e0;
}

.btn-submit {
    background-color: #4CAF50;
    color: white;
}

.btn-submit:hover {
    background-color: #45a049;
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
    transition: transform 0.3s ease;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
    transform: scale(0.9);
}
</style>
