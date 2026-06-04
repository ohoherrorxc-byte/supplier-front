<template>
  <div class="purchase-plan-view">
    <!-- <a-alert
      message="采购计划说明"
      description="采购计划为未来的周度排产意向，供应商必须在规定时间内填报【承诺可满足数量】。若承诺可满足数量小于计划量，系统将自动触发缺料预警。"
      type="warning"
      show-icon
      style="margin-bottom: 16px"
    /> -->
    <a-layout style="background: #fff; padding: 16px; border-radius: 8px;">
      <!-- 左侧查询区域 -->
      <a-layout-sider width="300" style="background: #fafafa; padding: 16px; border-radius: 8px; margin-right: 16px;">
        <div class="query-section">
          <h3 style="margin-bottom: 16px; font-size: 16px; font-weight: 500;">查询条件</h3>
          <a-form :model="queryParams">
            <a-form-item label="预测单号">
              <a-textarea
                v-model:value="queryParams.orderNo"
                placeholder="请输入预测单号"
                :rows="2"
                allow-clear
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item label="零件号">
              <a-textarea
                v-model:value="queryParams.partsNumber"
                placeholder="请输入零件号，支持批量输入（换行或逗号分隔）"
                :rows="3"
                allow-clear
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item label="计划时间">
              <a-range-picker
                v-model:value="queryParams.dateRange"
                picker="week"
                format="YYYY-ww"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item label="预测状态">
              <a-select
                v-model:value="queryParams.supplierOrderStatus"
                placeholder="选择状态"
                style="width: 100%"
                allow-clear
              >
                <a-select-option value="0">待确认</a-select-option>
                <a-select-option value="20">已确认</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item>
              <a-space style="width: 100%">
                <a-button type="primary" @click="handleQuery" style="flex: 1;">查询</a-button>
                <a-button @click="handleReset" style="flex: 1;">重置</a-button>
              </a-space>
            </a-form-item>
          </a-form>
        </div>
      </a-layout-sider>

      <!-- 右侧列表区域 -->
      <a-layout-content style="flex: 1;">
        <div style="margin-bottom: 16px">
          <a-space>
            <!-- <a-button
              type="primary"
              :disabled="selectedRowKeys.length === 0"
              @click="handleBatchFeedback"
            >
              批量反馈产能
            </a-button> -->
            <a-button @click="handleExport">导出</a-button>
          </a-space>
        </div>

        <a-tabs v-model:activeKey="activeTab" @change="handleTabChange">
          <a-tab-pane key="forecast-list" tab="预测列表（按预测单号）">
            <div class="summary-row" v-if="forecastListDataSource.length > 0">
              <span class="summary-item">
                <span class="summary-label">预测需求总数：</span>
                <span class="summary-value total">{{ forecastTotals.total }}</span>
              </span>
              <span class="summary-item">
                <span class="summary-label">待确认需求数量：</span>
                <span class="summary-value pending">{{ forecastTotals.pending }}</span>
              </span>
              <span class="summary-item">
                <span class="summary-label">已确认需求数量：</span>
                <span class="summary-value confirmed">{{ forecastTotals.confirmed }}</span>
              </span>
            </div>
            <a-table
              :columns="forecastListColumns"
              :data-source="forecastListDataSource"
              :loading="loading"
              :row-selection="forecastListRowSelection"
              :pagination="pagination"
              @change="handleTableChange"
              :scroll="{ x: 1500 }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'order_no'">
                  <a @click="handleViewDetail(record)" style="color: #1890ff; cursor: pointer">
                    {{ record.order_no }}
                  </a>
                </template>
                <template v-else-if="column.key === 'supplier_order_status'">
                  <a-tag :color="getStatusColor(record.supplier_order_status)">
                    {{ getStatusText(record.supplier_order_status) }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'planned_qty'">
                  <span style="font-weight: 500; color: #1890ff">
                    {{ record.planned_qty }}
                  </span>
                </template>
                <template v-else-if="column.key === 'forecast_total_qty'">
                  <span style="font-weight: 500; color: #1890ff">
                    {{ record.forecast_total_qty }}
                  </span>
                </template>
                <template v-else-if="column.key === 'forecast_pending_qty'">
                  <span style="color: #ff4d4f; font-weight: 500">
                    {{ record.forecast_pending_qty }}
                  </span>
                </template>
                <template v-else-if="column.key === 'forecast_confirmed_qty'">
                  <span style="color: #52c41a; font-weight: 500">
                    {{ record.forecast_confirmed_qty }}
                  </span>
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-button
                    type="link"
                    size="small"
                    @click="handleViewDetail(record)"
                  >
                    查看详情
                  </a-button>
                </template>
              </template>
            </a-table>
          </a-tab-pane>

          <a-tab-pane key="forecast-detail-list" tab="预测详情列表（按预测详情）">
            <div class="summary-row" v-if="forecastDetailListDataSource.length > 0">
              <span class="summary-item">
                <span class="summary-label">预测需求总数：</span>
                <span class="summary-value total">{{ forecastTotals.total }}</span>
              </span>
              <span class="summary-item">
                <span class="summary-label">待确认需求数量：</span>
                <span class="summary-value pending">{{ forecastTotals.pending }}</span>
              </span>
              <span class="summary-item">
                <span class="summary-label">已确认需求数量：</span>
                <span class="summary-value confirmed">{{ forecastTotals.confirmed }}</span>
              </span>
            </div>
            <a-table
              :columns="forecastDetailListColumns"
              :data-source="forecastDetailListDataSource"
              :loading="loading"
              :row-selection="forecastDetailListRowSelection"
              :pagination="pagination"
              @change="handleTableChange"
              :scroll="{ x: 1500 }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'feedback_status'">
                  <a-tag :color="getFeedbackStatusColor(record.feedback_status)">
                    {{ getFeedbackStatusText(record.feedback_status) }}
                  </a-tag>
                </template>
                <template v-if="column.key === 'planned_qty'">
                  <span style="font-weight: 500; color: #1890ff">
                    {{ record.planned_qty }}
                  </span>
                </template>
                <template v-if="column.key === 'committed_qty'">
                  <span
                    :style="{
                      fontWeight: 500,
                      color: record.committed_qty < record.planned_qty ? '#ff4d4f' : '#52c41a'
                    }"
                  >
                    {{ record.committed_qty || '-' }}
                  </span>
                </template>
                <template v-if="column.key === 'shortage_qty'">
                  <span v-if="record.shortage_qty > 0" style="color: #ff4d4f; font-weight: 500">
                    {{ record.shortage_qty }}
                  </span>
                  <span v-else style="color: #52c41a">-</span>
                </template>
                <template v-if="column.key === 'action'">
                  <a-space>
                    <!-- <a-button
                      type="primary"
                      size="small"
                      @click="handleFeedback(record)"
                    >
                      确认
                    </a-button> -->
                    <a-button
                      type="link"
                      size="small"
                      @click="handleViewDetail(record)"
                    >
                      查看详情
                    </a-button>
                  </a-space>
                </template>
              </template>
            </a-table>
          </a-tab-pane>
        </a-tabs>
      </a-layout-content>
    </a-layout>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { listPurchasePlan, listPurchasePlanDetails, confirmOrderDetail, exportPurchasePlan } from '@/api/srm'

const session = useSessionStore()
const router = useRouter()

const loading = ref(false)
const activeTab = ref('forecast-list')
const forecastListDataSource = ref<any[]>([])
const forecastDetailListDataSource = ref<any[]>([])
const selectedRowKeys = ref<any[]>([])
const selectedRows = ref<any[]>()

const queryParams = reactive({
  orderNo: '',
  partsNumber: '',
  dateRange: null as any,
  supplierOrderStatus: undefined as string | undefined
})

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条`
})

const forecastListColumns = [
  { title: '预测单号', dataIndex: 'order_no', key: 'order_no', width: 100, fixed: 'left' },
  { title: '预测释放时间', dataIndex: 'forecast_release_date', key: 'forecast_release_date', width: 100 },
  { title: '供应商名称', dataIndex: 'supplier_name', key: 'supplier_name', width: 100 },
  { title: '预测需求总数', dataIndex: 'forecast_total_qty', key: 'forecast_total_qty', width: 100 },
  // { title: '预测待确认需求数量', dataIndex: 'forecast_pending_qty', key: 'forecast_pending_qty', width: 120 },
  // { title: '已确认预测需求数量', dataIndex: 'forecast_confirmed_qty', key: 'forecast_confirmed_qty', width: 120 },
  { title: '预测状态', dataIndex: 'supplier_order_status', key: 'supplier_order_status', width: 100 },
  { title: '操作', key: 'action', width: 60, fixed: 'right' }
]

const forecastDetailListColumns = [
  { title: '预测单号', dataIndex: 'order_no', key: 'order_no', width: 150, fixed: 'left' },
  { title: '零件号', dataIndex: 'parts_number', key: 'parts_number', width: 150 },
  { title: '零件名称', dataIndex: 'parts_name', key: 'parts_name', width: 200 },
  { title: '计划时间', dataIndex: 'plan_period', key: 'plan_period', width: 120 },
  { title: '预测释放时间', dataIndex: 'forecast_release_date', key: 'forecast_release_date', width: 120 },
  { title: '计划数量', dataIndex: 'planned_qty', key: 'planned_qty', width: 120 },
  { title: '操作', key: 'action', width: 150, fixed: 'right' }
]

const forecastListRowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: any[], rows: any[]) => {
    selectedRowKeys.value = keys
    selectedRows.value = rows
  }
}))

const forecastDetailListRowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: any[], rows: any[]) => {
    selectedRowKeys.value = keys
    selectedRows.value = rows
  }
}))

const forecastTotals = computed(() => {
  if (activeTab.value === 'forecast-list') {
    let total = 0, pending = 0, confirmed = 0
    for (const item of forecastListDataSource.value) {
      total += Number(item.forecast_total_qty) || 0
      pending += Number(item.forecast_pending_qty) || 0
      confirmed += Number(item.forecast_confirmed_qty) || 0
    }
    return { total, pending, confirmed }
  } else {
    let total = 0, pending = 0, confirmed = 0
    for (const item of forecastDetailListDataSource.value) {
      const status = Number(item.supplier_order_status)
      const qty = Number(item.planned_qty) || 0
      total += qty
      if (status === 20) {
        confirmed += qty
      } else {
        pending += qty
      }
    }
    return { total, pending, confirmed }
  }
})

function getFeedbackStatusColor(status: string) {
  const colorMap: Record<string, string> = {
    'pending': 'orange',
    'confirmed': 'green',
    'shortage': 'red'
  }
  return colorMap[status] || 'default'
}

function getFeedbackStatusText(status: string) {
  const textMap: Record<string, string> = {
    'pending': '待反馈',
    'confirmed': '已确认',
    'shortage': '缺料预警'
  }
  return textMap[status] || status
}

function getStatusColor(status: string | number | undefined) {
  const colorMap: Record<number, string> = {
    0: 'orange',
    20: 'green',
    21: 'purple',
    25: 'blue',
    30: 'blue'
  }
  return colorMap[Number(status)] || 'default'
}

function getStatusText(status: string | number | undefined) {
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

function parseBatchInput(input: string): string[] {
  if (!input || !input.trim()) return []
  return input
    .split(/[\n,，]/)
    .map(item => item.trim())
    .filter(item => item.length > 0)
}

function handleTabChange(key: string) {
  activeTab.value = key
  selectedRowKeys.value = []
  selectedRows.value = []
  pagination.current = 1
  handleSearch()
}

function handleQuery() {
  pagination.current = 1
  handleSearch()
}

async function handleSearch() {
  loading.value = true
  try {
    const orderNos = parseBatchInput(queryParams.orderNo)
    const partsNumbers = parseBatchInput(queryParams.partsNumber)

    const startDate = queryParams.dateRange?.[0] ? String(queryParams.dateRange[0]).substring(0, 7) : ''
    const endDate = queryParams.dateRange?.[1] ? String(queryParams.dateRange[1]).substring(0, 7) : ''

    let result
    if (activeTab.value === 'forecast-list') {
      result = await listPurchasePlan({
        userId: session.userId.toString(),
        orderNo: orderNos.length > 0 ? orderNos : undefined,
        partsNumber: partsNumbers.length > 0 ? partsNumbers : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        supplierOrderStatus: queryParams.supplierOrderStatus,
        limit: pagination.pageSize,
        offset: (pagination.current - 1) * pagination.pageSize
      })
      forecastListDataSource.value = result.items || []
      forecastDetailListDataSource.value = []
    } else {
      result = await listPurchasePlanDetails({
        userId: session.userId.toString(),
        orderNo: orderNos.length > 0 ? orderNos : undefined,
        partsNumber: partsNumbers.length > 0 ? partsNumbers : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        supplierOrderStatus: queryParams.supplierOrderStatus,
        limit: pagination.pageSize,
        offset: (pagination.current - 1) * pagination.pageSize
      })
      forecastDetailListDataSource.value = result.items || []
      forecastListDataSource.value = []
    }

    pagination.total = result.total || 0
    selectedRowKeys.value = []
    selectedRows.value = []
  } catch (error) {
    console.error('查询采购计划失败:', error)
    message.error('查询失败')
  } finally {
    loading.value = false
  }
}

function handleReset() {
  queryParams.orderNo = ''
  queryParams.partsNumber = ''
  queryParams.dateRange = null
  queryParams.supplierOrderStatus = undefined
  pagination.current = 1
  handleSearch()
}

function handleTableChange(pag: any) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  handleSearch()
}

async function handleFeedback(record: any) {
  const detailId = record.id || record.detail_id
  if (!detailId) {
    message.error('预测详情ID不存在')
    return
  }
  try {
    await confirmOrderDetail(String(detailId), session.userId)
    message.success('已确认')
    handleSearch()
  } catch (error) {
    console.error('确认失败:', error)
    message.error('确认失败')
  }
}

function handleBatchFeedback() {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请至少选择一条采购计划')
    return
  }

  message.info('批量反馈产能功能待实现')
}

function handleViewDetail(record: any) {
  router.push(`/order-management-purchase-plan/${record.id || record.order_id}`)
}

function handleExport() {
  const orderNos = parseBatchInput(queryParams.orderNo)
  const partsNumbers = parseBatchInput(queryParams.partsNumber)
  const startDate = queryParams.dateRange?.[0] ? String(queryParams.dateRange[0]).substring(0, 7) : ''
  const endDate = queryParams.dateRange?.[1] ? String(queryParams.dateRange[1]).substring(0, 7) : ''

  exportPurchasePlan({
    userId: session.userId.toString(),
    orderNo: orderNos.length > 0 ? orderNos : undefined,
    partsNumber: partsNumbers.length > 0 ? partsNumbers : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    supplierOrderStatus: queryParams.supplierOrderStatus
  }).then((response: any) => {
    const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '采购计划导出.xlsx'
    link.click()
    window.URL.revokeObjectURL(url)
    message.success('导出成功')
  }).catch((error: any) => {
    console.error('导出失败:', error)
    message.error('导出失败')
  })
}

handleSearch()
</script>

<style scoped>
.purchase-plan-view {
  padding: 16px;
}
.summary-row {
  display: flex;
  gap: 32px;
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 4px;
  margin-bottom: 12px;
}
.summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.summary-label {
  color: #666;
  font-size: 14px;
}
.summary-value {
  font-weight: 600;
  font-size: 14px;
}
.summary-value.total { color: #1890ff; }
.summary-value.pending { color: #ff4d4f; }
.summary-value.confirmed { color: #52c41a; }
</style>