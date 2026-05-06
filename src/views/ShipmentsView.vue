<template>
  <div class="srm-page">
    <div class="srm-card-title">发运信息管理</div>

    <a-layout style="background: #fff; padding: 16px; border-radius: 8px;">
      <!-- 左侧查询区域 -->
      <a-layout-sider width="350" style="background: #fafafa; padding: 16px; border-radius: 8px; margin-right: 16px;">
        <a-card title="查询条件" size="small">
          <a-form layout="vertical">
            <!-- <a-form-item label="发运批次号（支持多行/逗号）">
              <a-textarea v-model:value="form.asnNos" :rows="3" placeholder="ASN1001&#10;ASN1002" />
            </a-form-item>
            <a-form-item label="供应商 Duns（支持多行/逗号）">
              <a-textarea v-model:value="form.supplierDuns" :rows="2" placeholder="供应商唯一编码" />
            </a-form-item>
            <a-form-item label="系统订单号（支持多行/逗号）">
              <a-textarea v-model:value="form.systemOrderNos" :rows="2" placeholder="PO 系统流水号" />
            </a-form-item>
            <a-form-item label="SAP 订单号（支持多行/逗号）">
              <a-textarea v-model:value="form.sapOrderNos" :rows="2" placeholder="SAP 底层订单号（当前先按 order_no 兼容）" />
            </a-form-item> -->
            <a-form-item label="供应商是否发运">
              <a-select v-model:value="form.shippedFlag" :options="shippedOptions" />
            </a-form-item>
            <a-form-item label="零件号（支持多行/逗号）">
              <a-textarea v-model:value="form.partsNos" :rows="2" placeholder="物料编码" />
            </a-form-item>
            <a-form-item label="实际到货日期">
              <a-date-picker v-model:value="form.actualEtaDate" format="YYYY-MM-DD" style="width: 100%" placeholder="选择日期" />
            </a-form-item>
            <a-space>
              <a-button type="primary" :loading="loading" @click="onSearch">查询</a-button>
              <a-button @click="onReset">重置</a-button>
            </a-space>
          </a-form>
        </a-card>
      </a-layout-sider>

      <!-- 右侧列表区域 -->
      <a-layout-content style="flex: 1;">
        <a-card size="small">
          <template #title>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <span>发运列表</span>
              <a-space>
                <a-button :disabled="rows.length === 0" @click="downloadCsv">下载</a-button>
                <!-- <a-button disabled>更新ASN发运状态</a-button> -->
              </a-space>
            </div>
          </template>

          <a-alert v-if="error" type="error" :message="error" show-icon style="margin-bottom: 12px" />

          <a-table
            :columns="columns"
            :data-source="rows"
            :loading="loading"
            row-key="asn_id"
            :pagination="false"
            size="middle"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'actions'">
                <a-space>
                  <a-button type="link" v-if="session.isSupplierClient && !isLocked(record)" @click="openShip(record)">发货</a-button>
                  <a-button type="link" v-if="session.isSupplierClient && !isLocked(record)" @click="openShip(record)">修改</a-button>
                  <a-button type="link" danger v-if="session.isSupplierClient && !isLocked(record)" @click="doDelete(record)">删除</a-button>
                </a-space>
              </template>
              <template v-else-if="column.key === 'asn_no'">
                <router-link :to="{ name: 'asn-detail', params: { id: String(record.asn_id) } }">
                  {{ record.asn_no }}
                </router-link>
              </template>
              <template v-else-if="column.key === 'asnStatus'">
                <a-tag :color="statusColor(String(record.asnStatus || ''))">
                  {{ getAsnStatusText(String(record.asnStatus || '')) }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'shipDate'">
                {{ formatDate(record.shipDate) }}
              </template>
              <template v-else-if="column.key === 'actualEtaDate'">
                {{ formatDate(record.actualEtaDate) }}
              </template>
            </template>
          </a-table>

          <div style="display:flex;justify-content:flex-end;margin-top:12px;">
            <a-pagination
              v-model:current="page"
              v-model:page-size="pageSize"
              :total="total"
              :show-size-changer="true"
              :show-total="(total) => `共 ${total} 条`"
              @change="onSearch"
              @showSizeChange="onSearch"
            />
          </div>
        </a-card>
      </a-layout-content>
    </a-layout>

    <!-- Ship Modal (字段与 deliver.md 保持一致口径) -->
    <a-modal v-model:open="shipOpen" title="发货确认" ok-text="确认发货" :confirm-loading="shipSubmitting" @ok="doShip">
      <a-form layout="vertical">
        <a-form-item label="操作人用户ID(operatorUserId)" required>
          <a-input v-model:value="shipForm.operatorUserId" placeholder="blade_user.id" />
        </a-form-item>
        <a-form-item label="本次发运数量" required>
          <a-input-number v-model:value="shipForm.shippedQty" style="width:100%" :min="1" />
        </a-form-item>
        <!-- <a-form-item label="送货工厂" required>
          <a-input v-model:value="shipForm.shipFromPlant" placeholder="如：YTPDC" />
        </a-form-item>
        <a-form-item label="需求工厂" required>
          <a-input v-model:value="shipForm.shipToPlant" placeholder="如：SHPC" />
        </a-form-item>
        <a-form-item label="SAP 发运号（可选）">
          <a-input v-model:value="shipForm.sapShipmentNo" placeholder="如：SHIP-Q4703980001" />
        </a-form-item>
        <a-form-item label="物流公司" required>
          <a-input v-model:value="shipForm.logisticsCompany" />
        </a-form-item>
         -->
        <a-form-item label="实际发货时间" required>
          <a-date-picker v-model:value="shipForm.shipDate" style="width:100%" />
        </a-form-item>
         <a-form-item label="实际到货实际" required>
          <a-date-picker v-model:value="shipForm.actualEtaDate" style="width:100%" />
        </a-form-item>
        <!-- <a-form-item label="进仓单号" required>
          <a-input v-model:value="shipForm.warehouseInNo" />
        </a-form-item> -->
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
import type { ColumnsType } from 'ant-design-vue/es/table'
import { message } from 'ant-design-vue'
import dayjs, { type Dayjs } from 'dayjs'
import { searchShipments, shipShipment, deleteAsn, type JsonMap } from '@/api/srm'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()

const loading = ref(false)
const error = ref('')
const rows = ref<JsonMap[]>([])
const total = ref(0)

const page = ref(1)
const pageSize = ref(10)

const form = reactive({
  asnNos: '',
  supplierDuns: '',
  systemOrderNos: '',
  sapOrderNos: '',
  shippedFlag: '' ,
  partsNos: '',
  actualEtaDate: null as Dayjs | null,
})

onMounted(() => {
  const qDate = route.query.actualEtaDate
  if (qDate && typeof qDate === 'string') {
    form.actualEtaDate = dayjs(qDate)
  }
  onSearch()
})

const shippedOptions = [
  { label: '全部', value: '' },
  { label: '是(已确认发运)', value: 'SHIPPED' },
  { label: '否(未确认)', value: 'CREATED' },
]

const columns: ColumnsType<JsonMap> = [
  { title: '操作', key: 'actions', width: 160, fixed: 'left' },
  { title: '本次发运数量', dataIndex: 'shippedQty', key: 'shippedQty', width: 120 },
  { title: '送货地址', dataIndex: 'storageName', key: 'storageName', width: 100 },
  { title: '实际发货时间', dataIndex: 'shipDate', key: 'shipDate', width: 180 },
  { title: '实际到货时间', dataIndex: 'actualEtaDate', key: 'actualEtaDate', width: 180 },
  { title: '发运确认状态', dataIndex: 'asnStatus', key: 'asnStatus', width: 110 },
  { title: '供应商名称', dataIndex: 'supplierName', key: 'supplierName', width: 140 },
  { title: '发运批次号', dataIndex: 'asnNo', key: 'asnNo', width: 140 },
  { title: '发运零件号', dataIndex: 'partsNo', key: 'partsNo', width: 140 },
  { title: '进仓单号', dataIndex: 'warehouseInNo', key: 'warehouseInNo', width: 140 },
]

function statusColor(status: string) {
  if (status === 'SHIPPED') return 'blue'
  if (status === 'CREATED') return 'default'
  if (status.includes('RECEIVED')) return 'green'
  return 'default'
}

function getAsnStatusText(status: string) {
  const map: Record<string, string> = {
    'SHIPPED': '已确认发运',
    'CREATED': '待确认发运',
    'RECEIVED': '已到货',
    'CONFIRMED': '已确认',
  }
  return map[status] || status
}

function formatDate(date: string) {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

function isLocked(r: JsonMap) {
  const st = String(r.asnStatus || '')
  return st === 'SHIPPED' || st.includes('RECEIVED')
}

async function onSearch() {
  loading.value = true
  error.value = ''
  try {
    const offset = (page.value - 1) * pageSize.value
    const result = await searchShipments({
      operatorUserId: session.userId,
      isAdmin: session.isAdmin,
      asnNos: form.asnNos,
      supplierDuns: form.supplierDuns,
      systemOrderNos: form.systemOrderNos,
      sapOrderNos: form.sapOrderNos,
      shippedFlag: form.shippedFlag,
      partsNos: form.partsNos,
      actualEtaDate: form.actualEtaDate ? form.actualEtaDate.format('YYYY-MM-DD') : undefined,
      limit: pageSize.value,
      offset,
    })
    rows.value = result.items
    total.value = result.total
  } catch (e: unknown) {
    error.value = (e as { friendlyMessage?: string }).friendlyMessage || '查询失败'
  } finally {
    loading.value = false
  }
}

function onReset() {
  form.asnNos = ''
  form.supplierDuns = ''
  form.systemOrderNos = ''
  form.sapOrderNos = ''
  form.shippedFlag = ''
  form.partsNos = ''
  page.value = 1
  onSearch()
}

function downloadCsv() {
  const cols = columns.filter((c) => c.key !== 'actions')
  const header = cols.map((c) => String(c.title)).join(',')
  const lines = rows.value.map((r) => {
    const v = (key: string) => {
      const val = (r as any)[key]
      const s = val == null ? '' : String(val)
      return '"' + s.replaceAll('"', '""') + '"'
    }
    return [
      v('shippedQty'),
      v('shipToAddress'),
      v('shipDate'),
      v('actualEtaDate'),
      v('asnStatus'),
      v('supplierName'),
      v('asnNo'),
      v('partsNo'),
      v('warehouseInNo'),
    ].join(',')
  })
  const csv = [header, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `shipments_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// Ship Modal
const shipOpen = ref(false)
const shipSubmitting = ref(false)
const shipAsnId = ref<number | null>(null)
const shipForm = reactive<{
  operatorUserId: string
  shippedQty: number,
  actualEtaDate:Dayjs | null,
  shipDate:Dayjs | null,
  warehouseInNo:string
}>({
  operatorUserId: session.userId||'',
  shippedQty: 1,
  actualEtaDate:dayjs(),
  shipDate: dayjs(),
  warehouseInNo:""
})

function openShip(r: JsonMap) {
  shipAsnId.value = Number((r as any).asnId)
  shipForm.operatorUserId = session.userId || ''
  shipForm.shippedQty = (r as any).shippedQty
  shipForm.warehouseInNo = (r as any).warehouseInNo
  shipForm.actualEtaDate = (r as any).actualEtaDate ? dayjs(String((r as any).actualEtaDate)) : dayjs()
  shipForm.shipDate = (r as any).shipDate ? dayjs(String((r as any).shipDate)) : dayjs()
  shipOpen.value = true
}

async function doShip() {
  console.log(shipForm)
  if (!session.userId || !session.userId.trim()) {
    message.error('当前未登录或session无效')
    return Promise.reject()
  }
  if (!shipAsnId.value) return Promise.reject()

  shipSubmitting.value = true
  try {
    await shipShipment(shipAsnId.value, {
      operatorUserId: session.userId,
      shippedQty: shipForm.shippedQty,
      actualEtaDate:shipForm.actualEtaDate?shipForm.actualEtaDate.format('YYYY-MM-DD'):"",
      shipDate: shipForm.shipDate?shipForm.shipDate.format('YYYY-MM-DD'):"",
      warehouseInNo:shipForm.warehouseInNo,
      
    })
    message.success('已确认发货')
    shipOpen.value = false
    await onSearch()
  } catch (e: unknown) {
    message.error((e as { friendlyMessage?: string }).friendlyMessage || '发货失败')
  } finally {
    shipSubmitting.value = false
  }
}

async function doDelete(record: JsonMap) {
  const asnId = Number((record as any).asnId || (record as any).id)
  if (!Number.isFinite(asnId)) {
    message.error('无效的 ASN ID')
    return
  }
  const uid = session.userId
  if (!uid) {
    message.error('会话无效')
    return
  }
  try {
    await deleteAsn(asnId, uid)
    message.success('发运单 已删除')
    await onSearch()
  } catch (e: unknown) {
    message.error((e as { friendlyMessage?: string; response?: { data?: { message?: string } } }).response?.data?.message || (e as { friendlyMessage?: string }).friendlyMessage || '删除失败')
  }
}
</script>