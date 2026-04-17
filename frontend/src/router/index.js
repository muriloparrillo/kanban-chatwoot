import { createRouter, createWebHashHistory } from 'vue-router';
import BoardView from '../views/BoardView.vue';
import FunnelSettings from '../views/FunnelSettings.vue';
import AccountSetup from '../views/AccountSetup.vue';
import LeadDetail from '../views/LeadDetail.vue';
import ProductsView from '../views/ProductsView.vue';
import AgendaView from '../views/AgendaView.vue';
import TasksView from '../views/TasksView.vue';

const routes = [
  { path: '/', redirect: '/board' },
  { path: '/setup', name: 'setup', component: AccountSetup },
  { path: '/board', name: 'board', component: BoardView },
  { path: '/board/:funnelId', name: 'board-funnel', component: BoardView, props: true },
  { path: '/settings/funnels', name: 'funnel-settings', component: FunnelSettings },
  { path: '/settings/products', name: 'products-settings', component: ProductsView },
  { path: '/agenda', name: 'agenda', component: AgendaView },
  { path: '/tasks', name: 'tasks', component: TasksView },
  { path: '/leads/:id', name: 'lead-detail', component: LeadDetail, props: true }
];

export default createRouter({
  history: createWebHashHistory(),
  routes
});
