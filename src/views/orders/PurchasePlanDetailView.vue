<template>
  <div class="purchase-plan-detail-view">
    <!-- 全局操作区 -->
    <div class="global-actions" style="margin-bottom: 16px; text-align: right">
      <a-space>
        <a-button @click="$router.back()">返回</a-button>
      </a-space>
    </div>

    <a-spin :spinning="loading">
      <a-alert v-if="error" type="error" :message="error" show-icon style="margin-bottom: 16px" />

      <!-- 预测基本信息 -->
      <div style="background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <a-card title="预测基本信息" size="small">
          <a-descriptions size="small" :column="{ xs: 1, sm: 2, md: 4 }">
            <a-descriptions-item label="预测单号">{{ order?.order_no || '-' }}</a-descriptions-item>
            <a-descriptions-item label="供应商名称">{{ order?.supplier_name || '-' }}</a-descriptions-item>
            <a-descriptions-item label="创建时间">{{ formatDate(order?.create_time as string) }}</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </div>

      <!-- 预测明细 -->
      <div style="background: #fff; padding: 16px; border-radius: 8px;">
        <a-tabs v-model:activeKey="activeTab" type="card">
          <a-tab-pane key="details" tab="预测明细">
            <a-card size="small">
              <template #title>
                <a-space>
                  <span>预测明细</span>
                  <a-tag color="blue">{{ details.length }} 行</a-tag>
                </a-space>
              </template>
              <a-table
                :columns="detailColumns"
                :data-source="details"
                row-key="id"
                size="small"
                :pagination="false"
                :scroll="{ x: 1200 }"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'planned_qty'">
                    <span style="font-weight: 500; color: #1890ff">
                      {{ record.planned_qty }}
                    </span>
                  </template>
                  <template v-else-if="column.key === 'supplier_order_status'">
                    <a-tag :color="getStatusColor(record.supplier_order_status)">
                      {{ getStatusText(record.supplier_order_status) }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'action'">
                    <a-button
                      v-if="record.supplier_order_status === 0 || record.supplier_order_status === '0'"
                      type="primary"
                      size="small"
                      @click="handleConfirm(record)"
                    >
                      确认
                    </a-button>
                    <span v-else style="color: #999">已确认</span>
                  </template>
                </template>
              </a-table>
            </a-card>
          </a-tab-pane>
        </a-tabs>
      </div>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { TagColor } from 'ant-design-vue/es/tag'
import { getPurchasePlanOrder, confirmOrderDetail, type JsonMap } from '@/api/srm'
import { useSessionStore } from '@/stores/session'

const route = useRoute()
const session = useSessionStore()

const props = defineProps<{
  id: string
}>()

const loading = ref(false)
const error = ref('')
const activeTab = ref('details')

const order = ref<JsonMap | null>(null)
const details = ref<JsonMap[]>([])

const detailColumns: ColumnsType<JsonMap> = [
  { title: '零件号', dataIndex: 'parts_number', key: 'parts_number', width: 150 },
  { title: '零件名称', dataIndex: 'parts_name', key: 'parts_name', ellipsis: true },
  { title: '计划时间', dataIndex: 'plan_period', key: 'plan_period', width: 120 },
  { title: '预测释放时间', dataIndex: 'forecast_release_date', key: 'forecast_release_date', width: 120 },
  { title: '计划数量', dataIndex: 'planned_qty', key: 'planned_qty', width: 120 },
  { title: '预测状态', dataIndex: 'supplier_order_status', key: 'supplier_order_status', width: 100 },
  { title: '操作', key: 'action', width: 120, fixed: 'right' }
]

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-'
  if (dateStr.length === 10) return dateStr
  return dateStr.substring(0, 10)
}

function getStatusColor(status: string | number | undefined): TagColor {
  const colorMap: Record<number, string> = {
    0: 'orange',
    20: 'green',
    21: 'purple',
    25: 'blue',
    30: 'blue'
  }
  return colorMap[Number(status)] || 'default'
}

function getStatusText(status: string | number | undefined): string {
  const textMap: Record<number, string> = {
    0: '待确认',
    20: '已确认',
    21: '部分确认',
    25: '部分发运',
    30: '已发运',
    40: '已结案'
  }
  return textMap[Number(status)] || '待确认'
}

async function handleConfirm(record: JsonMap) {
  const detailId = record.id || record.detail_id
  if (!detailId) {
    message.error('预测详情ID不存在')
    return
  }
  try {
    await confirmOrderDetail(String(detailId), session.userId)
    message.success('已确认')
    await loadData()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; friendlyMessage?: string }
    message.error(err.response?.data?.message || err.friendlyMessage || '确认失败')
  }
}

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await getPurchasePlanOrder(props.id, session.userId.toString())
    order.value = res.order
    details.value = res.details || []
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; friendlyMessage?: string }
    error.value = err.response?.data?.message || err.friendlyMessage || '加载失败'
  } finally {
    loading.value = false
  }
}

loadData()
</script>

<style scoped>
.purchase-plan-detail-view {
  padding: 16px;
}
</style>