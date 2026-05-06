<template>
  <div class="srm-page">
    <div class="srm-card-title">新订单管理</div>

    <a-layout style="background: #fff; padding: 16px; border-radius: 8px;">
      <!-- 左侧查询区域 -->
      <a-layout-sider width="300" style="background: #fafafa; padding: 16px; border-radius: 8px; margin-right: 16px;">
        <div class="query-section">
          <h3 style="margin-bottom: 16px; font-size: 16px; font-weight: 500;">查询条件</h3>
          <a-form :model="currentQueryParams" layout="vertical" @finish="handleSearch">
            <a-form-item label="订单号">
              <a-textarea 
                v-model:value="currentQueryParams.orderNo" 
                placeholder="请输入订单号，支持批量输入（换行或逗号分隔）" 
                :rows="2"
                allow-clear 
              />
            </a-form-item>
            <a-form-item v-if="activeTab === 'details'" label="零件号">
              <a-textarea 
                v-model:value="detailQueryParams.partsNumber" 
                placeholder="请输入零件号，支持批量输入（换行或逗号分隔）" 
                :rows="2"
                allow-clear 
              />
            </a-form-item>
            <a-form-item label="状态">
              <a-select 
                v-model:value="currentQueryParams.supplierOrderStatus" 
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
              </a-select>
            </a-form-item>
            <a-form-item label="日期范围">
              <a-range-picker 
                v-model:value="currentDateRange" 
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item>
              <a-space style="width: 100%; justify-content: space-between;">
                <a-button type="primary" html-type="submit">查询</a-button>
                <a-button @click="handleReset">重置</a-button>
              </a-space>
            </a-form-item>
          </a-form>
        </div>
      </a-layout-sider>

      <!-- 右侧列表区域 -->
      <a-layout-content style="flex: 1;">
        <a-card size="small">
          <a-tabs v-model:activeKey="activeTab" @change="handleTabChange">
            <a-tab-pane key="headers" tab="订单列表">
              <a-alert v-if="headerForbidden" type="warning" :message="headerForbidden" show-icon style="margin-bottom: 16px" />
              <a-alert v-else-if="headerError" type="error" :message="headerError" show-icon style="margin-bottom: 16px" />

              <a-table
                :columns="headerColumns"
                :data-source="headerRows"
                :loading="headerLoading"
                row-key="id"
                :pagination="headerPagination"
                @change="handleHeaderTableChange"
                size="middle"
              >
                <template #bodyCell="{ column, record, text }">
                  <template v-if="column.key === 'order_no'">
                    <a @click="viewOrderDetails(record.order_no)">{{ text }}</a>
                  </template>
                  <template v-else-if="column.key === 'supplier_order_status'">
                    <a-tag :color="text === 20 ? 'green' : 'orange'">
                      {{ text === 20 ? '已确认' : '待确认' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'action'">
                    <a-space>
                      <a-button type="link" size="small" @click="viewOrderDetail(record)">详情</a-button>
                      <template v-if="record.supplier_order_status !== 20">
                        <a-button type="link" size="small" @click="handleHeaderConfirm(record)">确认</a-button>
                        <a-button type="link" size="small" danger @click="handleHeaderReject(record)">驳回</a-button>
                      </template>
                    </a-space>
                  </template>
                </template>
              </a-table>
            </a-tab-pane>

            <a-tab-pane key="details" tab="订单详情">
              <a-alert v-if="detailForbidden" type="warning" :message="detailForbidden" show-icon style="margin-bottom: 16px" />
              <a-alert v-else-if="detailError" type="error" :message="detailError" show-icon style="margin-bottom: 16px" />

              <a-table
                :columns="detailColumns"
                :data-source="detailRows"
                :loading="detailLoading"
                row-key="id"
                :pagination="detailPagination"
                @change="handleDetailTableChange"
                size="middle"
              >
                <template #bodyCell="{ column, record, text }">
                  <template v-if="column.key === 'supplier_order_status'">
                    <a-tag :color="text === 20 ? 'green' : 'orange'">
                      {{ text === 20 ? '已确认' : '待确认' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'action'">
                    <a-space>
                      <!-- <template v-if="record.supplier_order_status !== 20">
                        <a-button type="link" size="small" @click="openDetailEdit(record)">修改</a-button>
                      </template> -->
                    </a-space>
                  </template>
                </template>
              </a-table>
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </a-layout-content>
    </a-layout>

    <!-- 快捷操作弹窗 for headers -->
    <a-modal v-model:open="headerActionModal.open" :title="headerActionModal.title" @ok="handleHeaderActionSubmit" :confirm-loading="headerActionModal.loading">
      <p v-if="headerActionModal.type === 'confirm'">确认订单号为 <b>{{ headerActionModal.record?.order_no }}</b> 的订单吗？</p>
      <div v-if="headerActionModal.type === 'confirm'" style="margin-top: 16px">
        <a-checkbox v-model:checked="headerActionModal.createAsn">确认后立即创建发货通知 (ASN)</a-checkbox>
      </div>
      <p v-else>请输入驳回订单 <b>{{ headerActionModal.record?.order_no }}</b> 的原因：</p>
      <a-textarea v-if="headerActionModal.type === 'reject'" v-model:value="headerActionModal.reason" :rows="3" placeholder="必填" />
    </a-modal>

    <!-- 快捷操作弹窗 for details -->
    <a-modal v-model:open="detailActionModal.open" :title="detailActionModal.title" @ok="handleDetailActionSubmit" :confirm-loading="detailActionModal.loading">
      <a-form layout="vertical">
        <a-form-item label="零件">
          <a-input :value="detailActionModal.record?.parts_name" disabled />
        </a-form-item>
        <a-form-item label="需求数量">
          <a-input-number v-model:value="detailActionModal.need_number" style="width: 100%" :min="0" />
        </a-form-item>
        <a-form-item label="要求到货日期">
          <a-date-picker v-model:value="detailActionModal.need_date" value-format="YYYY-MM-DD" style="width: 100%" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { listNewOrders, listOrderHeaders, confirmOrder, rejectOrder, updateOrderDetail, type JsonMap, type OrderQueryParams } from '@/api/srm'
import { message } from 'ant-design-vue'
import type { ColumnsType, TablePaginationConfig } from 'ant-design-vue/es/table'

const router = useRouter()
const session = useSessionStore()

// Active tab
const activeTab = ref('headers')

// Header tab variables
const headerLoading = ref(false)
const headerRows = ref<JsonMap[]>([])
const headerTotal = ref(0)
const headerError = ref('')
const headerForbidden = ref('')
const headerDateRange = ref<[string, string] | null>(null)

const headerQueryParams = reactive({
  orderNo: '',
  supplierOrderStatus: undefined as number[] | undefined,
  page: 1,
  pageSize: 10,
})

const headerPagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
})

const headerColumns: ColumnsType<JsonMap> = [
  { title: '订单号', dataIndex: 'order_no', key: 'order_no' },
  { title: '供应商', dataIndex: 'supplier_name', key: 'supplier_name' },
  { title: '订单时间', dataIndex: 'order_time', key: 'order_time', width: 160 },
  { title: '状态', dataIndex: 'supplier_order_status', key: 'supplier_order_status', width: 90 },
  { title: '操作', key: 'action', width: 120 },
]

// Detail tab variables
const detailLoading = ref(false)
const detailRows = ref<JsonMap[]>([])
const detailTotal = ref(0)
const detailError = ref('')
const detailForbidden = ref('')
const detailDateRange = ref<[string, string] | null>(null)

const detailQueryParams = reactive({
  orderNo: '',
  partsNumber: '',
  supplierOrderStatus: undefined as number[] | undefined,
  page: 1,
  pageSize: 10,
})

const detailPagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
})

const detailColumns: ColumnsType<JsonMap> = [
  { title: '订单号', dataIndex: 'order_no', key: 'order_no' },
  { title: '零件号', dataIndex: 'partsNo', key: 'partsNo' },
  { title: '零件名称', dataIndex: 'parts_name', key: 'parts_name', ellipsis: true },
  { title: '需求数量', dataIndex: 'need_number', key: 'need_number', align: 'right' },
  { title: '要求到货日期', dataIndex: 'need_date', key: 'need_date', width: 160 },
  { title: '状态', dataIndex: 'supplier_order_status', key: 'supplier_order_status', width: 90 },
  { title: '操作', key: 'action', width: 120 },
]

// 计算属性：当前查询参数
const currentQueryParams = computed(() => {
  return activeTab.value === 'headers' ? headerQueryParams : detailQueryParams
})

// 计算属性：当前日期范围
const currentDateRange = computed({
  get: () => {
    return activeTab.value === 'headers' ? headerDateRange.value : detailDateRange.value
  },
  set: (value) => {
    if (activeTab.value === 'headers') {
      headerDateRange.value = value
    } else {
      detailDateRange.value = value
    }
  }
})

// Action modals
const headerActionModal = reactive({
  open: false,
  title: '',
  type: '' as 'confirm' | 'reject',
  record: null as JsonMap | null,
  reason: '',
  createAsn: false,
  loading: false
})

const detailActionModal = reactive({
  open: false,
  title: '修改订单详情',
  record: null as JsonMap | null,
  need_number: 0,
  need_date: '',
  loading: false
})

// 批量输入解析函数
function parseBatchInput(input: string): string[] {
  if (!input) return []
  // 支持换行符、逗号、分号分隔
  return input
    .split(/[\n,;\s]+/)
    .map(item => item.trim())
    .filter(item => item.length > 0)
}

// Load data functions
async function loadHeaderData() {
  headerLoading.value = true
  headerError.value = ''
  headerForbidden.value = ''

  const params = {
    userId: session.userId,
    orderNo: parseBatchInput(headerQueryParams.orderNo),
    supplierOrderStatus: headerQueryParams.supplierOrderStatus,
    startDate: headerDateRange.value?.[0],
    endDate: headerDateRange.value?.[1],
    limit: headerQueryParams.pageSize,
    offset: (headerQueryParams.page - 1) * headerQueryParams.pageSize,
  }

  try {
    const res = await listOrderHeaders(params)
    headerRows.value = res.items
    headerTotal.value = res.total
    headerPagination.total = res.total
    headerPagination.current = headerQueryParams.page
    headerPagination.pageSize = headerQueryParams.pageSize
  } catch (e: unknown) {
    const err = e as { response?: { status?: number; data?: { message?: string } }; friendlyMessage?: string }
    if (err.response?.status === 403) {
      headerForbidden.value = err.response?.data?.message || '无权限查看订单'
    } else {
      headerError.value = err.friendlyMessage || '加载失败'
    }
  } finally {
    headerLoading.value = false
  }
}

async function loadDetailData() {
  detailLoading.value = true
  detailError.value = ''
  detailForbidden.value = ''

  const params: OrderQueryParams = {
    userId: session.userId,
    orderNo: parseBatchInput(detailQueryParams.orderNo),
    partsNumber: parseBatchInput(detailQueryParams.partsNumber),
    supplierOrderStatus: detailQueryParams.supplierOrderStatus,
    startDate: detailDateRange.value?.[0],
    endDate: detailDateRange.value?.[1],
    limit: detailQueryParams.pageSize,
    offset: (detailQueryParams.page - 1) * detailQueryParams.pageSize,
  }

  try {
    const res = await listNewOrders(params)
    detailRows.value = res.items
    detailTotal.value = res.total
    detailPagination.total = res.total
    detailPagination.current = detailQueryParams.page
    detailPagination.pageSize = detailQueryParams.pageSize
  } catch (e: unknown) {
    const err = e as { response?: { status?: number; data?: { message?: string } }; friendlyMessage?: string }
    if (err.response?.status === 403) {
      detailForbidden.value = err.response?.data?.message || '无权限查看订单'
    } else {
      detailError.value = err.friendlyMessage || '加载失败'
    }
  } finally {
    detailLoading.value = false
  }
}

// Event handlers
function handleTabChange(key: string) {
  if (key === 'headers') {
    loadHeaderData()
  } else if (key === 'details') {
    loadDetailData()
  }
}

function viewOrderDetails(orderNo: string) {
  activeTab.value = 'details'
  detailQueryParams.orderNo = orderNo
  detailQueryParams.partsNumber = ''
  detailQueryParams.supplierOrderStatus = undefined
  detailQueryParams.page = 1
  detailDateRange.value = null
  loadDetailData()
}

function viewOrderDetail(record: JsonMap) {
  router.push({ name: 'order-detail', params: { id: String(record.id) } })
}

function handleSearch() {
  if (activeTab.value === 'headers') {
    headerQueryParams.page = 1
    loadHeaderData()
  } else if (activeTab.value === 'details') {
    detailQueryParams.page = 1
    loadDetailData()
  }
}

function handleReset() {
  if (activeTab.value === 'headers') {
    headerQueryParams.orderNo = ''
    headerQueryParams.supplierOrderStatus = undefined
    headerQueryParams.page = 1
    headerDateRange.value = null
    loadHeaderData()
  } else if (activeTab.value === 'details') {
    detailQueryParams.orderNo = ''
    detailQueryParams.partsNumber = ''
    detailQueryParams.supplierOrderStatus = undefined
    detailQueryParams.page = 1
    detailDateRange.value = null
    loadDetailData()
  }
}

function handleHeaderTableChange(pag: TablePaginationConfig) {
  headerQueryParams.page = pag.current || 1
  headerQueryParams.pageSize = pag.pageSize || 10
  loadHeaderData()
}

function handleDetailTableChange(pag: TablePaginationConfig) {
  detailQueryParams.page = pag.current || 1
  detailQueryParams.pageSize = pag.pageSize || 10
  loadDetailData()
}

// Action handlers for headers
function handleHeaderConfirm(record: JsonMap) {
  headerActionModal.type = 'confirm'
  headerActionModal.title = '确认订单'
  headerActionModal.record = record
  headerActionModal.reason = ''
  headerActionModal.createAsn = false
  headerActionModal.open = true
}

function handleHeaderReject(record: JsonMap) {
  headerActionModal.type = 'reject'
  headerActionModal.title = '驳回订单'
  headerActionModal.record = record
  headerActionModal.reason = ''
  headerActionModal.open = true
}

async function handleHeaderActionSubmit() {
  if (!headerActionModal.record) return

  headerActionModal.loading = true
  try {
    const orderId = headerActionModal.record.id as number
    if (headerActionModal.type === 'confirm') {
      await confirmOrder(orderId, session.userId, headerActionModal.reason)
      message.success('订单已确认')
    } else if (headerActionModal.type === 'reject') {
      await rejectOrder(orderId, session.userId, headerActionModal.reason)
      message.success('订单已驳回')
    }
    headerActionModal.open = false
    loadHeaderData()
  } catch (e: unknown) {
    const err = e as { friendlyMessage?: string }
    message.error(err.friendlyMessage || '操作失败')
  } finally {
    headerActionModal.loading = false
  }
}

// Action handlers for details
function openDetailEdit(record: JsonMap) {
  detailActionModal.record = record
  detailActionModal.need_number = record.need_number as number || 0
  detailActionModal.need_date = record.need_date as string || ''
  detailActionModal.open = true
}

async function handleDetailActionSubmit() {
  if (!detailActionModal.record) return

  detailActionModal.loading = true
  try {
    await updateOrderDetail(String(detailActionModal.record.id), session.userId, {
      need_date: detailActionModal.need_date,
      need_number: detailActionModal.need_number,
    })
    message.success('修改成功')
    detailActionModal.open = false
    loadDetailData()
  } catch (e: unknown) {
    const err = e as { friendlyMessage?: string }
    message.error(err.friendlyMessage || '修改失败')
  } finally {
    detailActionModal.loading = false
  }
}

// Initialize
onMounted(() => {
  loadHeaderData()
})
</script>