<template>
  <div class="srm-page">
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px">
      <div>
        <h1 style="margin: 0; font-size: 22px; font-weight: 600">交付计划</h1>
        <p style="color: #64748b; margin: 4px 0 0">展示未来 7 日的 ASN 预计到货计划，按日期聚合。</p>
      </div>
      <div>
        <a-button type="primary" @click="shipSelected" :disabled="selectedRowKeys.length === 0" style="margin-right: 8px">批量发货</a-button>
        <a-button @click="loadData">刷新</a-button>
      </div>
    </div>

    <a-alert v-if="error" type="error" :message="error" show-icon style="margin-bottom: 16px" />

    <a-layout style="background: #fff; padding: 16px; border-radius: 8px;">
      <!-- 左侧统计信息区域 -->
      <a-layout-sider width="300" style="background: #fafafa; padding: 16px; border-radius: 8px; margin-right: 16px;">
        <a-card title="统计信息" size="small">
          <a-descriptions bordered size="small" :column="1">
            <a-descriptions-item label="总 收货 数量">{{ items.length }}</a-descriptions-item>
            <a-descriptions-item label="已创建" :span="2">{{ items.filter(item => item.status === 'CREATED').length }}</a-descriptions-item>
            <a-descriptions-item label="已发货" :span="2">{{ items.filter(item => item.status === 'SHIPPED').length }}</a-descriptions-item>
            <a-descriptions-item label="已签收" :span="2">{{ items.filter(item => item.status === 'RECEIVED' || item.status === 'COMPLETED').length }}</a-descriptions-item>
            <a-descriptions-item label="未来 7 天" :span="2">{{ Object.keys(groupedAsn).length }} 天</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-layout-sider>

      <!-- 右侧交付计划列表区域 -->
      <a-layout-content style="flex: 1;">
        <a-spin :spinning="loading">
          <template v-if="Object.keys(groupedAsn).length">
            <div v-for="(list, date) in groupedAsn" :key="date" style="margin-bottom: 24px">
              <a-card :title="`${date} 到货计划 (${list.length})`" size="small" style="margin-bottom: 16px">
                <a-table
                  :row-selection="{ selectedRowKeys, onChange: onSelectChange, getCheckboxProps: (record) => ({ disabled: record.status !== 'CREATED' }) }"
                  :columns="columns"
                  :data-source="list"
                  :pagination="false"
                  row-key="id"
                  size="middle"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'status'">
                      <a-tag :color="getStatusColor(record.status)">{{ getStatusText(record.status) }}</a-tag>
                    </template>
                    <template v-else-if="column.key === 'action'">
                      <a-button type="link" @click="goDetail(record)">查看</a-button>
                    </template>
                  </template>
                </a-table>
              </a-card>
            </div>
          </template>
          <a-empty v-else description="未来 7 日暂无到货 ASN 计划" />
        </a-spin>
      </a-layout-content>
    </a-layout>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { listAsnPlan, shipAsn, type JsonMap } from '@/api/srm'
import { message } from 'ant-design-vue'
import type { ColumnsType } from 'ant-design-vue/es/table'

const router = useRouter()
const session = useSessionStore()
const loading = ref(false)
const error = ref('')
const items = ref<JsonMap[]>([])
const selectedRowKeys = ref<Key[]>([])

const columns: ColumnsType<JsonMap> = [
  { title: 'ASN 单号', dataIndex: 'asn_no', key: 'asn_no' },
  { title: '物流公司', dataIndex: 'logistics_company', key: 'logistics_company' },
  { title: '运单号', dataIndex: 'tracking_no', key: 'tracking_no' },
  { title: '订单数', dataIndex: 'order_count', key: 'order_count', width: 90 },
  { title: '主要物料', dataIndex: 'major_parts', key: 'major_parts', ellipsis: true },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '操作', key: 'action', width: 90 },
]

const groupedAsn = computed(() => {
  return items.value.reduce<Record<string, JsonMap[]>>((acc, item) => {
    const date = String(item.eta_date || '未指定日期')
    if (!acc[date]) acc[date] = []
    acc[date].push(item)
    return acc
  }, {})
})

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    CREATED: 'blue',
    SHIPPED: 'cyan',
    RECEIVED: 'green',
    INSPECTING: 'orange',
    COMPLETED: 'green',
  }
  return map[status] || 'default'
}

function getStatusText(status: string) {
  const map: Record<string, string> = {
    CREATED: '已创建',
    SHIPPED: '已发货',
    RECEIVED: '已签收',
    INSPECTING: '质检中',
    COMPLETED: '已完成',
  }
  return map[status] || String(status || '-')
}

function onSelectChange(keys: Key[]) {
  selectedRowKeys.value = keys
}

function goDetail(record: JsonMap) {
  const id = Number(record.id)
  if (!Number.isFinite(id)) {
    message.warning('ASN ID 无效')
    return
  }
  router.push({ name: 'asn-detail', params: { id: String(id) } })
}

async function shipSelected() {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请先选择要发货的 ASN')
    return
  }
  try {
    for (const key of selectedRowKeys.value) {
      await shipAsn(Number(key), session.userId)
    }
    message.success(`成功标记 ${selectedRowKeys.value.length} 个 ASN 为已发货`)
    selectedRowKeys.value = []
    await loadData()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; friendlyMessage?: string }
    message.error(err.response?.data?.message || err.friendlyMessage || '发货失败')
  }
}

async function loadData() {
  loading.value = true
  error.value = ''
  items.value = []
  try {
    items.value = await listAsnPlan(session.userId)
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; friendlyMessage?: string }
    error.value = err.response?.data?.message || err.friendlyMessage || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>
