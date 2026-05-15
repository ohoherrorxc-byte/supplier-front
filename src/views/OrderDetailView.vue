<template>
  <div class="srm-page">
    <!-- 全局操作区 -->
    <div class="global-actions" style="margin-bottom: 16px; text-align: right">
      <a-space>
        <a-button @click="$router.back()">返回</a-button>
        <!-- <a-button
          v-if="order?.supplier_order_status===0&& ( session.isSupplierClient)"
          type="primary"
          @click="handleSubmitOrder"
        >
          提交确认
        </a-button> -->
      </a-space>
    </div>

    <a-spin :spinning="loading">
      <a-alert v-if="error" type="error" :message="error" show-icon style="margin-bottom: 16px" />
      <template v-else-if="order">
        <!-- 订单基本信息区域 -->
        <div style="background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
          <a-card title="订单基本信息" size="small">
            <a-descriptions size="small" :column="{ xs: 1, sm: 2, md: 4 }">
              <!-- 供应商信息 -->
              <a-descriptions-item label="供应商编码">{{ order.supplier_no || '-' }}</a-descriptions-item>
              <a-descriptions-item label="供应商名称">{{ order.supplier_name || '-' }}</a-descriptions-item>

              <!-- 订单管控信息 -->
              <a-descriptions-item label="系统订单号">{{ order.order_no }}</a-descriptions-item>
              <a-descriptions-item label="订单日期">{{ formatDate(order.order_date as string) }}</a-descriptions-item>
              <a-descriptions-item label="计划员">{{ order.plan_user_name || '-' }}</a-descriptions-item>
              <a-descriptions-item label="业务标识">{{ order.business_type || '量产' }}</a-descriptions-item>

              <!-- 物流与交期指令 -->
              <!-- <a-descriptions-item label="运输方式">{{ order.transport_mode || '供应商自送' }}</a-descriptions-item>
              <a-descriptions-item label="送货工厂">{{ order.delivery_factory || '-' }}</a-descriptions-item>
              <a-descriptions-item label="送货详细地址" :span="2">{{ order.delivery_address || '-' }}</a-descriptions-item> -->
              <!-- <a-descriptions-item label="要求到库日期">{{ order.required_delivery_date || '-' }}</a-descriptions-item> -->

              <!-- 状态与属性 -->
              <a-descriptions-item label="订单状态">
                <a-tag :color="getOrderStatusColor(order.supplier_order_status)">
                  {{ getOrderStatusText(order.supplier_order_status) }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="紧急类型">
                <a-tag v-if="order.urgency === '特急'" color="red">特急</a-tag>
                <a-tag v-else-if="order.urgency === '加急'" color="orange">加急</a-tag>
                <span v-else>常规</span>
              </a-descriptions-item>
              <!-- <a-descriptions-item label="锁定状态">
                <a-tag v-if="order.locked" color="red">已锁定</a-tag>
                <span v-else>正常</span>
              </a-descriptions-item> -->
              <!-- <a-descriptions-item label="币种">{{ order.currency || 'CNY' }}</a-descriptions-item> -->
            </a-descriptions>
          </a-card>
        </div>

        <!-- 订单详细信息区域 -->
        <div style="background: #fff; padding: 16px; border-radius: 8px;">
          <!-- 订单生命周期关联区 -->
          <a-tabs v-model:activeKey="activeTab" type="card">
            <!-- Tab 1: 订单详细 -->
            <a-tab-pane key="details" tab="订单详细">
              <a-card size="small">
                <template #title>
                  <a-space>
                    <span>订单明细</span>
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
                    <template v-if="column.key === 'confirmed_quantity'">
                      <a-input-number
                        v-model:value="record.confirmed_quantity"
                        :min="0"
                        :max="record.need_number"
                        style="width: 100%"
                        size="small"
                        disabled
                      />
                    </template>
                    <template v-else-if="column.key === 'expected_delivery_date'">
                      <a-date-picker
                        v-model:value="record.expected_delivery_date"
                        value-format="YYYY-MM-DD"
                        style="width: 100%"
                        size="small"
                        disabled
                      />
                    </template>
                    <template v-else-if="column.key === 'pickup_date'">
                      <a-date-picker
                        v-model:value="record.pickup_date"
                        value-format="YYYY-MM-DD"
                        style="width: 100%"
                        size="small"
                        disabled
                        v-if="order.transport_mode === 'Milk Run'"
                      />
                    </template>
                    <template v-else-if="column.key === 'supplier_order_status'">
                      <a-tag :color="getDetailStatusColor(record.supplier_order_status)">
                        {{ getDetailStatusText(record.supplier_order_status) }}
                      </a-tag>
                    </template>
                    <template v-else-if="column.key === 'action'">
                      <a-button
                        v-if="!session.isAdmin&&(record.supplier_order_status === 0 || record.supplier_order_status === '0')"
                        type="primary"
                        size="small"
                        @click="handleConfirmDetail(record)"
                      >
                        确认
                      </a-button>
                      <span v-else-if="Number(record.supplier_order_status) !== 0" style="color: #999">已确认</span>
                    </template>
                  </template>
                </a-table>
              </a-card>
            </a-tab-pane>

            <!-- Tab 2: 拆分行 -->
            <!-- <a-tab-pane key="splits" tab="拆分行">
              <a-card size="small">
                <template #title>
                  <a-space>
                    <span>PO 拆分行（ASN.md / Schedule）</span>
                    <a-tag color="cyan">{{ splitLines.length }} 行</a-tag>
                  </a-space>
                </template>
                <a-space v-if="order.order_status === 20 || String(order.order_status) === '20'" style="margin-bottom: 12px" wrap>
                  <a-button type="primary" size="small" :loading="seedSplitsLoading" @click="seedDefaultSplits">
                    初始化拆分行（每明细一行，不拆交期）
                  </a-button>
                  <span style="color: #64748b; font-size: 12px">便于已确认订单尚未拆分时，快速生成 1:1 子行后再去创建 ASN</span>
                </a-space>
                <a-table
                  :columns="splitColumns"
                  :data-source="splitLines"
                  row-key="split_line_id"
                  size="small"
                  :pagination="false"
                  :loading="splitLinesLoading"
                />
              </a-card>
            </a-tab-pane>s -->

            <!-- Tab 3: 发运信息 -->
            <a-tab-pane key="asn" tab="发运信息">
              <a-card size="small">
                <template #title>
                  <a-space>
                    <span>发货通知单</span>
                    <a-tag color="green">{{ asnList.length }} 个</a-tag>
                  </a-space>
                </template>
                <a-table
                  :columns="asnColumns"
                  :data-source="asnList"
                  row-key="id"
                  size="small"
                  :pagination="false"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'asn_no'">
                      <a @click="viewAsnDetail(record)">{{ record.asn_no }}</a>
                    </template>
                    <template v-else-if="column.key === 'status'">
                      <a-tag :color="getAsnStatusColor(record.status)">
                        {{ getAsnStatusText(record.status) }}
                      </a-tag>
                    </template>
                  </template>
                </a-table>
              </a-card>
            </a-tab-pane>

            <!-- Tab 4: 收货信息 -->
            <a-tab-pane key="receipt" tab="收货信息">
              <a-card size="small">
                <template #title>
                  <a-space>
                    <span>收货记录</span>
                    <a-tag color="purple">{{ receiptList.length }} 个</a-tag>
                  </a-space>
                </template>
                <a-table
                  :columns="receiptColumns"
                  :data-source="receiptList"
                  row-key="id"
                  size="small"
                  :pagination="false"
                />
              </a-card>
            </a-tab-pane>

            <!-- Tab 5: 状态跟踪 -->
            <a-tab-pane key="timeline" tab="状态跟踪">
              <a-card size="small">
                <a-timeline>
                  <a-timeline-item
                    v-for="(item, index) in timeline"
                    :key="index"
                    :color="item.color"
                  >
                    <template #dot>
                      <a-icon :type="item.icon" />
                    </template>
                    <div>
                      <div style="font-weight: 500">{{ item.title }}</div>
                      <div style="color: #666; font-size: 12px">{{ item.time }}</div>
                      <div v-if="item.description" style="margin-top: 8px">{{ item.description }}</div>
                    </div>
                  </a-timeline-item>
                </a-timeline>
              </a-card>
            </a-tab-pane>

            <!-- Tab 6: 变更日志 -->
            <a-tab-pane key="audit" tab="变更日志">
              <a-card size="small">
                <a-table
                  :columns="auditColumns"
                  :data-source="auditLog"
                  row-key="id"
                  size="small"
                  :pagination="false"
                />
              </a-card>
            </a-tab-pane>
          </a-tabs>
        </div>
      </template>
    </a-spin>

    <!-- 提交确认弹窗 -->
    <a-modal
      v-model:open="submitModal.open"
      title="确认订单"
      @ok="doSubmitOrder"
      :confirm-loading="submitModal.loading"
    >
      <p>您确定接受该订单的所有条款和交期吗？</p>
      <a-textarea
        v-model:value="submitModal.reason"
        placeholder="备注（可选）"
        :rows="3"
      />
    </a-modal>

    <!-- 拆分行弹窗 -->
    <a-modal
      v-model:open="splitModal.open"
      title="拆分订单行"
      @ok="doSplitLine"
      :confirm-loading="splitModal.loading"
      width="600px"
    >
      <div style="margin-bottom: 16px">
        <strong>原行信息</strong>
        <p>零件：{{ splitModal.record?.parts_name }} ({{ splitModal.record?.parts_number }})</p>
        <p>数量：{{ splitModal.record?.need_number }}</p>
      </div>

      <a-form layout="vertical">
        <a-form-item label="拆分数量">
          <a-space>
            <a-input-number
              v-model:value="splitModal.splitQuantity1"
              :min="1"
              :max="splitModal.record?.need_number - 1"
              placeholder="第一批数量"
            />
            <a-input-number
              v-model:value="splitModal.splitQuantity2"
              :min="1"
              :max="splitModal.record?.need_number - 1"
              placeholder="第二批数量"
            />
          </a-space>
          <div style="color: #666; font-size: 12px; margin-top: 4px">
            总数量：{{ splitModal.splitQuantity1 + splitModal.splitQuantity2 }} / {{ splitModal.record?.need_number }}
          </div>
        </a-form-item>

        <a-form-item label="第一批预计到库日期">
          <a-date-picker
            v-model:value="splitModal.expectedDate1"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item label="第二批预计到库日期">
          <a-date-picker
            v-model:value="splitModal.expectedDate2"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { TagColor } from 'ant-design-vue/es/tag'
import {
  getOrder,
  confirmOrder,
  confirmOrderDetail,
  getOrderAsnList,
  listOrderSplitLines,
  confirmAndSplit,
  getOrderReceipts,
  getOrderTimeline,
  getOrderAuditLog,
  type JsonMap,
} from '@/api/srm'
import { useSessionStore } from '@/stores/session'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()

const props = defineProps<{
  id: string
}>()

const orderIdNum = computed(() => Number(props.id))

const loading = ref(false)
const error = ref('')
const activeTab = ref('details')

// 订单数据
const order = ref<JsonMap | null>(null)
const details = ref<JsonMap[]>([])
const splitLines = ref<JsonMap[]>([])
const asnList = ref<JsonMap[]>([])
const receiptList = ref<JsonMap[]>([])
const timeline = ref<any[]>([])
const auditLog = ref<JsonMap[]>([])

const splitLinesLoading = ref(false)
const seedSplitsLoading = ref(false)

// 弹窗状态
const submitModal = reactive({
  open: false,
  loading: false,
  reason: '',
})

const splitModal = reactive({
  open: false,
  loading: false,
  record: null as JsonMap | null,
  splitQuantity1: 0,
  splitQuantity2: 0,
  expectedDate1: '',
  expectedDate2: '',
})

// 表格列定义
const detailColumns: ColumnsType<JsonMap> = [
  { title: '行号', dataIndex: 'line_no', key: 'line_no', width: 80 },
  { title: '订单属性', dataIndex: 'order_type', key: 'order_type', width: 100, customRender: ({ text }) => text === 1 ? '样件' : '量产件' },
  { title: '零件号', dataIndex: 'parts_number', key: 'parts_number'},
  { title: '零件名称', dataIndex: 'parts_name', key: 'parts_name', ellipsis: true },
  { title: '订单零件数', dataIndex: 'need_number', key: 'need_number', align: 'right', width: 120 },
  // { title: '确认零件数', key: 'confirmed_quantity' },
  { title: '要求到库日期', dataIndex: 'need_date', key: 'need_date', customRender: ({ text }) => formatDate(text as string) },
  // { title: '预计到库日期', key: 'expected_delivery_date', width: 140 },
  // { title: '要求提货日期', key: 'pickup_date', width: 140 },
  { title: '交付数量', key: 'shipped_qty', align: 'right', width: 100, customRender: () => '/' },
  { title: '在途数量', key: 'pending_ship_qty', align: 'right', width: 100, customRender: () => '/' },
  { title: '未交数量', key: 'remaining_qty', align: 'right', width: 100, customRender: () => '/' },
  // { title: '预收货数量', dataIndex: 'expected_receipt_qty', key: 'expected_receipt_qty' },
  // { title: '实际收货数量', dataIndex: 'received_quantity', key: 'received_quantity' },
  { title: '状态', dataIndex: 'supplier_order_status', key: 'supplier_order_status', width: 100 },
  { title: '操作', key: 'action', width: 100, fixed: 'right' }
]

const splitColumns: ColumnsType<JsonMap> = [
  { title: '拆分行ID', dataIndex: 'split_line_id', key: 'split_line_id', width: 100 },
  { title: '零件号', dataIndex: 'parts_number', key: 'parts_number', width: 110 },
  { title: '零件名称', dataIndex: 'parts_name', key: 'parts_name', ellipsis: true },
  { title: '子行数量', dataIndex: 'split_qty', key: 'split_qty', align: 'right', width: 90 },
  { title: '已发', dataIndex: 'shipped_qty', key: 'shipped_qty', align: 'right', width: 70 },
  { title: '已收', dataIndex: 'received_qty', key: 'received_qty', align: 'right', width: 70 },
  { title: '剩余可发', dataIndex: 'remaining_ship_qty', key: 'remaining_ship_qty', align: 'right', width: 90 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 130 },
  { title: '承诺到库', dataIndex: 'committed_date', key: 'committed_date', width: 110 },
]

const asnColumns: ColumnsType<JsonMap> = [
  { title: 'ASN单号', key: 'asn_no', width: 150 },
  { title: '创建时间', dataIndex: 'create_time', key: 'create_time', width: 160, customRender: ({ text }) => formatDate(text as string) },
  { title: '发货总数量', dataIndex: 'total_quantity', key: 'total_quantity', align: 'right' },
  { title: '实际发货时间', dataIndex: 'actual_eta_date', key: 'actual_eta_date', customRender: ({ text }) => formatDate(text as string) },
  { title: '实际到货时间', dataIndex: 'ship_date', key: 'ship_date', customRender: ({ text }) => formatDate(text as string) },
 { title: '进仓单号', key: 'warehouse_in_no', width: 120 },
  { title: '当前状态', key: 'status', width: 120 }
]

const receiptColumns: ColumnsType<JsonMap> = [
  { title: '入库单号', dataIndex: 'receipt_no', key: 'receipt_no', width: 150 },
  { title: '关联ASN号', dataIndex: 'asn_no', key: 'asn_no', width: 150 },
  { title: '收货日期', dataIndex: 'receipt_date', key: 'receipt_date', width: 140, customRender: ({ text }) => formatDate(text as string) },
  { title: '入库物料', dataIndex: 'parts_name', key: 'parts_name' },
  { title: '合格入库数量', dataIndex: 'qualified_quantity', key: 'qualified_quantity', align: 'right' },
  { title: '不良退货数量', dataIndex: 'rejected_quantity', key: 'rejected_quantity', align: 'right' },
  { title: '收货仓库', dataIndex: 'warehouse', key: 'warehouse' }
]

const auditColumns: ColumnsType<JsonMap> = [
  { title: '操作时间', dataIndex: 'operation_time', key: 'operation_time', width: 160, customRender: ({ text }) => formatDate(text as string) },
  { title: '操作人', dataIndex: 'operator', key: 'operator' },
  { title: '操作类型', dataIndex: 'operation_type', key: 'operation_type' },
  { title: '修改前值', dataIndex: 'old_value', key: 'old_value' },
  { title: '修改后值', dataIndex: 'new_value', key: 'new_value' }
]

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-'
  // 如果已经是 YYYY-MM-DD 格式（不含时间部分），直接返回
  if (dateStr.length === 10) return dateStr
  // 去掉时分秒，只保留年月日
  return dateStr.substring(0, 10)
}

// 工具函数（与 OrderManagementView 列表页保持一致）
function getOrderStatusColor(status: string | number | undefined): TagColor {
  const colorMap: Record<number, string> = {
    0: 'orange',
    20: 'green',
    25: 'blue',
    30: 'cyan',
    40: 'gray',
    90: 'red'
  }
  return colorMap[Number(status)] || 'default'
}

function getOrderStatusText(status: string | number | undefined) {
  const textMap: Record<number, string> = {
    0: '待确认',
    20: '已确认',
    25: '部分发运',
    30: '已发运',
    40: '已结案',
    90: '已驳回'
  }
  return textMap[Number(status)] || '待确认'
}

function getAsnStatusColor(status: string | number | undefined): TagColor {
  if (status === 1) return 'blue'
  if (status === 2) return 'green'
  if (status === 3) return 'orange'
  return 'gray'
}

function getAsnStatusText(status: string | number | undefined) {
  if (status === "SHIPPED") return '已发货'
  if (status === 2) return '部分签收'
  if (status === 3) return '已签收'
  return '草稿'
}

function getDetailStatusColor(status: string | number | undefined): TagColor {
  const colorMap: Record<number, string> = {
    0: 'orange',
    20: 'green',
  }
  return colorMap[Number(status)] || 'default'
}

function getDetailStatusText(status: string | number | undefined) {
  const textMap: Record<number, string> = {
    0: '待确认',
    20: '已确认',
  }
  return textMap[Number(status)] || '待确认'
}

// 确认零件
async function handleConfirmDetail(record: JsonMap) {
  const detailId = record.order_detail_id || record.id
  if (!detailId) {
    message.error('订单详情ID不存在')
    return
  }
  try {
    await confirmOrderDetail(String(detailId), session.userId)
    message.success('零件已确认')
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; friendlyMessage?: string }
    message.error(err.response?.data?.message || err.friendlyMessage || '确认失败')
  }
}

// 数据加载
async function loadOrderData() {
  try {
    const res = await getOrder(props.id, session.userId)
    order.value = res.order
    details.value = res.details.map((detail: JsonMap, index: number) => ({
      ...detail,
      line_no: index + 1,
      confirmed_quantity: detail.confirmed_quantity || detail.need_number,
      expected_delivery_date: detail.expected_delivery_date || detail.need_date,
      asn_quantity: detail.asn_quantity || 0,
      in_transit_quantity: detail.in_transit_quantity || 0,
      received_quantity: detail.received_quantity || 0
    }))
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; friendlyMessage?: string }
    error.value = err.response?.data?.message || err.friendlyMessage || '加载失败'
  }
}

async function loadAsnData() {
  try {
    asnList.value = await getOrderAsnList(props.id, session.userId)
  } catch (e) {
    console.error('加载ASN数据失败:', e)
    asnList.value = []
  }
}

async function loadSplitLinesData() {
  splitLinesLoading.value = true
  try {
    splitLines.value = await listOrderSplitLines(props.id, session.userId)
  } catch (e) {
    console.error('加载拆分行失败:', e)
    splitLines.value = []
  } finally {
    splitLinesLoading.value = false
  }
}

async function loadReceiptData() {
  try {
    receiptList.value = await getOrderReceipts(props.id, session.userId)
  } catch (e) {
    console.error('加载收货数据失败:', e)
    receiptList.value = []
  }
}

async function loadTimelineData() {
  try {
    timeline.value = await getOrderTimeline(props.id, session.userId)
  } catch (e) {
    console.error('加载时间轴数据失败:', e)
    timeline.value = []
  }
}

async function loadAuditData() {
  try {
    auditLog.value = await getOrderAuditLog(props.id, session.userId)
  } catch (e) {
    console.error('加载审计日志失败:', e)
    auditLog.value = []
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    await Promise.all([
      loadOrderData(),
      loadAsnData(),
      loadSplitLinesData(),
      loadReceiptData(),
      loadTimelineData(),
      loadAuditData()
    ])
  } finally {
    loading.value = false
  }
}

// 事件处理
function handleSubmitOrder() {
  submitModal.reason = ''
  submitModal.open = true
}

async function doSubmitOrder() {
  submitModal.loading = true
  try {
    await confirmOrder(orderIdNum.value, session.userId, submitModal.reason || undefined)
    message.success('订单已确认')
    submitModal.open = false
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; friendlyMessage?: string }
    message.error(err.response?.data?.message || err.friendlyMessage || '确认失败')
  } finally {
    submitModal.loading = false
  }
}

function splitLine(record: JsonMap) {
  splitModal.record = record
  splitModal.splitQuantity1 = Math.floor(Number(record.need_number) / 2)
  splitModal.splitQuantity2 = Number(record.need_number) - splitModal.splitQuantity1
  splitModal.expectedDate1 = record.need_date as string
  splitModal.expectedDate2 = record.need_date as string
  splitModal.open = true
}

function orderConfirmedAlready() {
  const s = order.value?.order_status
  return s === 20 || String(s) === '20'
}

async function doSplitLine() {
  if (!splitModal.record) return

  const totalSplit = splitModal.splitQuantity1 + splitModal.splitQuantity2
  if (totalSplit !== Number(splitModal.record.need_number)) {
    message.error('拆分数量总和必须等于原始订单数量')
    return
  }

  if (!splitModal.expectedDate1 || !splitModal.expectedDate2) {
    message.error('请选择预计到库日期')
    return
  }

  const uid = session.operatorUserId
  if (!Number.isFinite(uid)) {
    message.error('会话无效')
    return
  }

  splitModal.loading = true
  try {
    await confirmAndSplit(props.id, {
      operatorUserId: uid,
      detailId: Number(splitModal.record.id),
      action: 'SPLIT_AND_CONFIRM',
      confirmOrderHeader: !orderConfirmedAlready(),
      splitLines: [
        { splitQty: splitModal.splitQuantity1, committedDate: splitModal.expectedDate1 },
        { splitQty: splitModal.splitQuantity2, committedDate: splitModal.expectedDate2 },
      ],
    })
    message.success('拆单确认已保存（ASN.md 拆分行）')
    splitModal.open = false
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; friendlyMessage?: string }
    message.error(err.response?.data?.message || err.friendlyMessage || '拆分失败')
  } finally {
    splitModal.loading = false
  }
}

function viewAsnDetail(record: JsonMap) {
  router.push(`/asn/${record.id}`)
}

function seedDefaultSplits() {
  // 这里可以实现初始化拆分行的逻辑
  message.info('初始化拆分行功能开发中')
}

// 初始加载
load()
</script>

<style scoped>
  @media (max-width: 768px) {
    :deep(.ant-layout-sider) {
      width: 100% !important;
      margin-right: 0 !important;
    }
    :deep(.ant-layout-content) {
      width: 100% !important;
    }
  }
</style>