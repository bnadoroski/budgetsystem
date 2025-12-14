<template>
    <div class="quick-amount-buttons">
        <button type="button" v-for="amount in amounts" :key="amount" @click="emit('add', amount)" class="quick-btn">
            +{{ amount }}
        </button>
    </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
    amounts?: number[]
}>(), {
    amounts: () => [100, 500, 1000]
})

const emit = defineEmits<{
    add: [amount: number]
}>()
</script>

<style scoped>
.quick-amount-buttons {
    display: flex;
    gap: 8px;
    margin-top: 8px;
}

.quick-btn {
    flex: 1;
    padding: 8px 12px;
    background-color: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.quick-btn:hover {
    background-color: #e8e8e8;
    border-color: #4CAF50;
}

.quick-btn:active {
    transform: scale(0.95);
    background-color: #4CAF50;
    color: white;
}
</style>
