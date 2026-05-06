<template>
  <div class="srm-page">
    <div class="srm-card-title">发货通知 (ASN) 列表</div>
    
    <a-layout style="background: #fff; padding: 16px; border-radius: 8px;">
      <!-- 左侧空白区域（预留未来查询条件） -->
      <a-layout-sider width="300" style="background: #fafafa; padding: 16px; border-radius: 8px; margin-right: 16px;">
        <div class="query-section">
          <h3 style="margin-bottom: 16px; font-size: 16px; font-weight: 500;">查询条件</h3>
          <p style="color: #64748b; font-size: 14px;">暂无查询条件，可在此添加</p>
        </div>
      </a-layout-sider>

      <!-- 右侧列表区域 -->
      <a-layout-content style="flex: 1;">
        <a-table
          :columns="columns"
          :data-source="rows"
          :loading="loading"
          row-key="id"
          :pagination="pagination"
          @change="handleTableChange"
          size="middle"
        >
          <template #bodyCell="{ column, record, text }">
            <template v-if="column.key === 'status'">
              <a-tag :color="getStatusColor(text)">
                {{ getStatusText(text) }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="link" @click="goDetail(record)">详情</a-button>
              <a-button type="link" @click="openPacking(record)">箱单</a-button>
            </template>
          </template>
        </a-table>
      </a-layout-content>
    </a-layout>
    <!-- 箱单弹窗 -->
    <PackingListModal ref="packingModalRef" :asn-id="currentAsnId" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { listAsns, type JsonMap } from '@/api/srm'
import PackingListModal from '@/components/PackingListModal.vue'
import type { ColumnsType, TablePaginationConfig } from 'ant-design-vue/es/table'

const router = useRouter()
const session = useSessionStore()
const loading = ref(false)
const rows = ref<JsonMap[]>([])
const packingModalRef = ref<InstanceType<typeof PackingListModal> | null>(null)
const currentAsnId = ref(0)

const pagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
})

const columns: ColumnsType<JsonMap> = [
  { title: ' 单号', dataIndex: 'asn_no', key: 'asn_no' },
  { title: '物流公司', dataIndex: 'logistics_company', key: 'logistics_company' },
  { title: '运单号', dataIndex: 'tracking_no', key: 'tracking_no' },
  { title: '预计到货日期', dataIndex: 'eta_date', key: 'eta_date' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '创建时间', dataIndex: 'create_time', key: 'create_time' },
  { title: '操作', key: 'action', width: 140 },
]

async function loadData() {
  loading.value = true
  try {
    const res = await listAsns(session.userId, pagination.pageSize, (pagination.current! - 1) * pagination.pageSize!)
    rows.value = res.items
    pagination.total = res.total
  } catch (e: any) {
    console.error('Failed to load ASNs:', e)
  } finally {
    loading.value = false
  }
}

function handleTableChange(pag: TablePaginationConfig) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadData()
}

function goDetail(record: JsonMap) {
  router.push({ name: 'asn-detail', params: { id: String(record.id) } })
}

function openPacking(record: JsonMap) {
  currentAsnId.value = Number(record.id)
  packingModalRef.value?.open()
}

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    'CREATED': 'blue',
    'SHIPPED': 'cyan',
    'RECEIVED': 'green',
    'INSPECTING': 'orange',
    'COMPLETED': 'green',
  }
  return map[status] || 'default'
}

function getStatusText(status: string) {
  const map: Record<string, string> = {
    'CREATED': '已创建',
    'SHIPPED': '已发货',
    'RECEIVED': '已签收',
    'INSPECTING': '质检中',
    'COMPLETED': '已完成',
  }
  return map[status] || status
}

onMounted(loadData)
</script>
