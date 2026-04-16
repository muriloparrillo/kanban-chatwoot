<script setup>
defineProps({ funnels: Array, modelValue: [Number, String] });
defineEmits(['update:modelValue']);
</script>

<template>
  <div class="flex items-center gap-2">
    <label class="text-sm text-slate-500">Funil:</label>
    <select
      :value="modelValue"
      @change="$emit('update:modelValue', Number($event.target.value))"
      class="border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white">
      <option v-for="f in funnels" :key="f.id" :value="f.id">{{ f.name }}</option>
    </select>
  </div>
</template>
