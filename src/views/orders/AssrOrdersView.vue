<template>
  <div class="assr-orders-view">
    <a-alert
      message="ASSR 紧急售后订单说明"
      description="ASSR 订单为紧急特批售后配件，系统内优先级最高，整行数据使用红色高亮醒目标识。"
      type="error"
      show-icon
      style="margin-bottom: 16px"
    />

    <a-layout style="background: #fff; padding: 16px; border-radius: 8px;">
      <!-- 左侧查询区域 -->
      <a-layout-sider width="300" style="background: #fafafa; padding: 16px; border-radius: 8px; margin-right: 16px;">
        <div class="query-section">
          <h3 style="margin-bottom: 16px; font-size: 16px; font-weight: 500;">查询条件</h3>
          <a-form :model="queryParams">
            <a-form-item label="订单号">
              <a-textarea 
                v-model:value="queryParams.orderNo" 
                placeholder="请输入订单号，支持批量输入（换行或逗号分隔）" 
                :rows="3"
                allow-clear 
              />
            </a-form-item>
            <a-form-item label="零件号">
              <a-textarea 
                v-model:value="queryParams.partsNumber" 
                placeholder="请输入零件号，支持批量输入（换行或逗号分隔）" 
                :rows="3"
                allow-clear 
              />
            </a-form-item>
            <a-form-item label="紧急程度">
              <a-select 
                v-model:value="queryParams.urgencyLevel" 
                placeholder="选择紧急程度" 
                style="width: 100%"
                allow-clear
              >
                <a-select-option value="critical">极紧急</a-select-option>
                <a-select-option value="high">紧急</a-select-option>
                <a-select-option value="medium">中等</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item>
              <a-space style="width: 100%">
                <a-button type="primary" @click="handleSearch" style="flex: 1;">查询</a-button>
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
            <a-button 
              type="primary" 
              :disabled="selectedRowKeys.length === 0"
              @click="handleCreateShipment"
            >
              创建发运信息
            </a-button>
            <a-button @click="handleExport">导出</a-button>
          </a-space>
        </div>

        <a-table
          :columns="columns"
          :data-source="dataSource"
          :loading="loading"
          :row-selection="rowSelection"
          :pagination="pagination"
          :row-key="record => record.order_id"
          @change="handleTableChange"
          :row-class-name="getRowClassName"
          :scroll="{ x: 1500 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'urgency_level'">
              <a-tag :color="getUrgencyColor(record.urgency_level)">
                {{ getUrgencyText(record.urgency_level) }}
              </a-tag>
            </template>
            <template v-if="column.key === 'supplier_order_status'">
              <a-tag :color="getStatusColor(record.supplier_order_status)">
                {{ getStatusText(record.supplier_order_status) }}
              </a-tag>
            </template>
            <template v-if="column.key === 'need_date'">
              <span style="color: #ff4d4f; font-weight: 500">
                {{ record.need_date }}
              </span>
            </template>
            <template v-if="column.key === 'action'">
              <a-space>
                <a-button 
                  v-if="record.supplier_order_status === 0" 
                  type="primary" 
                  size="small"
                  danger
                  @click="handleConfirmOrder(record)"
                >
                  紧急确认
                </a-button>
                <!-- <a-button 
                  v-if="record.supplier_order_status === 0" 
                  type="default" 
                  size="small"
                  @click="handleRejectOrder(record)"
                >
                  驳回
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
      </a-layout-content>
    </a-layout>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const session = useSessionStore()

const loading = ref(false)
const dataSource = ref<any[]>([])
const selectedRowKeys = ref<any[]>([])
const selectedRows = ref<any[]>([])

const queryParams = reactive({
  orderNo: '',
  partsNumber: '',
  urgencyLevel: undefined as string | undefined
})

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条`
})

const columns = [
  { title: '订单号', dataIndex: 'order_no', key: 'order_no', width: 150, fixed: 'left' },
  { title: '零件号', dataIndex: 'parts_number', key: 'parts_number', width: 150, fixed: 'left' },
  { title: '零件名称', dataIndex: 'parts_name', key: 'parts_name', width: 200 },
  { title: '订单数量', dataIndex: 'need_number', key: 'need_number', width: 100 },
  { title: '已发运数量', dataIndex: 'shipped_qty', key: 'shipped_qty', width: 100 },
  { title: '剩余数量', dataIndex: 'remaining_qty', key: 'remaining_qty', width: 100 },
  { title: '交期', dataIndex: 'need_date', key: 'need_date', width: 120 },
  { title: '紧急程度', dataIndex: 'urgency_level', key: 'urgency_level', width: 100 },
  { title: '送货工厂', dataIndex: 'ship_to_plant', key: 'ship_to_plant', width: 150 },
  { title: '状态', dataIndex: 'supplier_order_status', key: 'supplier_order_status', width: 100 },
  { title: '操作', key: 'action', width: 150, fixed: 'right' }
]

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: any[], rows: any[]) => {
    selectedRowKeys.value = keys
    selectedRows.value = rows
  }
}))

function getRowClassName(record: any) {
  return 'assr-order-row'
}

function getUrgencyColor(level: string) {
  const colorMap: Record<string, string> = {
    'critical': 'red',
    'high': 'orange',
    'medium': 'blue'
  }
  return colorMap[level] || 'default'
}

function getUrgencyText(level: string) {
  const textMap: Record<string, string> = {
    'critical': '极紧急',
    'high': '紧急',
    'medium': '中等'
  }
  return textMap[level] || level
}

function getStatusColor(status: number) {
  const colorMap: Record<number, string> = {
    0: 'orange',
    20: 'green',
    25: 'blue',
    30: 'cyan',
    40: 'gray',
    50: 'red'
  }
  return colorMap[status] || 'default'
}

function getStatusText(status: number) {
  const textMap: Record<number, string> = {
    0: '待确认',
    20: '已确认',
    25: '部分发运',
    30: '已发运',
    40: '已结案',
    50: '已驳回'
  }
  return textMap[status] || '待确认'
}

function parseBatchInput(input: string): string[] {
  if (!input || !input.trim()) return []
  return input
    .split(/[\n,，]/)
    .map(item => item.trim())
    .filter(item => item.length > 0)
}

async function handleSearch() {
  loading.value = true
  try {
    const orderNos = parseBatchInput(queryParams.orderNo)
    const partsNumbers = parseBatchInput(queryParams.partsNumber)
    
    message.info('ASSR 紧急售后订单查询功能待实现')
    
    dataSource.value = []
    pagination.total = 0
  } catch (error) {
    message.error('查询失败')
  } finally {
    loading.value = false
  }
}

function handleReset() {
  queryParams.orderNo = ''
  queryParams.partsNumber = ''
  queryParams.urgencyLevel = undefined
  pagination.current = 1
  handleSearch()
}

function handleTableChange(pag: any) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  handleSearch()
}

function handleCreateShipment() {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请至少选择一条待发货订单')
    return
  }

  const validStatuses = [20,21, 25]
  const hasInvalidStatus = selectedRows.value.some(row => !validStatuses.includes(row.supplier_order_status))
  if (hasInvalidStatus) {
    message.error('所选订单包含不可发货状态，请重新检查！')
    return
  }

  const firstPlant = selectedRows.value[0].ship_to_plant
  const hasDifferentPlant = selectedRows.value.some(row => row.ship_to_plant !== firstPlant)
  
  if (hasDifferentPlant) {
    message.error('所选订单的送货工厂不同，无法合并生成同一张发货单，请重新选择！')
    return
  }

  const selectedIds = selectedRowKeys.value.join(',')
  router.push({
    path: '/shipment/create',
    query: { selectedIds }
  })
}

function handleConfirmOrder(record: any) {
  message.info('紧急确认功能待实现')
}

function handleRejectOrder(record: any) {
  message.info('驳回订单功能待实现')
}

function handleViewDetail(record: any) {
  router.push({
    path: `/orders/${record.order_id}`
  })
}

function handleExport() {
  message.info('导出功能待实现')
}

handleSearch()
</script>

<style scoped>
.assr-orders-view {
  padding: 16px;
}

:deep(.assr-order-row) {
  background-color: #fff1f0;
  border-left: 3px solid #ff4d4f;
}

:deep(.assr-order-row:hover) {
  background-color: #ffccc7;
}
</style>