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
        <!-- <template v-if="column.key === 'invoiceDate'">
          {{ formatDate(record.invoiceDate) }}
        </template> -->
        <template v-if="column.key === 'status'">
          <a-tag :color="statusColor(record.status)">
            {{ statusText(record.status) }}
          </a-tag>
        </template>
        <template v-if="column.key === 'action'">
          <a @click="viewDetails(record)">查看明细</a>
        </template>
        <template v-if="column.key === 'createTime'">
          {{ formatDate(record.createTime) }}
        </template>
      </template>
    </a-table>

    <!-- 明细弹窗 -->
    <a-modal
      v-model:open="detailModalVisible"
      title="结算单明细"
      width="900px"
    >
      <template #footer>
        <a-button @click="detailModalVisible = false">关闭</a-button>
        <a-button v-if="currentDetail?.status === 0" danger @click="confirmDelete">删除</a-button>
        <a-button v-if="currentDetail?.status === 0" type="primary" @click="confirmSubmit">提交结算单</a-button>
      </template>
      <a-table
        :columns="invoiceColumns"
        :data-source="invoiceList"
        :pagination="false"
        row-key="id"
        size="small"
        style="margin-bottom: 16px"
      >
        <template #title>发票明细</template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'taxAmount'">
            {{ Number(record.taxAmount || 0).toFixed(2) }}
          </template>
          <template v-if="column.key === 'totalAmount'">
            {{ Number(record.totalAmount || 0).toFixed(2) }}
          </template>
          <template v-if="column.key === 'attachment'">
            <a v-if="record.attachmentUrl" href="javascript:void(0)" @click="downloadFile(record.attachmentUrl, record.attachmentName)">{{ record.attachmentName || '下载附件' }}</a>
            <span v-else>-</span>
          </template>
        </template>
      </a-table>
      <a-table
        :columns="detailColumns"
        :data-source="detailList"
        :pagination="false"
        row-key="id"
        size="small"
      >
        <template #title>验收明细</template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'quantity'">
            {{ Number(record.quantity || 0).toFixed(2) }}
          </template>
          <template v-if="column.key === 'amount'">
            {{ Number(record.amount || 0).toFixed(2) }}
          </template>
        </template>
      </a-table>

      <!-- 完工单附件 -->
      <div v-if="completionFileList.length > 0" style="margin-top: 16px">
        <div style="font-weight: bold; margin-bottom: 8px">完工单附件：</div>
        <div v-for="file in completionFileList" :key="file.id">
          <a href="javascript:void(0)" @click="downloadFile(file.url, file.name)">{{ file.name }}</a>
        </div>
        <div v-if="completionFileList.length === 0" style="color: #999">无</div>
      </div>

      <!-- 备注 -->
      <div v-if="settlementRemark" style="margin-top: 16px">
        <div style="font-weight: bold; margin-bottom: 8px">备注：</div>
        <div>{{ settlementRemark }}</div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { listSettlementOrders, getSettlementDetails, downloadFile, submitSettlement, deleteSettlement } from '@/api/srm'
import { useSessionStore } from '@/stores/session'
import dayjs from 'dayjs'

const session = useSessionStore()

const loading = ref(false)
const dataList = ref<any[]>([])
const invoiceList = ref<any[]>([])
const detailList = ref<any[]>([])
const completionFileList = ref<any[]>([])
const settlementRemark = ref('')
const detailModalVisible = ref(false)
const currentDetail = ref<any>(null)

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

const invoiceColumns = [
  { title: '发票号码', dataIndex: 'invoiceNo', key: 'invoiceNo', width: 140 },
  { title: '开票日期', dataIndex: 'invoiceDate', key: 'invoiceDate', width: 120 },
  { title: '项目名称', dataIndex: 'projectName', key: 'projectName', width: 150 },
  { title: '零件号', dataIndex: 'partNo', key: 'partNo', width: 120 },
  { title: '税率', dataIndex: 'taxRate', key: 'taxRate', width: 80 },
  { title: '金额(不含税)', dataIndex: 'amount', key: 'amount', width: 120, align: 'right' },
  { title: '税额', dataIndex: 'taxAmount', key: 'taxAmount', width: 100, align: 'right' },
  { title: '价税合计', dataIndex: 'totalAmount', key: 'totalAmount', width: 120, align: 'right' },
  { title: '附件', key: 'attachment', width: 120 }
]

const detailColumns = [
  { title: '品名', dataIndex: 'partsName', key: 'partsName', width: 200 },
  { title: '详述及技术性能', dataIndex: 'remark', key: 'remark', width: 250 },
  { title: '零件号', dataIndex: 'partsNo', key: 'partsNo', width: 120 },
  { title: '验收单号', dataIndex: 'acceptApplyNo', key: 'acceptApplyNo', width: 200 },
  { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80, align: 'right' },
  { title: '金额', dataIndex: 'amount', key: 'amount', width: 120, align: 'right' },
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
    currentDetail.value = record
    const result = await getSettlementDetails(String(record.id))
    invoiceList.value = result.invoiceLines || []
    detailList.value = result.details || []
    completionFileList.value = result.completionFiles || []
    settlementRemark.value = result.remark || ''
    detailModalVisible.value = true
  } catch (e: any) {
    message.error(e.message || '加载明细失败')
  }
}

function confirmSubmit() {
  Modal.confirm({
    title: '确认提交',
    content: '提交后结算单将无法修改，确认提交吗？',
    async onOk() {
      try {
        await submitSettlement(String(currentDetail.value.id))
        message.success('提交成功')
        detailModalVisible.value = false
        loadData()
      } catch (e: any) {
        message.error(e.message || '提交失败')
      }
    }
  })
}

function confirmDelete() {
  Modal.confirm({
    title: '确认删除',
    content: '删除后无法恢复，确认删除吗？',
    async onOk() {
      try {
        await deleteSettlement(String(currentDetail.value.id))
        message.success('删除成功')
        detailModalVisible.value = false
        loadData()
      } catch (e: any) {
        message.error(e.message || '删除失败')
      }
    }
  })
}

onMounted(() => {
  loadData()
})
</script>
