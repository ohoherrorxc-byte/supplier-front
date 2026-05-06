<template>
  <div class="standard-po-view">
    <a-card size="small" style="margin-bottom: 16px">
      <a-form layout="inline" :model="queryParams">
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
        <a-form-item label="状态">
          <a-select 
              v-model:value="queryParams.supplierOrderStatus" 
              placeholder="选择状态" 
              style="width: 100%" 
              mode="multiple"
              allow-clear
            >
              <a-select-option :value="0">待确认</a-select-option>
              <a-select-option :value="20">已确认</a-select-option>
              <a-select-option :value="25">部分发运</a-select-option>
              <a-select-option :value="30">已发运</a-select-option>
              <a-select-option :value="40">已结案</a-select-option>
              <a-select-option :value="50">已驳回</a-select-option>
            </a-select>
        </a-form-item>
        <a-form-item label="下单日期">
          <a-range-picker 
            v-model:value="queryParams.dateRange" 
            format="YYYY-MM-DD"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">查询</a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card size="small">
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

      <a-tabs v-model:activeKey="activeTab" @change="handleTabChange">
        <a-tab-pane key="order-list" tab="订单列表（按订单号）">
          <a-table
            :columns="orderListColumns"
            :data-source="orderListDataSource"
            :loading="loading"
            :row-selection="rowSelection"
            :pagination="pagination"
            :row-key="record => record.order_id"
            @change="handleTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'supplier_order_status'">
                <a-tag :color="getStatusColor(record.supplier_order_status)">
                  {{ getStatusText(record.supplier_order_status) }}
                </a-tag>
              </template>
              <template v-if="column.key === 'action'">
                <a-space>
                  <a-button 
                    v-if="record.supplier_order_status === 0" 
                    type="primary" 
                    size="small"
                    @click="handleConfirmOrder(record)"
                  >
                    确认
                  </a-button>
                  <!-- <a-button 
                    v-if="record.supplier_order_status === 0" 
                    type="default" 
                    size="small"
                    danger
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
        </a-tab-pane>

        <a-tab-pane key="order-detail-list" tab="订单详情列表（按订单详情）">
          <a-table
            :columns="orderDetailListColumns"
            :data-source="orderDetailListDataSource"
            :loading="loading"
            :row-selection="rowSelection"
            :pagination="pagination"
            :row-key="record => record.order_detail_id"
            @change="handleTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'supplier_order_status'">
                <a-tag :color="getStatusColor(record.supplier_order_status)">
                  {{ getStatusText(record.supplier_order_status) }}
                </a-tag>
              </template>
              <template v-if="column.key === 'action'">
                <a-space>
                  <a-button 
                    v-if="record.supplier_order_status === 0" 
                    type="primary" 
                    size="small"
                    @click="handleConfirmOrder(record)"
                  >
                    确认
                  </a-button>
                  <a-button 
                    v-if="record.supplier_order_status === 0" 
                    type="default" 
                    size="small"
                    danger
                    @click="handleRejectOrder(record)"
                  >
                    驳回
                  </a-button>
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
    </a-card>
  </div>

  <!-- 驳回订单模态框 -->
  <a-modal
    v-model:visible="rejectModalVisible"
    title="驳回订单"
    @ok="handleRejectSubmit"
  >
    <div style="margin-bottom: 16px;">
      <p>订单号：{{ currentOrder?.order_no }}</p>
    </div>
    <a-form-item label="驳回原因">
      <a-textarea
        v-model:value="rejectReason"
        placeholder="请输入驳回原因"
        :rows="4"
        required
      />
    </a-form-item>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { listNewOrders, confirmOrder, rejectOrder } from '@/api/srm'

const router = useRouter()
const session = useSessionStore()

const loading = ref(false)
const dataSource = ref<any[]>([])
const orderListDataSource = ref<any[]>([])
const orderDetailListDataSource = ref<any[]>([])
const selectedRowKeys = ref<any[]>([])
const selectedRows = ref<any[]>([])
const activeTab = ref('order-list')

// 驳回订单相关
const rejectModalVisible = ref(false)
const rejectReason = ref('')
const currentOrder = ref<any>(null)

const queryParams = reactive({
  orderNo: '',
  partsNumber: '',
  supplierOrderStatus: [] as number[],
  dateRange: null as any
})

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条`
})

const orderListColumns = [
  { title: '订单号', dataIndex: 'order_no', key: 'order_no', width: 150 },
  { title: '订单状态', dataIndex: 'supplier_order_status', key: 'supplier_order_status', width: 100 },
  { title: '下单日期', dataIndex: 'order_date', key: 'order_date', width: 120 },
  { title: '送货工厂', dataIndex: 'ship_to_plant', key: 'ship_to_plant', width: 150 },
  { title: '操作', key: 'action', width: 150, fixed: 'right' }
]

const orderDetailListColumns = [
  { title: '订单号', dataIndex: 'order_no', key: 'order_no', width: 150 },
  { title: '订单行号', dataIndex: 'order_line_no', key: 'order_line_no', width: 100 },
  { title: '零件号', dataIndex: 'parts_number', key: 'parts_number', width: 150 },
  { title: '零件名称', dataIndex: 'parts_name', key: 'parts_name', width: 200 },
  { title: '订单数量', dataIndex: 'need_number', key: 'need_number', width: 100 },
  { title: '已发运数量', dataIndex: 'shipped_qty', key: 'shipped_qty', width: 100 },
  { title: '剩余数量', dataIndex: 'remaining_qty', key: 'remaining_qty', width: 100 },
  { title: '交期', dataIndex: 'need_date', key: 'need_date', width: 120 },
  { title: '订单状态', dataIndex: 'supplier_order_status', key: 'supplier_order_status', width: 100 },
  { title: '操作', key: 'action', width: 150, fixed: 'right' }
]

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: any[], rows: any[]) => {
    selectedRowKeys.value = keys
    selectedRows.value = rows
  }
}))

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

function handleTabChange(key: string) {
  activeTab.value = key
  handleSearch()
}

async function handleSearch() {
  loading.value = true
  try {
    const orderNos = parseBatchInput(queryParams.orderNo)
    const partsNumbers = parseBatchInput(queryParams.partsNumber)
    
    const startDate = queryParams.dateRange?.[0] || ''
    const endDate = queryParams.dateRange?.[1] || ''
    
    const result = await listNewOrders({
      userId: session.userId.toString(),
      orderNo: orderNos.length > 0 ? orderNos : undefined,
      supplierOrderStatus: queryParams.supplierOrderStatus.length > 0 ? queryParams.supplierOrderStatus : undefined,
      startDate,
      endDate,
      limit: pagination.pageSize,
      offset: (pagination.current - 1) * pagination.pageSize
    })
    
    dataSource.value = result.items || []
    pagination.total = result.total || 0
    
    // 处理数据，分离订单列表和订单详情列表
    processDataSource()
  } catch (error) {
    message.error('查询失败')
  } finally {
    loading.value = false
  }
}

function processDataSource() {
  // 订单列表：按订单号分组，取每个订单的第一条记录作为订单信息
  const orderMap = new Map()
  dataSource.value.forEach(item => {
    if (!orderMap.has(item.order_id)) {
      orderMap.set(item.order_id, item)
    }
  })
  orderListDataSource.value = Array.from(orderMap.values())
  
  // 订单详情列表：直接使用所有数据
  orderDetailListDataSource.value = dataSource.value
}

function handleReset() {
  queryParams.orderNo = ''
  queryParams.partsNumber = ''
  queryParams.supplierOrderStatus = []
  queryParams.dateRange = null
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

  const validStatuses = [20, 25]
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
  Modal.confirm({
    title: '确认订单',
    content: `确定要确认订单 ${record.order_no} 吗？`,
    onOk: async () => {
      try {
        await confirmOrder(record.order_id, session.userId)
        message.success('订单确认成功')
        handleSearch() // 刷新列表
      } catch (error) {
        message.error('订单确认失败')
      }
    }
  })
}

function handleRejectOrder(record: any) {
  currentOrder.value = record
  rejectReason.value = ''
  rejectModalVisible.value = true
}

function handleRejectSubmit() {
  if (!rejectReason.value.trim()) {
    message.warning('请输入驳回原因')
    return
  }
  
  if (!currentOrder.value) return
  
  rejectModalVisible.value = false
  
  rejectOrder(currentOrder.value.order_id, session.userId, rejectReason.value)
    .then(() => {
      message.success('订单驳回成功')
      handleSearch() // 刷新列表
    })
    .catch(() => {
      message.error('订单驳回失败')
    })
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
.standard-po-view {
  padding: 16px;
}
</style>