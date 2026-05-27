<template>
  <div class="srm-page">
    <div class="srm-card-title">订单管理</div>

    <a-layout style="background: #fff; padding: 16px; border-radius: 8px;">
      <!-- 左侧查询区域 -->
      <a-layout-sider width="300" style="background: #fafafa; padding: 16px; border-radius: 8px; margin-right: 16px;">
        <div class="query-section">
          <h3 style="margin-bottom: 16px; font-size: 16px; font-weight: 500;">查询条件</h3>
          <a-form :model="queryParams" layout="vertical">
            <a-form-item label="订单号">
              <a-textarea 
                v-model:value="queryParams.orderNo" 
                placeholder="请输入订单号" 
                :rows="2"
                allow-clear 
              />
            </a-form-item>
            <a-form-item label="零件号">
              <a-textarea 
                v-model:value="queryParams.partsNumber" 
                placeholder="请输入零件号" 
                :rows="2"
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
                 <a-select-option :value="21">部分确认</a-select-option>
                <a-select-option :value="25">部分发运</a-select-option>
                <a-select-option :value="30">已发运</a-select-option>
                <a-select-option :value="40">已结案</a-select-option>
                 <!-- <a-select-option :value="90">已驳回</a-select-option> -->
              </a-select>
            </a-form-item>
            <a-form-item label="交付状态">
              <a-select
                v-model:value="queryParams.deliveryStatus"
                placeholder="选择交付状态"
                style="width: 100%"
                mode="multiple"
                allow-clear
              >
                <a-select-option value="未交付">未交付</a-select-option>
                <a-select-option value="部分交付">部分交付</a-select-option>
                <a-select-option value="已交付">已交付</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="日期范围">
              <a-range-picker 
                v-model:value="queryParams.dateRange" 
                format="YYYY-MM-DD"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item>
              <a-space style="width: 100%; justify-content: space-between;">
                <a-button type="primary"  @click="handleQuery">查询</a-button>
                <a-button  @click="handleReset">重置</a-button>
              </a-space>
            </a-form-item>
          </a-form>
        </div>
      </a-layout-sider>

      <!-- 右侧列表区域 -->
      <a-layout-content style="flex: 1;">
        <a-card size="small">
          <div style="margin-bottom: 16px">
            <a-space>
              <a-button
                v-if="session.isSupplierClient"
                type="primary"
                :disabled="selectedRowKeys.length === 0"
                @click="handleCreateShipment"
              >
                创建发运信息
              </a-button>
              <a-button @click="handleExport">导出</a-button>
            </a-space>
          </div>

          <!-- 汇总统计 -->
          <a-row :gutter="16" style="margin-bottom: 16px; padding: 12px; background: #fafafa; border-radius: 4px;">
            <!-- <a-col :span="4">
              <div style="text-align: center;">
                <div style="color: #999; font-size: 12px;">订单总数</div>
                <div style="font-size: 20px; font-weight: 500; color: #333;">{{ summaryStats.order_count || 0 }}</div>
              </div>
            </a-col> -->
            <a-col :span="4">
              <div style="text-align: center;">
                <div style="color: #999; font-size: 12px;">订单需求总数</div>
                <div style="font-size: 20px; font-weight: 500; color: #333;">{{ summaryStats.total_need_qty || 0 }}</div>
              </div>
            </a-col>
            <a-col :span="4">
              <div style="text-align: center;">
                <div style="color: #999; font-size: 12px;">待确认需求数量</div>
                <div style="font-size: 20px; font-weight: 500; color: #faad14;">{{ summaryStats.pending_confirm_qty || 0 }}</div>
              </div>
            </a-col>
            <a-col :span="4">
              <div style="text-align: center;">
                <div style="color: #999; font-size: 12px;">已交付数量</div>
                <div style="font-size: 20px; font-weight: 500; color: #52c41a;">{{ summaryStats.total_shipped_qty || 0 }}</div>
              </div>
            </a-col>
            <a-col :span="4">
              <div style="text-align: center;">
                <div style="color: #999; font-size: 12px;">在途数量</div>
                <div style="font-size: 20px; font-weight: 500; color: #faad14;">{{ summaryStats.pending_ship_qty || 0 }}</div>
              </div>
            </a-col>
            <a-col :span="4">
              <div style="text-align: center;">
                <div style="color: #999; font-size: 12px;">未交付数量</div>
                <div style="font-size: 20px; font-weight: 500; color: #1890ff;">{{ summaryStats.remaining_qty || 0 }}</div>
              </div>
            </a-col>
          </a-row>

          <a-tabs v-model:activeKey="activeTab" @change="handleTabChange">
            <a-tab-pane key="order-list" tab="订单列表（按订单号）">
              <a-table
                :columns="orderListColumns"
                :data-source="orderListDataSource"
                :loading="loading"
                :row-selection="orderListRowSelection"
                :pagination="pagination"
                row-key="id"
                @change="handleTableChange"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'supplier_order_status'">
                    <a-tag :color="getStatusColor(record)">
                      {{ getStatusText(record) }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'delivery_status'">
                    <a-tag :color="getDeliveryStatusColor(record.delivery_status)">
                      {{ getDeliveryStatusText(record.delivery_status) }}
                    </a-tag>
                  </template>
                  <template v-if="column.key === 'action'">
                    <a-space>
                      <!-- <a-button
                        v-if="record.supplier_order_status === 0 && ( session.isSupplierClient)"
                        type="primary"
                        size="small"
                        @click="handleConfirmOrder(record)"
                      >
                        确认
                      </a-button> -->
                      <!-- <a-button
                        v-if="record.supplier_order_status === 1"
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
                        @click="handleViewDetail(record,'isOrder')"
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
                :row-selection="orderDetailListRowSelection"
                :pagination="pagination"
                row-key="id"
                @change="handleTableChange"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'supplier_order_status'">
                    <a-tag :color="getStatusColor(record)">
                      {{ getStatusText(record) }}
                    </a-tag>
                  </template>
                  <template v-if="column.key === 'action'">
                    <a-space>
                      <!-- <a-button
                        v-if="record.supplier_order_status === 0 && ( session.isSupplierClient)"
                        type="primary"
                        size="small"
                        @click="handleConfirmOrder(record)"
                      >
                        确认
                      </a-button> -->
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
                        @click="handleViewDetail(record,'isDetail')"
                      >
                        查看详情
                      </a-button>
                    </a-space>
                  </template>
                </template>
              </a-table>
            </a-tab-pane>

            <!-- <a-tab-pane key="dealer-history" tab="经销商历史">
              <DealerHistoryView />
            </a-tab-pane> -->
          </a-tabs>
        </a-card>
      </a-layout-content>
    </a-layout>
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
import { useRouter, useRoute } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { listNewOrders, listOrderHeaders, confirmOrder, rejectOrder, getOrderHeadersSummary } from '@/api/srm'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()
const session = useSessionStore()

const loading = ref(false)
// 为每个表格创建独立的数据源
const orderListDataSource = ref<any[]>([])
const orderDetailListDataSource = ref<any[]>([])
// 为每个表格创建独立的选中状态
const orderListSelectedRowKeys = ref<any[]>([])
const orderListSelectedRows = ref<any[]>([])
const orderDetailListSelectedRowKeys = ref<any[]>([])
const orderDetailListSelectedRows = ref<any[]>([])
// 从 URL 参数中获取 tab 值，如果没有则默认为 'order-list'
const activeTab = ref(route.query.tab as string || 'order-list')

// 驳回订单相关
const rejectModalVisible = ref(false)
const rejectReason = ref('')
const currentOrder = ref<any>(null)

// 汇总统计
const summaryStats = ref({
  order_count: 0,
  total_need_qty: 0,
  pending_confirm_qty: 0,
  total_shipped_qty: 0,
  pending_ship_qty: 0,
  remaining_qty: 0
})

// 从 URL 参数中获取状态过滤值
const initStatus = route.query.status as string
const queryParams = reactive({
  orderNo: '',
  partsNumber: '',
  supplierOrderStatus: initStatus ? [parseInt(initStatus)] : [] as number[],
  deliveryStatus: [] as string[],
  dateRange: null as any
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条`,
  sortField: undefined as string | undefined,
  sortOrder: undefined as 'asc' | 'desc' | undefined
})

const orderListColumns = [
  { title: '订单号', dataIndex: 'order_no', key: 'order_no', width: 150, sorter: true },
  { title: '订单属性', dataIndex: 'order_type', key: 'order_type', width: 100, customRender: ({ text }) => text === 1 ? '样件' : '量产件' },
  { title: '供应商名称', dataIndex: 'supplier_name', key: 'supplier_name', width: 150 },
  { title: '订单状态', dataIndex: 'supplier_order_status', key: 'supplier_order_status', width: 100, sorter: true },
  { title: '交付状态', dataIndex: 'delivery_status', key: 'delivery_status', width: 100 },
  { title: '需求释放时间', dataIndex: 'order_date', key: 'order_date', width: 120, sorter: true },
  { title: '操作', key: 'action', width: 150, fixed: 'right' }
]

const orderDetailListColumns = [
  { title: '订单号', dataIndex: 'order_no', key: 'order_no', width: 150 },
  { title: '供应商名称', dataIndex: 'supplier_name', key: 'supplier_name', width: 150 },
  { title: '零件号', dataIndex: 'parts_no', key: 'parts_no', width: 150, sorter: true },
  { title: '零件名称', dataIndex: 'parts_name', key: 'parts_name', width: 200 },
  { title: '订单数量', dataIndex: 'order_qty', key: 'order_qty', width: 100 },
  { title: '订单属性', dataIndex: 'order_type', key: 'order_type', width: 100, customRender: ({ text }) => text === 1 ? '样件' : '量产件' },
  { title: '已交付数量', dataIndex: 'shipped_qty', key: 'shipped_qty', width: 100 },
  { title: '在途数量', dataIndex: 'pending_ship_qty', key: 'pending_ship_qty', width: 120 },
  { title: '未交付数量', dataIndex: 'remaining_qty', key: 'remaining_qty', width: 100 },
  { title: '需求释放时间', dataIndex: 'order_date', key: 'order_date', width: 120 },
  { title: '要求到货时间', dataIndex: 'need_date', key: 'need_date', width: 120, customRender: ({ text }: { text: unknown }) => text ? String(text).substring(0, 10) : '-' },
  { title: '订单状态', dataIndex: 'supplier_order_status', key: 'supplier_order_status', width: 100 },
  // { title: '送货地址', dataIndex: 'storage_name', key: 'storage_name', width: 150 },
  { title: '操作', key: 'action', width: 150, fixed: 'right' }
]

// 为订单列表创建独立的选中状态
const orderListRowSelection = computed(() => ({
  selectedRowKeys: orderListSelectedRowKeys.value,
  onChange: (keys: any[], rows: any[]) => {
    orderListSelectedRowKeys.value = keys
    orderListSelectedRows.value = rows
  }
}))

// 为订单详情列表创建独立的选中状态
const orderDetailListRowSelection = computed(() => ({
  selectedRowKeys: orderDetailListSelectedRowKeys.value,
  onChange: (keys: any[], rows: any[]) => {
    console.log('订单详情列表选中变化:', {
      keys,
      rowsLength: rows.length,
      firstRow: rows[0]?.order_detail_id
    })
    orderDetailListSelectedRowKeys.value = keys
    orderDetailListSelectedRows.value = rows
  }
}))

// 获取当前激活表格的选中状态
const selectedRowKeys = computed(() => {
  return activeTab.value === 'order-list' ? orderListSelectedRowKeys.value : orderDetailListSelectedRowKeys.value
})

const selectedRows = computed(() => {
  return activeTab.value === 'order-list' ? orderListSelectedRows.value : orderDetailListSelectedRows.value
})

function getStatusColor(record: any) {
  const status = record.supplier_order_status
  const totalNeedQty = record.total_need_qty || 0
  const totalShippedQty = record.total_shipped_qty || 0

  // 根据实际发运数量计算颜色
  if (totalShippedQty >= totalNeedQty && totalNeedQty > 0) {
    return 'cyan'
  } else if (totalShippedQty > 0 && totalShippedQty < totalNeedQty) {
    return 'blue'
  }

  const colorMap: Record<number, string> = {
    0: 'orange',
    20: 'green',
    21: 'purple',
    25: 'blue',
    30: 'blue',
  }
  return colorMap[status] || 'default'
}

function getStatusText(record: any) {
  console.log(record)
  const status = record.supplier_order_status
  const totalNeedQty = record.total_need_qty || 0
  const totalShippedQty = record.total_shipped_qty || 0
  console.log(totalShippedQty)
  console.log(totalNeedQty)
 
  // 根据实际发运数量计算状态
  // if (totalShippedQty >= totalNeedQty && totalNeedQty > 0) {
  //   return '已发运'
  // } else if (totalShippedQty > 0 && totalShippedQty < totalNeedQty) {
  //   return '部分发运'
  // }else if(totalShippedQty==0&&(status===30||status==25)){
  //   return '已确认'
  // }

  // 否则使用存储的状态
  const textMap: Record<number, string> = {
    0: '待确认',
    20: '已确认',
    21: '部分确认',
    25: '已确认',
    30: '已确认',
    40: '已确认',
    90: '已确认'
  }
  console.log(status)
  console.log('????')
  return textMap[status] || '待确认'
}

function getDeliveryStatusColor(status: string | number | null | undefined) {
  const key = status != null && status !== '' ? String(status).trim() : ''
  const colorMap: Record<string, string> = {
    未交付: 'default',
    部分交付: 'orange',
    已交付: 'green'
  }
  return colorMap[key] || 'default'
}

function getDeliveryStatusText(status: string | number | null | undefined) {
  const key = status != null && status !== '' ? String(status).trim() : ''
  const textMap: Record<string, string> = {
    未交付: '未交付',
    部分交付: '部分交付',
    已交付: '已交付'
  }
  return textMap[key] || '未交付'
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
  // 切换 tab 时清空选中状态，避免不同表格的 row-key 冲突导致全选显示异常
  orderListSelectedRowKeys.value = []
  orderListSelectedRows.value = []
  orderDetailListSelectedRowKeys.value = []
  orderDetailListSelectedRows.value = []
  pagination.current = 1
  handleSearch()
}

/** 点击「查询」时回到第一页，避免翻页后按订单号筛选 offset 过大导致列表为空 */
function handleQuery() {
  pagination.current = 1
  handleSearch()
}

async function handleSearch() {
  loading.value = true
  try {
    console.log('开始查询，userId:', session.userId)
    console.log('当前tab:', activeTab.value)
    
    const orderNos = parseBatchInput(queryParams.orderNo)
    const partsNumbers = parseBatchInput(queryParams.partsNumber)
    
    const startDate = queryParams.dateRange?.[0] || ''
    const endDate = queryParams.dateRange?.[1] || ''
    
    const deliveryStatuses = queryParams.deliveryStatus.length > 0 ? queryParams.deliveryStatus : undefined

    let result
    if (activeTab.value === 'order-list') {
      // 订单列表（按订单号）：使用订单纬度的接口
      console.log('调用订单纬度接口，参数:', {
        userId: session.userId.toString(),
        orderNo: orderNos.length > 0 ? orderNos : undefined,
        supplierOrderStatus: queryParams.supplierOrderStatus.length > 0 ? queryParams.supplierOrderStatus : undefined,
        deliveryStatus: deliveryStatuses,
        startDate,
        endDate,
        limit: pagination.pageSize,
        offset: (pagination.current - 1) * pagination.pageSize
      })
      result = await listOrderHeaders({
        userId: session.userId.toString(),
        orderNo: orderNos.length > 0 ? orderNos : undefined,
        supplierOrderStatus: queryParams.supplierOrderStatus.length > 0 ? queryParams.supplierOrderStatus : undefined,
        deliveryStatus: deliveryStatuses,
        startDate,
        endDate,
        requireAttr: '订单',
        limit: pagination.pageSize,
        offset: (pagination.current - 1) * pagination.pageSize,
        sortField: pagination.sortField,
        sortOrder: pagination.sortOrder
      })
      orderListDataSource.value = result.items || []
      orderDetailListDataSource.value = []
    } else {
      // 订单详情列表（按订单详情）：使用订单详情纬度的接口
      console.log('调用订单详情纬度接口，参数:', {
        userId: session.userId.toString(),
        orderNo: orderNos.length > 0 ? orderNos : undefined,
        partsNumber: partsNumbers.length > 0 ? partsNumbers : undefined,
        supplierOrderStatus: queryParams.supplierOrderStatus.length > 0 ? queryParams.supplierOrderStatus : undefined,
        startDate,
        endDate,
        limit: pagination.pageSize,
        offset: (pagination.current - 1) * pagination.pageSize
      })
      result = await listNewOrders({
        userId: session.userId.toString(),
        orderNo: orderNos.length > 0 ? orderNos : undefined,
        partsNumber: partsNumbers.length > 0 ? partsNumbers : undefined,
        supplierOrderStatus: queryParams.supplierOrderStatus.length > 0 ? queryParams.supplierOrderStatus : undefined,
        deliveryStatus: deliveryStatuses,
        startDate,
        endDate,
        requireAttr: '订单',
        limit: pagination.pageSize,
        offset: (pagination.current - 1) * pagination.pageSize,
        sortField: pagination.sortField,
        sortOrder: pagination.sortOrder
      })
      orderDetailListDataSource.value = result.items || []
      orderListDataSource.value = []
    }
    
    pagination.total = result.total || 0
    console.log('查询成功，结果数量:', activeTab.value === 'order-list' ? orderListDataSource.value.length : orderDetailListDataSource.value.length)

    // 获取汇总统计（仅订单列表 tab）
    
      try {
        // console.log('获取汇总统计，参数:', {
        //   userId: session.userId.toString(),
        //   orderNo: orderNos.length > 0 ? orderNos : undefined,
        //   partsNumber: partsNumbers.length > 0 ? partsNumbers : undefined,
        //   supplierOrderStatus: queryParams.supplierOrderStatus.length > 0 ? queryParams.supplierOrderStatus : undefined,
        //   startDate,
        //   endDate
        // })
        const summaryResult = await getOrderHeadersSummary({
          userId: session.userId.toString(),
          orderNo: orderNos.length > 0 ? orderNos : undefined,
          partsNumber: partsNumbers.length > 0 ? partsNumbers : undefined,
          supplierOrderStatus: queryParams.supplierOrderStatus.length > 0 ? queryParams.supplierOrderStatus : undefined,
          deliveryStatus: deliveryStatuses,
          startDate,
          endDate
        })
        console.log('汇总统计结果:', summaryResult)
        summaryStats.value = summaryResult || { order_count: 0, total_need_qty: 0, pending_confirm_qty: 0, total_shipped_qty: 0, pending_ship_qty: 0, remaining_qty: 0 }
      } catch (e) {
        console.error('获取汇总统计失败:', e)
        summaryStats.value = { order_count: 0, total_need_qty: 0, pending_confirm_qty: 0, total_shipped_qty: 0, pending_ship_qty: 0, remaining_qty: 0 }
      }
    

    // 清空选中状态，因为数据已经更新
    orderListSelectedRowKeys.value = []
    orderListSelectedRows.value = []
    orderDetailListSelectedRowKeys.value = []
    orderDetailListSelectedRows.value = []
  } catch (error) {
    console.error('查询失败:', error)
    message.error('查询失败: ' + (error as { friendlyMessage?: string }).friendlyMessage || '未知错误')
  } finally {
    loading.value = false
  }
}



function handleReset() {
  queryParams.orderNo = ''
  queryParams.partsNumber = ''
  queryParams.supplierOrderStatus = []
  queryParams.deliveryStatus = []
  queryParams.dateRange = null
  pagination.current = 1
  pagination.sortField = undefined
  pagination.sortOrder = undefined
  handleSearch()
}

function handleTableChange(pag: any, filters: any, sorter: any) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  // 处理排序
  if (sorter && sorter.field) {
    pagination.sortField = sorter.field
    pagination.sortOrder = sorter.order === 'ascend' ? 'asc' : 'desc'
  } else {
    pagination.sortField = undefined
    pagination.sortOrder = undefined
  }
  handleSearch()
}

function handleCreateShipment() {
  console.log('dhhh')
  if (selectedRowKeys.value.length === 0) {
    message.warning('请至少选择一条待发货订单')
    return
  }

  // 如果是订单详情列表模式
  if (activeTab.value === 'order-detail-list') {
    // 订单详情列表模式：支持跨订单选择零件
    const selectedDetails = orderDetailListSelectedRows.value
    if (selectedDetails.length === 0) {
      message.warning('请至少选择一条待发货订单明细')
      return
    }

    // 获取所有订单ID和选中详情ID
    const orderIds = [...new Set(selectedDetails.map((row: any) => row.order_id))]
    const selectedDetailIds = selectedDetails.map((row: any) => String(row.id)).join(',')

    router.push({
      path: '/shipment/create',
      query: { orderIds: orderIds.join(','), selectedDetailIds }
    })
    return
  }

  // 订单列表模式（原有逻辑）
  const validStatuses = [30,20,25,21]
  const hasInvalidStatus = selectedRows.value.some(row => !validStatuses.includes(row.supplier_order_status))
  console.log(selectedRows)
  console.log('row.supplier_order_status')
  console.log(hasInvalidStatus+"hasInvalidStatus")
  if (hasInvalidStatus) {
    message.error('所选订单包含不可发货状态，请重新检查！')
    return
  }

  const firstPlant = selectedRows.value[0].address
  const hasDifferentPlant = selectedRows.value.some(row => row.address !== firstPlant)

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
        await confirmOrder(record.id, session.userId)
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

function handleViewDetail(record: any,key:String) {
  if(key==="isOrder"){
    router.push({
    path: `/orders/${record.id}`
  })
}else{
  router.push({
    path: `/orders/${record.order_id}`
  })
}
}

async function handleExport() {
  loading.value = true
  try {
    const orderNos = parseBatchInput(queryParams.orderNo)
    const partsNumbers = parseBatchInput(queryParams.partsNumber)
    const startDate = queryParams.dateRange?.[0] || ''
    const endDate = queryParams.dateRange?.[1] || ''

    // 获取全部订单详情数据（不分页，设置大limit）
    const result = await listNewOrders({
      userId: session.userId.toString(),
      orderNo: orderNos.length > 0 ? orderNos : undefined,
      partsNumber: partsNumbers.length > 0 ? partsNumbers : undefined,
      supplierOrderStatus: queryParams.supplierOrderStatus.length > 0 ? queryParams.supplierOrderStatus : undefined,
      deliveryStatus: queryParams.deliveryStatus.length > 0 ? queryParams.deliveryStatus : undefined,
      startDate,
      endDate,
      limit: 10000,
      offset: 0
    })

    const dataToExport = result.items || []

    if (dataToExport.length === 0) {
      message.warning('没有可导出的数据')
      return
    }

    // 导出订单详情（带零件信息）
    const exportColumns = [
      { title: '订单号', key: 'order_no' },
      { title: '零件号', key: 'parts_no' },
      { title: '零件名称', key: 'parts_name' },
      { title: '订单数量', key: 'order_qty' },
      { title: '已交付数量', key: 'shipped_qty' },
      { title: '未交付数量', key: 'remaining_qty' },
      { title: '交期', key: 'need_date' },
      { title: '订单状态', key: 'status_text' },
      { title: '送货地址', key: 'address' }
    ]

    // 表头
    const header = exportColumns.map(c => c.title).join(',')

    // 数据行
    const rows = dataToExport.map((record: any) => {
      return exportColumns.map(col => {
        let value = record[col.key]
        // 获取状态文本
        if (col.key === 'status_text') {
          value = getStatusText(record)
        }
        // 格式化日期
        if (col.key === 'need_date' && value) {
          value = dayjs(value).format('YYYY-MM-DD')
        }
        // 转字符串并处理逗号和引号
        value = value == null ? '' : String(value)
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = '"' + value.replace(/"/g, '""') + '"'
        }
        return value
      }).join(',')
    })

    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `订单详情_${dayjs().format('YYYYMMDD_HHmmss')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    message.success(`导出成功，共 ${dataToExport.length} 条`)
  } catch (e) {
    message.error('导出失败')
  } finally {
    loading.value = false
  }
}


handleSearch()
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

.query-section {
  height: 100%;
}
</style>