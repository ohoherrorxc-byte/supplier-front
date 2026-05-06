<template>
  <div class="srm-page">
    <div class="srm-card-title">交付计划管理</div>
    <p style="color: #64748b; margin-bottom: 16px">
      根据订单创建交付计划，每个计划有对应的数量和到货时间。发货时确认实际数量和时间。
    </p>

    <!-- Tab 选项卡 -->
    <a-tabs v-model:activeKey="activeTab" style="margin-bottom: 16px">
      <!-- 我的交付计划 -->
      <a-tab-pane key="1" tab="我的交付计划">
        <a-alert v-if="error" type="error" :message="error" show-icon style="margin-bottom: 16px" />

        <a-layout style="background: #fff; padding: 16px; border-radius: 8px;">
          <!-- 左侧筛选区域 -->
          <a-layout-sider width="280" style="background: #fafafa; padding: 16px; border-radius: 8px; margin-right: 16px;">
            <a-form layout="vertical">
              <a-form-item label="订单号">
                <a-input v-model:value="filterForm.orderNo" placeholder="输入订单号" allow-clear />
              </a-form-item>
              <a-form-item label="零件号">
                <a-input v-model:value="filterForm.partsNo" placeholder="输入零件号（逗号分隔多选）" allow-clear />
              </a-form-item>
              <a-form-item label="计划时间">
                <a-range-picker v-model:value="filterForm.planDate" format="YYYY-MM-DD" style="width: 100%" />
              </a-form-item>
              <a-form-item label="发货状态">
                <a-select v-model:value="filterForm.status" placeholder="选择状态" allow-clear style="width: 100%">
                  <a-select-option value="">全部</a-select-option>
                  <a-select-option value="PLAN">计划中</a-select-option>
                  <a-select-option value="PARTIAL">部分发货</a-select-option>
                  <a-select-option value="SHIPPED">已发货</a-select-option>
                  <a-select-option value="RECEIVED">已签收</a-select-option>
                  <a-select-option value="COMPLETED">已完成</a-select-option>
                </a-select>
              </a-form-item>
              <a-space>
                <a-button type="primary" :loading="loading" @click="handleFilterSearch">查询</a-button>
                <a-button @click="handleFilterReset">重置</a-button>
              </a-space>
            </a-form>
          </a-layout-sider>
          <!-- 右侧计划列表区域 -->
          <a-layout-content style="flex: 1;">
            <a-spin :spinning="loading">
              <div v-if="allDeliveryPlans.length === 0" style="text-align: center; padding: 40px">
                <a-empty description="暂无交付计划" />
              </div>
              <div v-else>
                <!-- 按订单分组显示 -->
                <div v-for="group in groupedByOrder" :key="group.orderId" style="margin-bottom: 24px">
                  <a-card :title="`订单号 ${group.orderNo}`" size="small">
                    <a-table
                      :columns="planColumns"
                      :data-source="Object.values(group.subGroups).flatMap(sg => sg.plans)"
                      :pagination="false"
                      row-key="id"
                      size="middle"
                    >
                      <template #bodyCell="{ column, record, text }">
                        <template v-if="column.key === 'status'">
                          <a-tag :color="getStatusColor(text)">{{ getStatusText(text) }}</a-tag>
                        </template>
                        <template v-else-if="column.key === 'action'">
                          <a-button
                            v-if="session.isSupplierClient && (record.calculated_status || record.status) === 'PLAN'"
                            type="link"
                            size="small"
                            @click="openShipModal(record)"
                          >
                            发货
                          </a-button>
                          <a-button v-else type="link" size="small" @click="showPlanDetail(record)">
                            查看
                          </a-button>
                        </template>
                      </template>
                    </a-table>
                  </a-card>
                </div>
                <div style="text-align: right; margin-top: 16px">
                  <a-pagination
                    v-model:current="deliveryPlanPage.pageNum"
                    v-model:page-size="deliveryPlanPage.pageSize"
                    :total="deliveryPlanTotal"
                    :show-total="(total: number) => `共 ${total} 条`"
                    :page-size-options="['10', '20', '50', '100']"
                    show-size-changer
                    @change="onDeliveryPlanPageChange"
                    @showSizeChange="onDeliveryPlanSizeChange"
                  />
                </div>
              </div>
            </a-spin>
          </a-layout-content>
        </a-layout>
      </a-tab-pane>

      <!-- 创建计划 -->
      <a-tab-pane v-if="session.isSupplierClient" key="2" tab="创建交付计划">
        <a-layout style="background: #fff; padding: 16px; border-radius: 8px;">
          <!-- 左侧筛选区域 -->
          <a-layout-sider width="280" style="background: #fafafa; padding: 16px; border-radius: 8px; margin-right: 16px;">
            <a-form layout="vertical">
              <a-form-item label="订单号">
                <a-input v-model:value="createFilterForm.orderNo" placeholder="输入订单号" allow-clear />
              </a-form-item>
              <a-form-item label="零件号">
                <a-input v-model:value="createFilterForm.partsNo" placeholder="输入零件号" allow-clear />
              </a-form-item>
              <a-form-item label="开始日期">
                <a-date-picker v-model:value="createFilterForm.startDate" format="YYYY-MM-DD" style="width: 100%" placeholder="选择日期" />
              </a-form-item>
              <a-form-item label="结束日期">
                <a-date-picker v-model:value="createFilterForm.endDate" format="YYYY-MM-DD" style="width: 100%" placeholder="选择日期" />
              </a-form-item>
              <a-space direction="vertical" style="width: 100%">
                <a-button type="primary" :loading="orderLoading" @click="handleCreateFilterSearch" block>查询</a-button>
                <a-button @click="handleCreateFilterReset" block>重置</a-button>
              </a-space>
            </a-form>
          </a-layout-sider>

          <!-- 右侧计划创建区域 -->
          <a-layout-content style="flex: 1;">
            <a-card title="创建交付计划" size="small">
              <template #extra>
                <a-space>
                  <a-checkbox v-model:checked="selectAllOrders">全选</a-checkbox>
                  <a-button type="primary" :loading="batchSubmitting" :disabled="selectedOrderDetails.length === 0" @click="batchCreatePlans">
                    批量创建 ({{ selectedOrderDetails.length }})
                  </a-button>
                </a-space>
              </template>
              <a-spin :spinning="orderLoading">
                <div v-if="confirmedOrders.length === 0" style="text-align: center; padding: 40px">
                  <a-empty description="暂无已确认订单" />
                </div>
                <div v-else>
                  <div v-for="item in confirmedOrders" :key="item.order_detail_id" style="margin-bottom: 16px">
                    <a-card size="small" :body-style="{ padding: '12px' }">
                      <a-row :gutter="16" align="middle">
                        <a-col :span="2">
                          <a-checkbox
                            :checked="selectedOrderDetails.includes(String(item.order_detail_id))"
                            @change="() => toggleSelectOrderDetail(String(item.order_detail_id))"
                          />
                        </a-col>
                        <a-col :span="22">
                          <div style="font-weight: 500; margin-bottom: 8px">
                            <a-tag :color="'blue'" style="margin-left: 8px">无交付计划数量: {{ item.remaining_quantity || 0 }}</a-tag>
                            订单号 {{ item.order_no }} - 零件号 {{ item.parts_no }} {{ item.parts_name }} - 需求到货时间 {{ item.need_date ? String(item.need_date).substring(0, 10) : '-' }}
                          </div>
                          <div v-for="(row, idx) in planFormRows[String(item.order_detail_id)] || []" :key="idx" style="margin-bottom: 8px">
                            <a-row :gutter="8" align="middle">
                              <a-col :span="6">
                                <a-form-item validate-status="error" :style="rowError[String(item.order_detail_id)+'_'+idx] ? 'margin-bottom: 0' : ''">
                                  <template #label><span style="color: red">*</span>数量</template>
                                  <a-input-number
                                    v-model:value="row.quantity"
                                    :min="1"
                                    :max="item.remaining_quantity || 0"
                                    placeholder="必填"
                                    style="width: 100%"
                                    @change="clearRowError(String(item.order_detail_id), idx)"
                                  />
                                </a-form-item>
                              </a-col>
                              <a-col :span="6">
                                <a-form-item validate-status="error" :style="rowError[String(item.order_detail_id)+'_'+idx] ? 'margin-bottom: 0' : ''">
                                  <template #label><span style="color: red">*</span>交付日期</template>
                                  <a-date-picker
                                    v-model:value="row.date"
                                    placeholder="必填"
                                    style="width: 100%"
                                    @change="clearRowError(String(item.order_detail_id), idx)"
                                  />
                                </a-form-item>
                              </a-col>
                              <a-col :span="6">
                                <a-form-item label="备注">
                                  <a-input v-model:value="row.remark" placeholder="可选" />
                                </a-form-item>
                              </a-col>
                              <a-col :span="6">
                                <a-space>
                                  <a-button size="small" type="link" @click="addPlanRow(String(item.order_detail_id), Number(item.remaining_quantity))">+添加</a-button>
                                  <a-button size="small" type="link" danger :disabled="(planFormRows[String(item.order_detail_id)]?.length || 0) <= 1" @click="removePlanRow(String(item.order_detail_id), idx)">删除</a-button>
                                </a-space>
                              </a-col>
                            </a-row>
                            <div v-if="rowError[String(item.order_detail_id)+'_'+idx]" style="color: #ff4d4f; font-size: 12px; margin-top: 4px">请填写数量和交付日期</div>
                          </div>
                        </a-col>
                      </a-row>
                    </a-card>
                  </div>
                </div>
                <div style="text-align: right; margin-top: 16px">
                  <a-pagination
                    v-model:current="orderDetailPage.pageNum"
                    v-model:page-size="orderDetailPage.pageSize"
                    :total="orderDetailTotal"
                    :show-total="(total: number) => `共 ${total} 条`"
                    :page-size-options="['10', '20', '50', '100']"
                    show-size-changer
                    @change="onOrderDetailPageChange"
                    @showSizeChange="onOrderDetailSizeChange"
                  />
                </div>
              </a-spin>
            </a-card>
          </a-layout-content>
        </a-layout>
      </a-tab-pane>
    </a-tabs>

    <!-- 发货弹窗 -->
    <a-modal v-model:open="shipModal.open" title="发货" @ok="submitShip" :confirm-loading="shipModal.loading">
      <a-form layout="vertical">
        <a-form-item label="计划发货数量">
          <a-input :value="`${shipModal.record?.plan_quantity || ''}`" disabled />
        </a-form-item>
        <a-form-item label="实际发货数量" required>
          <a-input-number
            v-model:value="shipModal.actualQuantity"
            :min="1"
            :max="shipModal.record?.plan_quantity || 0"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="发货日期" required>
          <a-date-picker v-model:value="shipModal.shipDate" style="width: 100%" />
        </a-form-item>
        <a-form-item label="物流公司" required>
          <a-input v-model:value="shipModal.logisticsCompany" placeholder="物流公司名称" />
        </a-form-item>
        <!-- <a-form-item label="发货单号" required>
          <a-input v-model:value="shipModal.trackingNo" placeholder="发货单号/物流单号" />
        </a-form-item>
        <a-form-item label="预计到货日期" required>
          <a-date-picker v-model:value="shipModal.actualEtaDate" style="width: 100%" />
        </a-form-item> -->
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import {
  listDeliveryPlanBySupplier,
  listPendingShipmentOrderDetails,
  createDeliveryPlan,
  updateDeliveryPlanShipInfo,
  type JsonMap,
} from '@/api/srm'
import { message, Modal } from 'ant-design-vue'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'

const session = useSessionStore()
const route = useRoute()
const activeTab = ref('1')
const loading = ref(false)
const error = ref('')
const orderLoading = ref(false)
const orderError = ref('')
const submitting = ref<number | null>(null)
const batchSubmitting = ref(false)

const allDeliveryPlans = ref<JsonMap[]>([])
const confirmedOrders = ref<JsonMap[]>([])
const deliveryPlanTotal = ref(0)
const orderDetailTotal = ref(0)

// 切换Tab时重置表单数据
watch(activeTab, (newTab) => {
  if (newTab === '2') {
    // 切换到创建交付计划 tab 时，重置表单
    selectedOrderDetails.value = []
    // 重置 planFormRows 中的数据
    Object.keys(planFormRows).forEach(key => {
      planFormRows[key] = planFormRows[key].map(row => ({
        ...row,
        quantity: 0,
        date: null,
        remark: ''
      }))
    })
  }
})

const deliveryPlanPage = reactive({
  pageNum: 1,
  pageSize: 10,
})

const orderDetailPage = reactive({
  pageNum: 1,
  pageSize: 10,
})

const filterForm = reactive({
  orderNo: '',
  partsNo: '',
  planDate: null as [Dayjs, Dayjs] | null,
  status: ''
})

const createFilterForm = reactive({
  orderNo: '',
  partsNo: '',
  startDate: null as Dayjs | null,
  endDate: null as Dayjs | null,
})

// 每个订单明细对应的多个交付计划行
const planFormRows = reactive<Record<string, { quantity: number; date: Dayjs | null; remark: string }[]>>({})

// 记录每行数据的错误状态
const rowError = reactive<Record<string, boolean>>({})

function clearRowError(orderDetailId: string, index: number) {
  delete rowError[`${orderDetailId}_${index}`]
}

// 选中的订单明细ID列表（使用string类型匹配API返回）
const selectedOrderDetails = ref<string[]>([])

function handleFilterSearch() {
  deliveryPlanPage.pageNum = 1
  loadDeliveryPlans()
}

function handleFilterReset() {
  filterForm.orderNo = ''
  filterForm.partsNo = ''
  filterForm.planDate = null
  filterForm.status = ''
  deliveryPlanPage.pageNum = 1
  loadDeliveryPlans()
}

function handleCreateFilterSearch() {
  orderDetailPage.pageNum = 1
  loadConfirmedOrders()
}

function handleCreateFilterReset() {
  createFilterForm.orderNo = ''
  createFilterForm.partsNo = ''
  createFilterForm.startDate = null
  createFilterForm.endDate = null
  orderDetailPage.pageNum = 1
  loadConfirmedOrders()
}

function onDeliveryPlanSizeChange() {
  deliveryPlanPage.pageNum = 1
  loadDeliveryPlans()
}

function onDeliveryPlanPageChange() {
  loadDeliveryPlans()
}

function onOrderDetailSizeChange() {
  orderDetailPage.pageNum = 1
  loadConfirmedOrders()
}

function onOrderDetailPageChange() {
  loadConfirmedOrders()
}

// 初始化单个订单明细的交付计划行
function initPlanFormRows(orderDetailId: number, remainingQty: number) {
  if (!planFormRows[orderDetailId] || planFormRows[orderDetailId].length === 0) {
    planFormRows[orderDetailId] = [{ quantity: remainingQty > 0 ? Math.min(0, remainingQty) : 1, date: null, remark: '' }]
  }
}

// 添加一行交付计划
function addPlanRow(orderDetailId: string, remainingQty: number) {
  if (!planFormRows[orderDetailId]) {
    planFormRows[orderDetailId] = []
  }
  planFormRows[orderDetailId].push({ quantity: remainingQty > 0 ? Math.min(0, remainingQty) : 0, date: null, remark: '' })
}

// 删除一行交付计划
function removePlanRow(orderDetailId: string, index: number) {
  if (planFormRows[orderDetailId] && planFormRows[orderDetailId].length > 1) {
    planFormRows[orderDetailId].splice(index, 1)
  }
}

// 勾选/取消勾选订单明细
function toggleSelectOrderDetail(orderDetailId: string | number) {
  const id = String(orderDetailId)
  const idx = selectedOrderDetails.value.indexOf(id)
  if (idx >= 0) {
    selectedOrderDetails.value.splice(idx, 1)
  } else {
    selectedOrderDetails.value.push(id)
  }
}

// 是否全选（根据实际选中数量计算）
const selectAllOrders = computed({
  get: () => selectedOrderDetails.value.length > 0 && selectedOrderDetails.value.length === confirmedOrders.value.length,
  set: (val: boolean) => {
    if (val) {
      selectedOrderDetails.value = confirmedOrders.value.map(item => String(item.order_detail_id))
    } else {
      selectedOrderDetails.value = []
    }
  }
})

// 批量创建交付计划
async function batchCreatePlans() {
  if (selectedOrderDetails.value.length === 0) {
    message.warning('请先选择要创建交付计划的订单明细')
    return
  }

  // 检查用户登录状态
  console.log('batchCreatePlans - operatorUserId:', session.operatorUserId, 'userId:', session.userId)
  if (!session.operatorUserId) {
    message.error('用户未登录或会话已过期')
    return
  }

  batchSubmitting.value = true
  let successCount = 0
  let failCount = 0
  const failReasons: string[] = []
  let hasValidationError = false

  // 先验证所有必填项
  for (const orderDetailId of selectedOrderDetails.value) {
    const rows = planFormRows[orderDetailId] || []
    rows.forEach((row, idx) => {
      if (!row.quantity || !row.date) {
        rowError[`${orderDetailId}_${idx}`] = true
        hasValidationError = true
      }
    })
  }

  if (hasValidationError) {
    batchSubmitting.value = false
    message.error('请填写数量和交付日期（带 * 为必填）')
    return
  }

  // 检查交付计划数量是否超过无交付计划数量
  for (const orderDetailId of selectedOrderDetails.value) {
    const rows = planFormRows[orderDetailId] || []
    const orderItem = confirmedOrders.value.find(item => item.order_detail_id === orderDetailId)
    const remainingQty = Number(orderItem?.remaining_quantity) || 0
    const totalPlanQty = rows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0)

    if (totalPlanQty > remainingQty) {
      batchSubmitting.value = false
      message.error(`订单 ${orderItem?.order_no} 零件号 ${orderItem?.parts_no} 交付计划数量不得超过无交付计划数量 (${remainingQty})`)
      return
    }
  }

  // 检查交付日期是否超过要求到货日期或当天日期
  const warnings: string[] = []
  const today = dayjs().startOf('day')
  for (const orderDetailId of selectedOrderDetails.value) {
    const rows = planFormRows[orderDetailId] || []
    const orderItem = confirmedOrders.value.find(item => item.order_detail_id === orderDetailId)
    const needDate = orderItem?.need_date ? dayjs(String(orderItem.need_date).substring(0, 10)) : null

    for (const row of rows) {
      if (row.date) {
        const planDate = row.date.startOf('day')
        if (needDate && planDate.isAfter(needDate)) {
          warnings.push(`订单 ${orderItem?.order_no} 零件号 ${orderItem?.parts_no} 的交付日期超过要求到货日期`)
        } else if (planDate.isBefore(today)) {
          warnings.push(`订单 ${orderItem?.order_no} 零件号 ${orderItem?.parts_no} 的交付日期小于当天日期`)
        }
      }
    }
  }

  // 如果有警告，弹出确认框
  if (warnings.length > 0) {
    batchSubmitting.value = false
    const uniqueWarnings = [...new Set(warnings)]
    Modal.confirm({
      title: '交付日期超出限制',
      content: uniqueWarnings.join('\n') + '\n\n是否确认提交交付计划？',
      okText: '确认提交',
      cancelText: '取消',
      onOk: () => {
        batchSubmitting.value = true
        doBatchCreatePlans()
      }
    })
    return
  }

  // 正常提交
  doBatchCreatePlans()
}

// 实际执行批量创建
async function doBatchCreatePlans() {
  let successCount = 0
  let failCount = 0
  const failReasons: string[] = []

  for (const orderDetailId of selectedOrderDetails.value) {
    const rows = planFormRows[orderDetailId] || []
    const orderItem = confirmedOrders.value.find(item => item.order_detail_id === orderDetailId)

    for (const row of rows) {
      try {
        console.log('创建交付计划:', {
          operatorUserId: session.operatorUserId,
          orderId: orderItem?.order_id,
          orderDetailId: orderDetailId,
          planQuantity: row.quantity,
          planDate: row.date!.format('YYYY-MM-DD'),
          remark: row.remark
        })
        await createDeliveryPlan({
          operatorUserId: session.operatorUserId,
          orderId: String(orderItem?.order_id),
          orderDetailId: String(orderDetailId),
          planQuantity: row.quantity,
          planDate: row.date!.format('YYYY-MM-DD'),
          remark: row.remark,
        })
        successCount++
        console.log('创建成功:', orderDetailId)
      } catch (e: unknown) {
        failCount++
        const err = e as { response?: { data?: { message?: string } }; friendlyMessage?: string; message?: string }
        const errMsg = err.response?.data?.message || err.friendlyMessage || err.message || '未知错误'
        failReasons.push(`订单 ${orderItem?.order_no || orderDetailId}: ${errMsg}`)
        console.error('创建失败:', orderDetailId, errMsg)
      }
    }
  }

  batchSubmitting.value = false

  if (successCount > 0) {
    message.success(`成功创建 ${successCount} 条交付计划`)
  }
  if (failCount > 0) {
    message.warning(`${failCount} 条创建失败`)
    console.warn('失败原因:', failReasons)
  }

  // 清空选中状态
  selectedOrderDetails.value = []

  // 刷新列表
  await loadDeliveryPlans()
  await loadConfirmedOrders()
  activeTab.value = '1'
}

const shipModal = reactive({
  open: false,
  loading: false,
  record: null as JsonMap | null,
  actualQuantity: null as number | null,
  shipDate: null as Dayjs | null,
  logisticsCompany: '',
  trackingNo: '',
  actualEtaDate: null as Dayjs | null,
})

const planColumns: ColumnsType<JsonMap> = [
  { title: '计划号', dataIndex: 'plan_no', key: 'plan_no' },
  { title: '零件号', dataIndex: 'parts_no', key: 'parts_no' },
  { title: '计划交付数量', dataIndex: 'plan_quantity', key: 'plan_quantity', width: 100 },
  { title: '已交付数量', dataIndex: 'allocated_shipped_qty', key: 'allocated_shipped_qty', width: 100 },
  { title: '计划日期', dataIndex: 'plan_date', key: 'plan_date'},
  // { title: '发货数量', dataIndex: 'actual_quantity', key: 'actual_quantity', width: 100 },
  // { title: '发货单号', dataIndex: 'tracking_no', key: 'tracking_no' },
  // { title: '物流公司', dataIndex: 'logistics_company', key: 'logistics_company' },
  { title: '状态', dataIndex: 'calculated_status', key: 'status', width: 100 },
  // { title: '操作', key: 'action', width: 100 },
]

const groupedByOrder = computed(() => {
  // 外层按 order_id 分组
  const groups: Record<
    string,
    { orderId: string; orderNo: string; subGroups: Record<string, { orderDetailId: string; plans: JsonMap[] }> }
  > = {}

  allDeliveryPlans.value.forEach((plan) => {
    const orderId = String(plan.order_id)
    if (!groups[orderId]) {
      groups[orderId] = {
        orderId,
        orderNo: String(plan.order_no || `订单${plan.order_id}`),
        subGroups: {},
      }
    }

    // 内层按 order_detail_id 子分组
    const orderDetailId = String(plan.order_detail_id || 'none')
    if (!groups[orderId].subGroups[orderDetailId]) {
      groups[orderId].subGroups[orderDetailId] = {
        orderDetailId,
        plans: [],
      }
    }
    groups[orderId].subGroups[orderDetailId].plans.push(plan)
  })

  // 对每个订单组内的计划按日期排序，并计算分配后的已发货数量和状态
  Object.values(groups).forEach((group) => {
    // 遍历每个子分组，分别计算先进先出发货分配
    Object.values(group.subGroups).forEach((subGroup) => {
      // 按计划日期升序排序
      subGroup.plans.sort((a: JsonMap, b: JsonMap) => {
        const dateA = String(a.plan_date || '')
        const dateB = String(b.plan_date || '')
        return dateA.localeCompare(dateB)
      })

      // 获取该 order_detail_id 的总已发货数量
      const totalShipped = subGroup.plans.length > 0 ? Number(subGroup.plans[0].total_shipped) || 0 : 0

      // 按时间顺序分配已发货数量（先进先出）
      let remaining = totalShipped
      subGroup.plans.forEach((plan) => {
        const planQty = Number(plan.plan_quantity) || 0
        // 分配给当前计划的已发货数量 = min(计划数量, 剩余未分配数量)
        const allocated = Math.min(planQty, Math.max(0, remaining))
        plan.allocated_shipped_qty = allocated
        remaining -= allocated

        // 重新计算状态：如果分配数量 >= 计划数量，则为已发货
        if (allocated >= planQty) {
          plan.calculated_status = 'SHIPPED'
        } else if (allocated > 0) {
          plan.calculated_status = 'PARTIAL'
        } else {
          plan.calculated_status = plan.status || 'PLAN'
        }
      })
    })

    // 根据发货状态筛选
    if (filterForm.status) {
      Object.values(group.subGroups).forEach((subGroup) => {
        subGroup.plans = subGroup.plans.filter((plan) => plan.calculated_status === filterForm.status)
      })
    }

    // 清理空的子分组
    Object.keys(group.subGroups).forEach((key) => {
      if (group.subGroups[key].plans.length === 0) {
        delete group.subGroups[key]
      }
    })
  })

  // 过滤掉没有匹配计划的订单组
  return Object.values(groups).filter((group) =>
    Object.values(group.subGroups).some((sg) => sg.plans.length > 0)
  )
})

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    PLAN: 'blue',
    SHIPPED: 'cyan',
    PARTIAL: 'orange',
    RECEIVED: 'green',
    COMPLETED: 'green',
  }
  return map[status] || 'default'
}

function getStatusText(status: string) {
  const map: Record<string, string> = {
    PLAN: '计划中',
    SHIPPED: '已发货',
    PARTIAL: '部分发货',
    RECEIVED: '已签收',
    COMPLETED: '已完成',
  }
  return map[status] || status
}

async function loadDeliveryPlans() {
  loading.value = true
  error.value = ''
  allDeliveryPlans.value = []

  try {
    const res = await listDeliveryPlanBySupplier(
      session.userId,
      filterForm.orderNo || undefined,
      filterForm.partsNo ? filterForm.partsNo.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      filterForm.planDate ? filterForm.planDate[0].format('YYYY-MM-DD') : undefined,
      filterForm.planDate ? filterForm.planDate[1].format('YYYY-MM-DD') : undefined,
      undefined,
      deliveryPlanPage.pageSize,
      (deliveryPlanPage.pageNum - 1) * deliveryPlanPage.pageSize
    )
    allDeliveryPlans.value = res.items || []
    deliveryPlanTotal.value = Number(res.total) || 0
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; friendlyMessage?: string }
    error.value = err.response?.data?.message || err.friendlyMessage || '加载失败'
  } finally {
    loading.value = false
  }
}

async function loadConfirmedOrders() {
  orderLoading.value = true
  orderError.value = ''
  confirmedOrders.value = []
  selectedOrderDetails.value = []

  try {
    const res = await listPendingShipmentOrderDetails(
      session.userId,
      createFilterForm.orderNo ? [createFilterForm.orderNo] : undefined,
      createFilterForm.partsNo ? [createFilterForm.partsNo] : undefined,
      createFilterForm.startDate ? createFilterForm.startDate.format('YYYY-MM-DD') : undefined,
      createFilterForm.endDate ? createFilterForm.endDate.format('YYYY-MM-DD') : undefined,
      orderDetailPage.pageSize,
      (orderDetailPage.pageNum - 1) * orderDetailPage.pageSize
    )

    // 直接使用接口返回的数据，已经是按零件纬度的
    confirmedOrders.value = res.items
    orderDetailTotal.value = Number(res.total) || 0

    // 初始化每个订单明细的交付计划行
    confirmedOrders.value.forEach(item => {
      const detailId = String(item.order_detail_id)
      const remainingQty = Number(item.remaining_quantity) || 0
      if (!planFormRows[detailId] || planFormRows[detailId].length === 0) {
        planFormRows[detailId] = [{ quantity: remainingQty > 0 ? Math.min(0, remainingQty) : 1, date: null, remark: '' }]
      }
    })
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; friendlyMessage?: string }
    orderError.value = err.response?.data?.message || err.friendlyMessage || '加载失败'
  } finally {
    orderLoading.value = false
  }
}

function openShipModal(record: JsonMap) {
  shipModal.record = record
  shipModal.actualQuantity = record.plan_quantity as number | null
  shipModal.shipDate = null
  shipModal.logisticsCompany = ''
  shipModal.trackingNo = ''
  shipModal.actualEtaDate = null
  shipModal.open = true
}

function showPlanDetail(record: JsonMap) {
  message.info(`计划 ${record.plan_no} - 状态: ${getStatusText(record.status)}`)
}

async function submitShip() {
  if (
    !shipModal.actualQuantity ||
    !shipModal.shipDate ||
    !shipModal.logisticsCompany ||
    !shipModal.trackingNo ||
    !shipModal.actualEtaDate
  ) {
    message.warning('请填写完整信息')
    return
  }

  shipModal.loading = true

  try {
    await updateDeliveryPlanShipInfo(shipModal.record?.id as number, {
      operatorUserId: parseInt(session.operatorUserId),
      actualQuantity: shipModal.actualQuantity,
      actualEtaDate: shipModal.actualEtaDate.format('YYYY-MM-DD'),
      trackingNo: shipModal.trackingNo,
      logisticsCompany: shipModal.logisticsCompany,
      shipDate: shipModal.shipDate.format('YYYY-MM-DD'),
    })
    message.success('发货信息已提交')
    shipModal.open = false
    await loadDeliveryPlans()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; friendlyMessage?: string }
    message.error(err.response?.data?.message || err.friendlyMessage || '提交失败')
  } finally {
    shipModal.loading = false
  }
}

onMounted(async () => {
  // 如果 URL 有 startDate 和 endDate 参数，设置到筛选表单
  if (route.query.startDate) {
    createFilterForm.startDate = dayjs(route.query.startDate as string)
  }
  if (route.query.endDate) {
    createFilterForm.endDate = dayjs(route.query.endDate as string)
  }
  await loadDeliveryPlans()
  await loadConfirmedOrders()
})
</script>
