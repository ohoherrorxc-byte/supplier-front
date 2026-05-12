<template>
  <a-layout style="min-height: 100vh">
    <a-layout-header
      style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 24px;
        background: #0f172a;
      "
    >
      <div style="display: flex; align-items: center; gap: 24px">
        <span style="color: #fff; font-size: 17px; font-weight: 600">供应商协同门户</span>
        <a-menu
          :selected-keys="menuSelectedKeys"
          theme="dark"
          mode="horizontal"
          style="flex: 1; min-width: 320px; background: transparent; border: none"
          :style="{ lineHeight: '64px' }"
        >
          <a-menu-item key="/dashboard">
            <router-link to="/dashboard">工作台</router-link>
          </a-menu-item>
            <a-sub-menu key="/order-management">
            <template #title>订单管理</template>
            <a-menu-item key="/order-management-supplier-history">
              <router-link to="/order-management-supplier-history">供应商历史</router-link>
            </a-menu-item>
            <a-menu-item key="/order-management">
              <router-link to="/order-management">正式订单</router-link>
            </a-menu-item>
            <!-- <a-menu-item key="/order-management-jit-orders">
              <router-link to="/order-management-jit-orders">国内 JIT</router-link>
            </a-menu-item>
            <a-menu-item key="/order-management-sales-forecast">
              <router-link to="/order-management-sales-forecast">销售预测</router-link>
            </a-menu-item> -->
            <a-menu-item key="/order-management-purchase-plan">
              <router-link to="/order-management-purchase-plan">需求预测</router-link>
            </a-menu-item>
          
            <!-- <a-menu-item key="/order-management-outsourcing">
              <router-link to="/order-management-outsourcing">委外加工</router-link>
            </a-menu-item>
            <a-menu-item key="/order-management-assr-orders">
              <router-link to="/order-management-assr-orders">ASSR 紧急售后</router-link>
            </a-menu-item> -->
          </a-sub-menu>
          <!-- <a-menu-item key="/orders">
            <router-link to="/orders">新订单</router-link>
          </a-menu-item>
          <a-menu-item key="/shipment/orders">
            <router-link to="/shipment/orders">待发货订单列表</router-link>
          </a-menu-item> -->
          <a-menu-item key="/delivery-plan">
            <router-link to="/delivery-plan">交付计划</router-link>
          </a-menu-item>
          <!-- <a-menu-item key="/asn/plan">
            <router-link to="/asn/plan">到货计划</router-link>
          </a-menu-item> -->
          <!-- <a-menu-item key="/asn">
            <router-link to="/asn">发货通知</router-link>
          </a-menu-item> -->
          <!-- <a-menu-item key="/asn/create">
            <router-link to="/asn/create">创建 ASN</router-link>
          </a-menu-item> -->
          <a-menu-item key="/shipments">
            <router-link to="/shipments">发运管理</router-link>
          </a-menu-item>
          <a-sub-menu key="/invoice">
            <template #title>供应商开票</template>
            <a-menu-item key="/invoice/pending/general">
              <router-link to="/invoice/pending/general">一般采购</router-link>
            </a-menu-item>
            <a-menu-item key="/invoice/pending/bom">
              <router-link to="/invoice/pending/bom">BOM采购</router-link>
            </a-menu-item>
            <a-menu-item key="/invoice/settlement/list">
              <router-link to="/invoice/settlement/list">结算单列表</router-link>
            </a-menu-item>
          </a-sub-menu>
          <a-menu-item key="/profile">
            <router-link to="/profile">个人信息</router-link>
          </a-menu-item>
          <!-- <a-menu-item key="/documentation">
            <router-link to="/documentation">订单管理文档</router-link>
          </a-menu-item> -->
        
        </a-menu>
      </div>
      <div style="color: rgba(255, 255, 255, 0.85); font-size: 13px">
        {{ session.userName || '用户' }}
        <a-button type="link" style="color: #93c5fd; margin-left: 8px" @click="onLogout">退出</a-button>
      </div>
    </a-layout-header>
    <a-layout-content>
      <router-view />
    </a-layout-content>
  </a-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()

const menuSelectedKeys = computed(() => {
  const p = route.path
  if (p.startsWith('/orders') && !p.startsWith('/shipment/orders')) return ['/orders']
  if (p.startsWith('/shipment/orders')) return ['/shipment/orders']
  if (p.startsWith('/delivery-plan')) return ['/delivery-plan']
  if (p.startsWith('/asn/plan')) return ['/asn/plan']
  if (p.startsWith('/asn/create')) return ['/asn/create']
  if (p.startsWith('/asn')) return ['/asn']
  if (p.startsWith('/shipments')) return ['/shipments']
  if (p.startsWith('/invoice')) return ['/invoice']
  if (p.startsWith('/profile')) return ['/profile']
  if (p.startsWith('/documentation')) return ['/documentation']
  if (p.startsWith('/order-management-')) {
    // 直接返回当前路径作为选中的菜单项
    return [p]
  }
  if (p.startsWith('/order-management')) {
    const tab = route.query.tab as string || 'standard-po'
    return [`/order-management/${tab}`]
  }
  return ['/dashboard']
})

function onLogout() {
  session.logout()
  router.push({ name: 'login' })
}
</script>
