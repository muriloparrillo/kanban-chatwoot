<script setup>
// Deep-link standalone view for a single lead. Reuses LeadModal UI via component.
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LeadsAPI } from '../services/api';
import LeadModal from '../components/LeadModal.vue';

const route = useRoute();
const router = useRouter();
const lead = ref(null);

onMounted(async () => {
  const { data } = await LeadsAPI.get(route.params.id);
  lead.value = data;
});
</script>

<template>
  <LeadModal v-if="lead" :lead="lead" @close="router.push('/board')" @updated="() => router.push('/board')" />
</template>
