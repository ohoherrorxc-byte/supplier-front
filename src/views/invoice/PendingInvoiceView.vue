<template>
  <div style="padding: 24px">
    <h2 style="margin-bottom: 16px">待开票清单</h2>

    <a-tabs v-model:activeKey="activeTab" @change="onTabChange">
      <a-tab-pane key="general" tab="一般采购" />
      <a-tab-pane key="bom" tab="BOM采购" />
    </a-tabs>

    <!-- 顶部操作栏 -->
    <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center">
      <div>
        <span style="color: #666">
          已选择 {{ selectedRows.length }} 条，合计金额：
          <strong style="color: #1890ff; font-size: 16px">¥{{ totalSelectedAmount.toFixed(2) }}</strong>
        </span>
      </div>
      <div>
        <a-button type="primary" :disabled="selectedRows.length === 0" @click="onGenerateSettlement">
          生成结算单
        </a-button>
      </div>
    </div>

    <!-- 搜索表单 -->
    <a-form layout="inline" style="margin-bottom: 16px">
      <a-form-item label="零件号">
        <a-input v-model:value="searchForm.partsNo" placeholder="模糊搜索" style="width: 160px" />
      </a-form-item>
      <a-form-item label="零件名称">
        <a-input v-model:value="searchForm.partsName" placeholder="模糊搜索" style="width: 160px" />
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
      :row-selection="rowSelection"
      @change="handleTableChange"
      row-key="acceptDetailId"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'quantity'">
          {{ Number(record.quantity || 0).toFixed(2) }}
        </template>
        <template v-if="column.key === 'amount'">
          {{ Number(record.amount || 0).toFixed(2) }}
        </template>
        <template v-if="column.key === 'acceptDate'">
          {{ formatDate(record.acceptDate) }}
        </template>
      </template>
    </a-table>

    <!-- 底部操作栏 -->
    <div style="margin-top: 16px; display: flex; justify-content: space-between">
      <div>
        <span style="color: #666">
          已选择 {{ selectedRows.length }} 条，合计金额：
          <strong style="color: #1890ff; font-size: 16px">¥{{ totalSelectedAmount.toFixed(2) }}</strong>
        </span>
      </div>
      <div>
        <a-button type="primary" :disabled="selectedRows.length === 0" @click="onGenerateSettlement">
          生成结算单
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { listPendingInvoiceGeneral, listPendingInvoiceBom } from '@/api/srm'
import { useSessionStore } from '@/stores/session'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()
const session = useSessionStore()

const activeTab = ref('bom')
const loading = ref(false)
const dataList = ref<any[]>([])
const selectedRows = ref<any[]>([])
const selectedRowKeys = ref<any[]>([])

const searchForm = reactive({
  partsNo: '',
  partsName: ''
})

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`
})

const columns = [
  { title: '选择', key: 'selection', width: 60 },
  { title: '验收申请编号', dataIndex: 'acceptApplyNo', key: 'acceptApplyNo', width: 150 },
  { title: '零件号', dataIndex: 'partsNo', key: 'partsNo', width: 120 },
  { title: '零件名称', dataIndex: 'partsName', key: 'partsName', width: 180 },
  { title: '详述及技术性能', dataIndex: 'remark', key: 'remark', width: 200 },
  { title: '订单号', dataIndex: 'contractNo', key: 'contractNo', width: 150 },
  { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 100, align: 'right' },
  { title: '金额', dataIndex: 'amount', key: 'amount', width: 120, align: 'right' },
  { title: '供应商编号', dataIndex: 'supplierNo', key: 'supplierNo', width: 120 },
  { title: '供应商名称', dataIndex: 'supplierName', key: 'supplierName', width: 200 },
  { title: '验收日期', dataIndex: 'acceptDate', key: 'acceptDate', width: 120 }
]

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: any[], rows: any[]) => {
    // 如果没有任何选择，直接通过
    if (rows.length === 0) {
      selectedRowKeys.value = keys
      selectedRows.value = rows
      return
    }

    // 检查所有选中行是否属于同一供应商
    const suppliers = [...new Set(rows.map(r => r.supplierNo).filter(Boolean))]

    // 只允许选择同一供应商
    if (suppliers.length > 1) {
      message.warning('只能选择同一供应商的明细进行结算')
      return
    }

    selectedRowKeys.value = keys
    selectedRows.value = rows
  }
}))

const totalSelectedAmount = computed(() => {
  return selectedRows.value.reduce((sum, row) => sum + Number(row.amount || 0), 0)
})

function onTabChange(tab: string) {
  console.log('=== onTabChange called, tab:', tab)
  // 跳转到对应的路由
  if (tab === 'general') {
    console.log('Navigating to invoice-pending-general')
    router.push({ name: 'invoice-pending-general' })
  } else {
    console.log('Navigating to invoice-pending-bom')
    router.push({ name: 'invoice-pending-bom' })
  }
  selectedRowKeys.value = []
  selectedRows.value = []
}

async function loadData() {
  loading.value = true
  try {
    const params = {
      userId: session.operatorUserId,
      partsNo: searchForm.partsNo || undefined,
      partsName: searchForm.partsName || undefined,
      pageSize: pagination.pageSize,
      pageNum: pagination.current
    }

    const result = activeTab.value === 'general'
      ? await listPendingInvoiceGeneral(params)
      : await listPendingInvoiceBom(params)

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
  searchForm.partsNo = ''
  searchForm.partsName = ''
  loadData()
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return dayjs(dateStr).format('YYYY-MM-DD')
}

function onGenerateSettlement() {
  if (selectedRows.value.length === 0) {
    message.warning('请先选择要结算的明细')
    return
  }

  // 跳转到结算单创建页面，带上选中的数据
  router.push({
    name: 'invoice-settlement-create',
    query: {
      details: JSON.stringify(selectedRows.value),
      type: activeTab.value
    }
  })
}

onMounted(() => {
  updateTabFromRoute()
  loadData()
})

// 监听路由变化，刷新数据
watch(() => route.path, () => {
  updateTabFromRoute()
  loadData()
})

function updateTabFromRoute() {
  const path = route.path
  if (path.includes('/bom')) {
    activeTab.value = 'bom'
  } else {
    activeTab.value = 'general'
  }
}
</script>
