<template>
  <div class="srm-page">
    <div class="srm-card-title">待发货订单列表</div>

    <a-layout style="background: #fff; padding: 16px; border-radius: 8px;">
      <!-- 左侧查询区域 -->
      <a-layout-sider width="350" style="background: #fafafa; padding: 16px; border-radius: 8px; margin-right: 16px;">
        <a-card size="small">
          <a-form layout="vertical" :model="queryParams" @finish="handleSearch">
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
            <a-form-item label="日期范围">
              <a-range-picker v-model:value="dateRange" value-format="YYYY-MM-DD" style="width: 100%" />
            </a-form-item>
            <a-space style="margin-top: 16px; width: 100%; justify-content: flex-end;">
              <a-button type="primary" html-type="submit">查询</a-button>
              <a-button @click="handleReset">重置</a-button>
            </a-space>
          </a-form>
        </a-card>
      </a-layout-sider>

      <!-- 右侧列表区域 -->
      <a-layout-content style="flex: 1;">
        <a-alert v-if="forbidden" type="warning" :message="forbidden" show-icon style="margin-bottom: 16px" />
        <a-alert v-else-if="error" type="error" :message="error" show-icon style="margin-bottom: 16px" />

        <!-- 操作按钮区 -->
        <div style="margin-bottom: 16px">
          <a-button type="primary" :disabled="selectedRowKeys.length === 0" @click="handleCreateShipment">
            新建发运信息
          </a-button>
          <span style="margin-left: 12px; color: #666">已选择 {{ selectedRowKeys.length }} 条</span>
        </div>

        <!-- 订单列表 -->
        <a-table
          :columns="columns"
          :data-source="rows"
          :loading="loading"
          :row-selection="rowSelection"
          row-key="order_detail_id"
          :pagination="pagination"
          @change="handleTableChange"
          size="middle"
        >
          <template #bodyCell="{ column, record, text }">
            <template v-if="column.key === 'order_no'">
              <a @click="viewOrderDetails(record.order_no)">{{ text }}</a>
            </template>
            <template v-else-if="column.key === 'need_date'">
              {{ formatDate(text) }}
            </template>
            <template v-else-if="column.key === 'ship_to_plant'">
              {{ text || '-' }}
            </template>
            <template v-else-if="column.key === 'ship_to_address'">
              {{ text || '-' }}
            </template>
          </template>
        </a-table>
      </a-layout-content>
    </a-layout>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useSessionStore } from '@/stores/session'
import { listPendingShipmentOrderDetails } from '@/api/srm'
import dayjs, { Dayjs } from 'dayjs'

const router = useRouter()
const session = useSessionStore()

const queryParams = reactive({
  orderNo: '',
  partsNumber: '',
  startDate: '',
  endDate: ''
})

const dateRange = ref<Dayjs[]>([])

const loading = ref(false)
const forbidden = ref('')
const error = ref('')
const rows = ref<any[]>([])
const total = ref(0)

const selectedRowKeys = ref<number[]>([])
const selectedRows = ref<any[]>([])

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条`
})

const columns = [
  { title: '订单号', dataIndex: 'order_no', key: 'order_no', width: 150 },
  { title: '零件号', dataIndex: 'parts_no', key: 'parts_no', width: 120 },
  { title: '零件名称', dataIndex: 'parts_name', key: 'parts_name', width: 200 },
  { title: '订单数量', dataIndex: 'order_qty', key: 'order_qty', width: 100, align: 'right' },
  { title: '确认数量', dataIndex: 'confirmed_qty', key: 'confirmed_qty', width: 100, align: 'right' },
  { title: '已交付数量', dataIndex: 'shipped_qty', key: 'shipped_qty', width: 100, align: 'right' },
  { title: '在途数量', dataIndex: 'remaining_qty', key: 'remaining_qty', width: 120, align: 'right' },
  { title: '要求到货日期', dataIndex: 'need_date', key: 'need_date', width: 120 },
  // { title: '送货工厂', dataIndex: 'ship_to_plant', key: 'ship_to_plant', width: 120 },
  { title: '送货地址', dataIndex: 'storage_name', key: 'storage_name', width: 200 }
]

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: number[], rows: any[]) => {
    selectedRowKeys.value = keys
    selectedRows.value = rows
  }
}))

// 批量输入解析函数
function parseBatchInput(input: string): string[] {
  if (!input) return []
  // 支持换行符、逗号、分号分隔
  return input
    .split(/[\n,;\s]+/)
    .map(item => item.trim())
    .filter(item => item.length > 0)
}

async function loadData() {
  loading.value = true
  forbidden.value = ''
  error.value = ''
  try {
    const res = await listPendingShipmentOrderDetails(
      session.userId,
      parseBatchInput(queryParams.orderNo),
      parseBatchInput(queryParams.partsNumber),
      queryParams.startDate,
      queryParams.endDate,
      pagination.pageSize,
      (pagination.current - 1) * pagination.pageSize
    )
    rows.value = res.items || []
    total.value = res.total || 0
    pagination.total = total.value
  } catch (e: any) {
    if (e.response?.status === 403) {
      forbidden.value = e.response.data?.message || '权限不足'
    } else {
      error.value = e.response?.data?.message || e.message || '加载失败'
    }
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  if (dateRange.value && dateRange.value.length === 2) {
    queryParams.startDate = dateRange.value[0].format('YYYY-MM-DD')
    queryParams.endDate = dateRange.value[1].format('YYYY-MM-DD')
  } else {
    queryParams.startDate = ''
    queryParams.endDate = ''
  }
  pagination.current = 1
  loadData()
}

function handleReset() {
  queryParams.orderNo = ''
  queryParams.partsNumber = ''
  dateRange.value = []
  queryParams.startDate = ''
  queryParams.endDate = ''
  pagination.current = 1
  loadData()
}

function handleTableChange(pag: any) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadData()
}

function viewOrderDetails(orderNo: string) {
  router.push(`/orders?orderNo=${orderNo}`)
}

function handleCreateShipment() {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请至少选择一条待发货订单')
    return
  }

  // 状态合规校验：所选记录的订单状态必须全部属于 ['已确认', '部分发运'] 集合
  const validStatuses = [20, 25] // 已确认, 部分发运
  const hasInvalidStatus = selectedRows.value.some(row => !validStatuses.includes(row.supplier_order_status))
  if (hasInvalidStatus) {
    message.error('所选订单包含不可发货状态，请重新检查！')
    return
  }

  // 同源/同厂校验：所选记录的送货工厂必须相同
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

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return dayjs(dateStr).format('YYYY-MM-DD')
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.srm-page {
  background: #f0f2f5;
  min-height: 100vh;
}

.srm-card-title {
  font-size: 20px;
  font-weight: 500;
  color: #1f1f1f;
  margin-bottom: 16px;
}
</style>
