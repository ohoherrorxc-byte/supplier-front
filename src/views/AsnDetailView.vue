<template>
  <div class="srm-page">
    <a-breadcrumb style="margin-bottom: 16px">
      <a-breadcrumb-item><router-link to="/asn">发货通知</router-link></a-breadcrumb-item>
      <a-breadcrumb-item> 详情</a-breadcrumb-item>
    </a-breadcrumb>
    <a-spin :spinning="loading">
      <a-alert v-if="error" type="error" :message="error" show-icon style="margin-bottom: 16px" />
      <template v-else-if="asn">
        <a-layout style="background: #fff; padding: 16px; border-radius: 8px;">
          <!-- 左侧基本信息区域 -->
          <a-layout-sider width="400" style="background: #fafafa; padding: 16px; border-radius: 8px; margin-right: 16px;">
            <a-card title="发货通知" size="small">
              <a-descriptions bordered size="small" :column="1">
                <a-descriptions-item label="单号">{{ asn.asnNo }}</a-descriptions-item>
                <a-descriptions-item label="供应商 ID">{{ asn.supplierId }}</a-descriptions-item>
                <a-descriptions-item label="物流公司">{{ asn.logisticsCompany }}</a-descriptions-item>
                <a-descriptions-item label="运单号">{{ asn.trackingNo }}</a-descriptions-item>
                <a-descriptions-item label="ETA">{{ asn.etaDate }}</a-descriptions-item>
                <a-descriptions-item label="状态">{{ asn.status }}</a-descriptions-item>
                <a-descriptions-item label="关联订单 ID">{{ (asn.orderIds as unknown[])?.join(', ') }}</a-descriptions-item>
              </a-descriptions>
            </a-card>
          </a-layout-sider>

          <!-- 右侧明细行与时间轴区域 -->
          <a-layout-content style="flex: 1;">
            <a-card v-if="asnLines.length" title=" 明细行（挂拆分行）" size="small" style="margin-bottom: 16px">
              <a-table :columns="lineColumns" :data-source="asnLines" row-key="rowKey" size="small" :pagination="false">
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'recv'">
                    <a-space>
                      <a-input-number v-model:value="record._recvQty" :min="1" :max="recvMax(record)" size="small" />
                      <a-button size="small" type="link" :loading="record._recvLoading" @click="doReceive(record)">
                        登记收货
                      </a-button>
                    </a-space>
                  </template>
                  <template v-else-if="column.key === 'packing'">
                    <a-button size="small" type="link" @click="openPacking(record)">
                      箱单信息
                    </a-button>
                  </template>
                </template>
              </a-table>
            </a-card>

            <div class="srm-card-title">货物跟踪时间轴</div>
            <p style="color: #64748b; margin-bottom: 12px">对应 PRD SRM-004；当前为  侧事件，后续可接 ERP 在途/签收/入库。</p>
            <a-timeline v-if="timeline.length">
              <a-timeline-item v-for="(t, i) in timeline" :key="i">
                <strong>{{ t.event }}</strong>
                <div style="color: #64748b">{{ t.description }}</div>
                <div style="font-size: 12px; color: #94a3b8">{{ t.time }}</div>
              </a-timeline-item>
            </a-timeline>
            <a-empty v-else description="暂无轨迹" />
          </a-layout-content>
        </a-layout>
      </template>
    </a-spin>
    <!-- 箱单弹窗 -->
    <PackingListModal ref="packingModalRef" :asn-id="currentAsnId" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useSessionStore } from '@/stores/session'
import { getAsn, getAsnTimeline, receiveAsnLine, type JsonMap } from '@/api/srm'
import { message } from 'ant-design-vue'
import type { ColumnsType } from 'ant-design-vue/es/table'
import PackingListModal from '@/components/PackingListModal.vue'

const props = defineProps<{ id: string }>()
const session = useSessionStore()
const loading = ref(false)
const error = ref('')
const asn = ref<JsonMap | null>(null)
const timeline = ref<JsonMap[]>([])
const packingModalRef = ref<InstanceType<typeof PackingListModal> | null>(null)

const currentAsnId = computed(() => Number(props.id))

type AsnLineRow = JsonMap & { rowKey: string; _recvQty: number; _recvLoading?: boolean }

const asnLines = computed<AsnLineRow[]>(() => {
  const raw = asn.value?.asnLines
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.map((row: JsonMap, i: number) => {
    const id = row.asn_line_id ?? row.asnLineId
    const shipped = Number(row.shipped_qty ?? row.shippedQty ?? 0)
    const received = Number(row.received_qty ?? row.receivedQty ?? 0)
    const maxR = Math.max(0, shipped - received)
    return {
      ...row,
      rowKey: String(id ?? i),
      asn_line_id: id,
      shipped_qty: shipped,
      received_qty: received,
      _recvQty: maxR > 0 ? maxR : 1,
    } as AsnLineRow
  })
})

const lineColumns: ColumnsType<AsnLineRow> = [
  { title: '明细行ID', dataIndex: 'asn_line_id', key: 'asn_line_id', width: 100 },
  { title: '拆分行ID', dataIndex: 'split_line_id', key: 'split_line_id', width: 100 },
  { title: '发货数量', dataIndex: 'shipped_qty', key: 'shipped_qty', align: 'right', width: 90 },
  { title: '已收数量', dataIndex: 'received_qty', key: 'received_qty', align: 'right', width: 90 },
  { title: '收货', key: 'recv', width: 220 },
  { title: '操作', key: 'packing', width: 100 },
]

function recvMax(record: AsnLineRow) {
  const shipped = Number(record.shipped_qty ?? 0)
  const received = Number(record.received_qty ?? 0)
  const m = shipped - received
  return m > 0 ? m : 1
}

async function doReceive(record: AsnLineRow) {
  const lineId = Number(record.asn_line_id)
  if (!Number.isFinite(lineId)) {
    message.error('无效明细行')
    return
  }
  const uid = session.operatorUserId
  if (!Number.isFinite(uid)) {
    message.error('会话无效')
    return
  }
  const q = Number(record._recvQty)
  if (!Number.isFinite(q) || q < 1) {
    message.warning('收货数量无效')
    return
  }
  if (q > recvMax(record)) {
    message.error('超过本行可收数量')
    return
  }
  record._recvLoading = true
  try {
    await receiveAsnLine(lineId, { operatorUserId: uid, receivedQty: q })
    message.success('已登记收货')
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; friendlyMessage?: string }
    message.error(err.response?.data?.message || err.friendlyMessage || '收货失败')
  } finally {
    record._recvLoading = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const asnId = Number(props.id)
    asn.value = await getAsn(asnId, session.userId)
    timeline.value = await getAsnTimeline(asnId, session.userId)
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; friendlyMessage?: string }
    error.value = err.response?.data?.message || err.friendlyMessage || '加载失败'
  } finally {
    loading.value = false
  }
}

async function openPacking(record: AsnLineRow) {
  packingModalRef.value?.open()
}

onMounted(load)
watch(() => props.id, load)
</script>
