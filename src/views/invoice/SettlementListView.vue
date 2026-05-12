<template>
  <div style="padding: 24px">
    <h2 style="margin-bottom: 16px">结算单列表</h2>

    <!-- 搜索表单 -->
    <a-form layout="inline" style="margin-bottom: 16px">
      <a-form-item label="结算单号">
        <a-input v-model:value="searchForm.settlementNo" placeholder="模糊搜索" style="width: 180px" />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" @click="loadData">查询</a-button>
        <a-button style="margin-left: 8px" @click="resetSearch">重置</a-button>
      </a-form-item>
    </a-form>

    <!-- 表格 -->
    <a-table
      :columns="columns"
      :data-source="dataList"
      :loading="loading"
      :pagination="pagination"
      @change="handleTableChange"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'invoiceTotalAmount'">
          ¥{{ Number(record.invoiceTotalAmount || 0).toFixed(2) }}
        </template>
        <template v-if="column.key === 'invoiceDate'">
          {{ formatDate(record.invoiceDate) }}
        </template>
        <template v-if="column.key === 'status'">
          <a-tag :color="statusColor(record.status)">
            {{ statusText(record.status) }}
          </a-tag>
        </template>
        <template v-if="column.key === 'action'">
          <a @click="viewDetails(record)">查看明细</a>
        </template>
      </template>
    </a-table>

    <!-- 明细弹窗 -->
    <a-modal
      v-model:open="detailModalVisible"
      title="结算单明细"
      width="800px"
      :footer="null"
    >
      <a-table
        :columns="detailColumns"
        :data-source="detailList"
        :pagination="false"
        row-key="id"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'quantity'">
            {{ Number(record.quantity || 0).toFixed(2) }}
          </template>
          <template v-if="column.key === 'amount'">
            {{ Number(record.amount || 0).toFixed(2) }}
          </template>
          <template v-if="column.key === 'totalAmount'">
            {{ Number(record.totalAmount || 0).toFixed(2) }}
          </template>
        </template>
      </a-table>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { listSettlementOrders, getSettlementDetails } from '@/api/srm'
import { useSessionStore } from '@/stores/session'
import dayjs from 'dayjs'

const session = useSessionStore()

const loading = ref(false)
const dataList = ref<any[]>([])
const detailList = ref<any[]>([])
const detailModalVisible = ref(false)

const searchForm = reactive({
  settlementNo: ''
})

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0
})

const columns = [
  { title: '结算单号', dataIndex: 'settlementNo', key: 'settlementNo', width: 180 },
  { title: '供应商编号', dataIndex: 'supplierNo', key: 'supplierNo', width: 120 },
  { title: '供应商名称', dataIndex: 'supplierName', key: 'supplierName', width: 200 },
  { title: '发票号码', dataIndex: 'invoiceNo', key: 'invoiceNo', width: 150 },
  { title: '开票日期', dataIndex: 'invoiceDate', key: 'invoiceDate', width: 120 },
  { title: '价税合计', dataIndex: 'invoiceTotalAmount', key: 'invoiceTotalAmount', width: 120, align: 'right' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 160 },
  { title: '操作', key: 'action', width: 100 }
]

const detailColumns = [
  { title: '零件号', dataIndex: 'partsNo', key: 'partsNo' },
  { title: '零件名称', dataIndex: 'partsName', key: 'partsName' },
  { title: '验收单号', dataIndex: 'acceptApplyNo', key: 'acceptApplyNo' },
  { title: '数量', dataIndex: 'quantity', key: 'quantity', align: 'right' },
  { title: '金额', dataIndex: 'amount', key: 'amount', align: 'right' },
  { title: '价税合计', dataIndex: 'totalAmount', key: 'totalAmount', align: 'right' }
]

function statusText(status: number) {
  const map: Record<number, string> = {
    0: '草稿',
    1: '已提交',
    2: '已核准',
    3: '已开票',
    4: '已付款'
  }
  return map[status] || '未知'
}

function statusColor(status: number) {
  const map: Record<number, string> = {
    0: 'default',
    1: 'processing',
    2: 'success',
    3: 'warning',
    4: 'success'
  }
  return map[status] || 'default'
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return dayjs(dateStr).format('YYYY-MM-DD')
}

async function loadData() {
  loading.value = true
  try {
    const result = await listSettlementOrders({
      userId: session.operatorUserId,
      settlementNo: searchForm.settlementNo || undefined,
      pageSize: pagination.pageSize,
      pageNum: pagination.current
    })
    dataList.value = result.items || []
    pagination.total = result.total || 0
  } catch (e: any) {
    message.error(e.message || '加载数据失败')
  } finally {
    loading.value = false
  }
}

function handleTableChange(pag: any) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadData()
}

function resetSearch() {
  searchForm.settlementNo = ''
  loadData()
}

async function viewDetails(record: any) {
  try {
    const result = await getSettlementDetails(String(record.id))
    detailList.value = result.details || []
    detailModalVisible.value = true
  } catch (e: any) {
    message.error(e.message || '加载明细失败')
  }
}

onMounted(() => {
  loadData()
})
</script>
