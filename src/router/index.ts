import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '@/stores/session'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true, title: '进入工作台' },
    },
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      children: [
        { path: '', redirect: { name: 'dashboard' } },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { title: '工作台' },
        },
        {
          path: 'orders',
          name: 'orders',
          component: () => import('@/views/OrdersView.vue'),
          meta: { title: '新订单' },
        },
        {
          path: 'orders/:id',
          name: 'order-detail',
          component: () => import('@/views/OrderDetailView.vue'),
          props: true,
          meta: { title: '订单详情' },
        },
        {
          path: 'asn',
          name: 'asn-list',
          component: () => import('@/views/AsnListView.vue'),
          meta: { title: '发货通知' },
        },
        {
          path: 'asn/create',
          name: 'asn-create',
          component: () => import('@/views/AsnCreateView.vue'),
          meta: { title: '创建发货通知' },
        },
        {
          path: 'asn/plan',
          name: 'asn-plan',
          component: () => import('@/views/DeliveryPlanView.vue'),
          meta: { title: '交付计划' },
        },
        {
          path: 'delivery-plan',
          name: 'delivery-plan-manage',
          component: () => import('@/views/DeliveryPlanManageView.vue'),
          meta: { title: '交付计划管理' },
        },
        {
          path: 'asn/:id',
          name: 'asn-detail',
          component: () => import('@/views/AsnDetailView.vue'),
          props: true,
          meta: { title: '发货跟踪' },
        },
        {
          path: 'shipments',
          name: 'shipments',
          component: () => import('@/views/ShipmentsView.vue'),
          meta: { title: '发运信息管理' },
        },
        {
          path: 'shipment/orders',
          name: 'shipment-orders',
          component: () => import('@/views/ShipmentOrderListView.vue'),
          meta: { title: '待发货订单列表' },
        },
        {
          path: 'shipment/create',
          name: 'shipment-create',
          component: () => import('@/views/CreateShipmentView.vue'),
          meta: { title: '创建发运信息' },
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/ProfileView.vue'),
          meta: { title: '个人信息' },
        },
        {
          path: 'invoice/pending/general',
          name: 'invoice-pending-general',
          component: () => import('@/views/invoice/PendingInvoiceView.vue'),
          meta: { title: '待开票清单-一般采购' },
        },
        {
          path: 'invoice/pending/bom',
          name: 'invoice-pending-bom',
          component: () => import('@/views/invoice/PendingInvoiceView.vue'),
          meta: { title: '待开票清单-生产采购' },
        },
        {
          path: 'invoice/settlement/create',
          name: 'invoice-settlement-create',
          component: () => import('@/views/invoice/SettlementCreateView.vue'),
          meta: { title: '创建结算单' },
        },
        {
          path: 'invoice/settlement/list',
          name: 'invoice-settlement-list',
          component: () => import('@/views/invoice/SettlementListView.vue'),
          meta: { title: '结算单列表' },
        },
        {
          path: 'documentation',
          name: 'documentation',
          component: () => import('@/views/OrderDocumentationView.vue'),
          meta: { title: '订单管理文档' },
        },
        {
          path: 'order-management',
          name: 'order-management',
          component: () => import('@/views/OrderManagementView.vue'),
          meta: { title: '订单管理1' },
        },
        {
          path: 'order-management-standard-po',
          name: 'order-management-standard-po',
          component: () => import('@/views/orders/StandardPOView.vue'),
          meta: { title: '订单管理2' },
        },
        {
          path: 'order-management-jit-orders',
          name: 'order-management-jit-orders',
          component: () => import('@/views/orders/JitOrdersView.vue'),
          meta: { title: '订单管理3' },
        },
        {
          path: 'order-management-sales-forecast',
          name: 'order-management-sales-forecast',
          component: () => import('@/views/orders/SalesForecastView.vue'),
          meta: { title: '订单管理4' },
        },
        {
          path: 'order-management-purchase-plan',
          name: 'order-management-purchase-plan',
          component: () => import('@/views/orders/PurchasePlanView.vue'),
          meta: { title: '订单管理5' },
        },
        {
          path: 'order-management-purchase-plan/:id',
          name: 'purchase-plan-detail',
          component: () => import('@/views/orders/PurchasePlanDetailView.vue'),
          props: true,
          meta: { title: '预测详情' },
        },
        {
          path: 'order-management-dealer-history',
          name: 'order-management-dealer-history',
          component: () => import('@/views/orders/DealerHistoryView.vue'),
          meta: { title: '经销商历史' },
        },
        {
          path: 'order-management-supplier-history',
          name: 'order-management-supplier-history',
          component: () => import('@/views/orders/SupplierHistoryView.vue'),
          meta: { title: '供应商历史' },
        },
        {
          path: 'order-management-outsourcing',
          name: 'order-management-outsourcing',
          component: () => import('@/views/orders/OutsourcingMaterialView.vue'),
          meta: { title: '订单管理' },
        },
        {
          path: 'order-management-assr-orders',
          name: 'order-management-assr-orders',
          component: () => import('@/views/orders/AssrOrdersView.vue'),
          meta: { title: '订单管理8' },
        },
        {
          path: 'file-upload',
          name: 'file-upload',
          component: () => import('@/views/FileUploadView.vue'),
          meta: { title: '文件上传测试' },
        },
      ],
    },
  ],
})

// 联调阶段：不强制登录；需要 userId 的操作会在页面内提示
router.beforeEach(() => true)

export default router