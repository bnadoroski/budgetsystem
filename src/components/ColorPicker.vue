<template>
    <div class="color-picker-component">
        <div class="color-picker">
            <div v-for="color in colors" :key="color" class="color-option" :class="{ selected: modelValue === color }"
                :style="{ backgroundColor: color }" @click="selectColor(color)"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    modelValue: string
}>()

const emit = defineEmits<{
    'update:modelValue': [value: string]
}>()

const colors = [
    // Verdes (claro, médio, escuro)
    '#E8F5E9', '#4CAF50', '#2E7D32',
    // Azuis (claro, médio, escuro)
    '#E3F2FD', '#2196F3', '#1565C0',
    // Vermelhos/Rosas (claro, médio, escuro)
    '#FCE4EC', '#E91E63', '#AD1457',
    // Laranjas (claro, médio, escuro)
    '#FFF3E0', '#FF9800', '#E65100',
    // Roxos (claro, médio, escuro)
    '#F3E5F5', '#9C27B0', '#6A1B9A',
    // Amarelos/Lima (claro, médio, escuro)
    '#F9FBE7', '#CDDC39', '#9E9D24',
    // Cianos/Turquesa (claro, médio)
    '#E0F7FA', '#00BCD4',
    // Marrons (médio)
    '#D7CCC8'
]

const selectColor = (color: string) => {
    emit('update:modelValue', color)
}
</script>

<style scoped>
.color-picker {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
    gap: 8px;
    padding: 8px 0;
}

.color-option {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
    border: 3px solid transparent;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.color-option:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.color-option.selected {
    border-color: #333;
    transform: scale(1.15);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
</style>
