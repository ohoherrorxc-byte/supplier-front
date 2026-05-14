<template>
  <div class="srm-page">
    <div class="srm-card-title">创建发货通知 </div>
    <p style="color: #64748b; margin-bottom: 16px">
      推荐「按拆分行」创建，与
      <code>ASN.md</code> 一致（<code>POST /api/collaboration/asn/from-split-lines</code>）。需已执行
      <code>sql/create_tb_srm_asn.sql</code> 与 <code>sql/create_tb_srm_split_asn_line.sql</code>，并在订单侧维护拆分行。
    </p>
    <a-radio-group v-model:value="mode" style="margin-bottom: 16px">
      <a-radio-button value="split">按拆分行（推荐）</a-radio-button>
      <a-radio-button value="legacy">简易：仅选订单</a-radio-button>
    </a-radio-group>
    <a-alert v-if="forbidden" type="warning" :message="forbidden" show-icon style="margin-bottom: 16px" />
    <a-alert v-else-if="listError" type="error" :message="listError" show-icon style="margin-bottom: 16px" />

    <a-layout style="background: #fff; padding: 16px; border-radius: 8px;">
      <!-- 左侧订单选择区域 -->
      <a-layout-sider width="700" style="background: #fafafa; padding: 16px; border-radius: 8px; margin-right: 16px; overflow-y: auto;">
        <template v-if="mode === 'split'">
          <a-card title="① 选择已确认订单" size="small" style="margin-bottom: 16px">
            <a-table
              :row-selection="{ selectedRowKeys: selectedOrderKeys, onChange: onOrderSelectChange }"
              :columns="orderColumns"
              :data-source="orderRows"
              :loading="ordersLoading"
              row-key="id"
              :pagination="false"
              size="middle"
            />
            <div style="margin-top: 12px">
              <a-button type="primary" :loading="splitsLoading" :disabled="selectedOrderKeys.length === 0" @click="loadSplitLines">
                加载拆分行
              </a-button>
              <span v-if="splitLoadError" style="color: #ef4444; margin-left: 12px">{{ splitLoadError }}</span>
            </div>
          </a-card>
          <a-card title="② 拆分明细与本次发货数量" size="small" style="margin-bottom: 16px">
            <a-table
              :row-selection="{ selectedRowKeys: selectedSplitKeys, onChange: onSplitSelectChange }"
              :columns="splitColumns"
              :data-source="splitRows"
              :loading="splitsLoading"
              row-key="split_line_id"
              :pagination="false"
              size="middle"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'ship'">
                  <a-input-number
                    v-model:value="record._shipQty"
                    :min="1"
                    :max="maxShip(record)"
                    size="small"
                    style="width: 100%"
                  />
                </template>
              </template>
            </a-table>
          </a-card>
        </template>

        <template v-else>
          <a-card title="选择订单明细（旧版）" size="small" style="margin-bottom: 16px">
            <a-table
              :row-selection="{ selectedRowKeys, onChange: onSelectChange }"
              :columns="columns"
              :data-source="rows"
              :loading="loading"
              row-key="id"
              :pagination="false"
              size="middle"
            />
          </a-card>
        </template>
      </a-layout-sider>

      <!-- 右侧物流信息区域 -->
      <a-layout-content style="flex: 1;">
        <a-card title="物流信息" size="small">
          <a-form layout="vertical" :model="form" @finish="onSubmit">
            <a-form-item label="物流公司" name="logisticsCompany" :rules="[{ required: true, message: '必填' }]" required>
              <a-input v-model:value="form.logisticsCompany" placeholder="物流公司名称" />
            </a-form-item>
            <a-form-item label="运单号" name="trackingNo" :rules="[{ required: true, message: '必填' }]" required>
              <a-input v-model:value="form.trackingNo" />
            </a-form-item>
            <a-form-item label="预计到货日 (ETA)" name="etaDate" :rules="[{ required: true, message: '必选' }]" required>
              <a-date-picker v-model:value="etaDate" style="width: 100%" />
            </a-form-item>
            <a-form-item v-if="session.isSupplierClient">
              <a-button type="primary" html-type="submit" :loading="submitting">
                {{ mode === 'split' ? '按拆分行提交 ASN' : '提交 ASN（旧版）' }}
              </a-button>
            </a-form-item>
          </a-form>
        </a-card>
      </a-layout-content>
    </a-layout>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import dayjs, { type Dayjs } from 'dayjs'
import { useSessionStore } from '@/stores/session'
import {
  createAsn,
  createAsnFromSplitLines,
  listNewOrders,
  listOrderHeaders,
  listOrderSplitLines,
  type JsonMap,
} from '@/api/srm'
import { message } from 'ant-design-vue'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { Key } from 'ant-design-vue/es/table/interface'

const router = useRouter()
const route = useRoute()
const session = useSessionStore()
const mode = ref<'split' | 'legacy'>('split')

const loading = ref(false)
const submitting = ref(false)
const rows = ref<JsonMap[]>([])
const listError = ref('')
const forbidden = ref('')
const selectedRowKeys = ref<Key[]>([])

const ordersLoading = ref(false)
const splitsLoading = ref(false)
const orderRows = ref<JsonMap[]>([])
const selectedOrderKeys = ref<Key[]>([])
const splitRows = ref<SplitRow[]>([])
const selectedSplitKeys = ref<Key[]>([])
const splitLoadError = ref('')

type SplitRow = JsonMap & {
  split_line_id: Key
  _shipQty: number
}

const form = reactive({
  logisticsCompany: '',
  trackingNo: '',
})
const etaDate = ref<Dayjs | undefined>(dayjs())

const orderColumns: ColumnsType<JsonMap> = [
  { title: '订单号', dataIndex: 'order_no', key: 'order_no' },
  { title: '状态', dataIndex: 'supplier_order_status', key: 'supplier_order_status', width: 90 },
  { title: '订单日期', dataIndex: 'order_date', key: 'order_date', width: 170 },
]

const splitColumns: ColumnsType<SplitRow> = [
  { title: '订单号', dataIndex: 'order_no', key: 'order_no', width: 140 },
  { title: '拆分行ID', dataIndex: 'split_line_id', key: 'split_line_id', width: 100 },
  { title: '零件号', dataIndex: 'parts_number', key: 'parts_number', width: 120 },
  { title: '拆分数量', dataIndex: 'split_qty', key: 'split_qty', align: 'right', width: 90 },
  { title: '已发', dataIndex: 'shipped_qty', key: 'shipped_qty', align: 'right', width: 70 },
  { title: '剩余可发', dataIndex: 'remaining_ship_qty', key: 'remaining_ship_qty', align: 'right', width: 90 },
  { title: '承诺到库', dataIndex: 'committed_date', key: 'committed_date', width: 110 },
  { title: '本次发货', key: 'ship', width: 120 },
]

const columns: ColumnsType<JsonMap> = [
  { title: '订单号', dataIndex: 'order_no', key: 'order_no' },
  { title: '零件号', dataIndex: 'parts_number', key: 'parts_number' },
  { title: '零件名称', dataIndex: 'parts_name', key: 'parts_name', ellipsis: true },
  { title: '需求数量', dataIndex: 'need_number', key: 'need_number', align: 'right' },
  { title: '要求到货日期', dataIndex: 'need_date', key: 'need_date', width: 160 },
]

function onSelectChange(keys: Key[]) {
  selectedRowKeys.value = keys
}

function onOrderSelectChange(keys: Key[]) {
  selectedOrderKeys.value = keys
}

function onSplitSelectChange(keys: Key[]) {
  selectedSplitKeys.value = keys
}

function maxShip(record: SplitRow) {
  const r = Number(record.remaining_ship_qty)
  return Number.isFinite(r) && r > 0 ? r : 1
}

async function loadOrderHeaders() {
  ordersLoading.value = true
  splitLoadError.value = ''
  try {
    const res = await listOrderHeaders({
      userId: session.userId,
      supplierOrderStatus: 20,
      limit: 200,
      offset: 0,
    })
    orderRows.value = res.items
    const pre = route.query.orderId as string
    if (pre && /^\d+$/.test(pre)) {
      const oid = Number(pre)
      const hit = orderRows.value.find((r) => Number(r.id) === oid)
      if (hit) {
        selectedOrderKeys.value = [hit.id as Key]
        await loadSplitLines()
      }
    }
  } catch (e: unknown) {
    const err = e as { response?: { status?: number; data?: { message?: string } }; friendlyMessage?: string }
    if (err.response?.status === 403) {
      forbidden.value = err.response?.data?.message || '无权限'
    } else {
      listError.value = err.friendlyMessage || '加载订单失败'
    }
  } finally {
    ordersLoading.value = false
  }
}

async function loadSplitLines() {
  if (selectedOrderKeys.value.length === 0) {
    message.warning('请先选择订单')
    return
  }
  splitsLoading.value = true
  splitLoadError.value = ''
  splitRows.value = []
  selectedSplitKeys.value = []
  // try {
  //   const merged: SplitRow[] = []
  //   for (const key of selectedOrderKeys.value) {
  //     const orderId = String(key)
  //     const header = orderRows.value.find((r) => String(r.id) === orderId)
  //     const orderNo = (header?.order_no as string) || orderId
  //     const items = await listOrderSplitLines(orderId, session.userId)
  //     for (const it of items) {
  //       const rem = Number(it.remaining_ship_qty ?? 0)
  //       merged.push({
  //         ...it,
  //         order_no: orderNo,
  //         _shipQty: rem > 0 ? rem : 1,
  //       } as SplitRow)
  //     }
  //   }
  //   splitRows.value = merged
  //   if (merged.length === 0) {
  //     splitLoadError.value = '所选订单下没有拆分行。请在订单详情中进行「拆单确认」或「初始化拆分行」。'
  //   } else {
  //     selectedSplitKeys.value = merged.filter((r) => maxShip(r) >= 1).map((r) => r.split_line_id)
  //   }
  // } catch (e: unknown) {
  //   const err = e as { response?: { data?: { message?: string } }; friendlyMessage?: string }
  //   splitLoadError.value = err.response?.data?.message || err.friendlyMessage || '加载拆分行失败'
  // } finally {
  //   splitsLoading.value = false
  // }
}

async function loadLegacyRows() {
  loading.value = true
  listError.value = ''
  forbidden.value = ''
  try {
    const res = await listNewOrders({
      userId: session.userId,
      supplierOrderStatus: 20,
      limit: 200,
      offset: 0,
    })
    rows.value = res.items
    const preselectedOrderIds = route.query.orderIds as string
    const isBatch = route.query.batch === 'true'
    if (preselectedOrderIds) {
      const orderIdList = preselectedOrderIds.split(',').map((id) => Number(id.trim()))
      const preselectedRows = rows.value.filter((row) => orderIdList.includes(Number(row.order_id)))
      selectedRowKeys.value = preselectedRows.map((row) => row.id as Key)
    } else if (!isBatch) {
      const preselectedOrderId = route.query.orderId as string
      if (preselectedOrderId) {
        const orderId = Number(preselectedOrderId)
        const preselectedRow = rows.value.find((row) => Number(row.order_id) === orderId)
        if (preselectedRow) {
          selectedRowKeys.value = [preselectedRow.id as Key]
        }
      }
    }
  } catch (e: unknown) {
    const err = e as { response?: { status?: number; data?: { message?: string } }; friendlyMessage?: string }
    if (err.response?.status === 403) {
      forbidden.value = err.response?.data?.message || '无权限'
    } else {
      listError.value = err.friendlyMessage || '加载订单失败'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadOrderHeaders()
  loadLegacyRows()
})

watch(mode, (m) => {
  if (m === 'legacy') {
    loadLegacyRows()
  } else {
    loadOrderHeaders()
  }
})

async function onSubmit() {
  const uid = session.operatorUserId
  if (!Number.isFinite(uid)) {
    message.error('会话无效')
    return
  }
  const eta = etaDate.value
  if (!eta) {
    message.warning('请选择 ETA')
    return
  }
  submitting.value = true
  try {
    if (mode.value === 'split') {
      if (selectedSplitKeys.value.length === 0) {
        message.warning('请选择拆分行并填写发货数量')
        return
      }
      const lines: { splitLineId: number; shippedQty: number }[] = []
      for (const key of selectedSplitKeys.value) {
        const row = splitRows.value.find((r) => String(r.split_line_id) === String(key))
        if (!row) continue
        const qty = Number(row._shipQty)
        const cap = maxShip(row)
        if (!Number.isFinite(qty) || qty < 1) {
          message.error(`拆分行 ${String(key)} 发货数量无效`)
          return
        }
        if (qty > cap) {
          message.error(`拆分行 ${String(key)} 超过剩余可发 ${cap}`)
          return
        }
        lines.push({ splitLineId: Number(key), shippedQty: qty })
      }
      if (lines.length === 0) {
        message.warning('没有有效的发货行')
        return
      }
      const res = await createAsnFromSplitLines({
        operatorUserId: uid,
        logisticsCompany: form.logisticsCompany.trim(),
        trackingNo: form.trackingNo.trim(),
        etaDate: eta.format('YYYY-MM-DD'),
        lines,
      })
      const asnId = res.asnId
      message.success('ASN 已创建（按拆分行）')
      if (asnId != null) {
        router.push({ name: 'asn-detail', params: { id: String(asnId) } })
      }
    } else {
      if (selectedRowKeys.value.length === 0) {
        message.warning('请至少选择一个订单')
        return
      }
      const selectedOrders = rows.value
        .filter((row) => selectedRowKeys.value.includes(row.id as Key))
        .map((row) => Number(row.order_id))
      const uniqueOrderIds = Array.from(new Set(selectedOrders))
      const res = await createAsn({
        operatorUserId: uid,
        orderIds: uniqueOrderIds,
        logisticsCompany: form.logisticsCompany.trim(),
        trackingNo: form.trackingNo.trim(),
        etaDate: eta.format('YYYY-MM-DD'),
      })
      const asnId = res.asnId
      message.success('ASN 已创建')
      if (asnId != null) {
        router.push({ name: 'asn-detail', params: { id: String(asnId) } })
      }
    }
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; friendlyMessage?: string }
    message.error(err.response?.data?.message || err.friendlyMessage || '创建失败')
  } finally {
    submitting.value = false
  }
}
</script>
