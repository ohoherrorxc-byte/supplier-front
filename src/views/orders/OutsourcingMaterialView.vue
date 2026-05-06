<template>
  <div class="outsourcing-material-view">
    <a-alert
      message="委外加工领料单说明"
      description="委外加工业务领料单为主机厂提供原材料，供应商负责加工的特殊场景。不仅展示加工成品的需求，还必须关联下挂 BOM（物料清单）明细表，清晰展示供应商需要从主机厂仓库领走的原材料编码及数量。"
      type="info"
      show-icon
      style="margin-bottom: 16px"
    />

    <a-layout style="background: #fff; padding: 16px; border-radius: 8px;">
      <!-- 左侧查询区域 -->
      <a-layout-sider width="300" style="background: #fafafa; padding: 16px; border-radius: 8px; margin-right: 16px;">
        <div class="query-section">
          <h3 style="margin-bottom: 16px; font-size: 16px; font-weight: 500;">查询条件</h3>
          <a-form :model="queryParams">
            <a-form-item label="订单号">
              <a-textarea 
                v-model:value="queryParams.orderNo" 
                placeholder="请输入订单号，支持批量输入（换行或逗号分隔）" 
                :rows="3"
                allow-clear 
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item label="成品零件号">
              <a-textarea 
                v-model:value="queryParams.partsNumber" 
                placeholder="请输入成品零件号，支持批量输入（换行或逗号分隔）" 
                :rows="3"
                allow-clear 
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item label="状态">
              <a-select 
                v-model:value="queryParams.supplierOrderStatus" 
                placeholder="选择状态" 
                style="width: 100%"
                allow-clear
              >
                <a-select-option :value="0">待确认</a-select-option>
                <a-select-option :value="20">已确认</a-select-option>
                <a-select-option :value="25">部分发运</a-select-option>
                <a-select-option :value="30">已发运</a-select-option>
                <a-select-option :value="40">已结案</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item>
              <a-space style="width: 100%">
                <a-button type="primary" @click="handleSearch" style="flex: 1;">查询</a-button>
                <a-button @click="handleReset" style="flex: 1;">重置</a-button>
              </a-space>
            </a-form-item>
          </a-form>
        </div>
      </a-layout-sider>

      <!-- 右侧列表区域 -->
      <a-layout-content style="flex: 1;">
        <div style="margin-bottom: 16px">
          <a-space>
            <a-button @click="handleExport">导出</a-button>
          </a-space>
        </div>

        <a-table
          :columns="columns"
          :data-source="dataSource"
          :loading="loading"
          :pagination="pagination"
          @change="handleTableChange"
          :scroll="{ x: 1500 }"
          :expandable="{ expandedRowRender, expandedRowKeys, onExpandedRowsChange }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'supplier_order_status'">
              <a-tag :color="getStatusColor(record.supplier_order_status)">
                {{ getStatusText(record.supplier_order_status) }}
              </a-tag>
            </template>
            <template v-if="column.key === 'action'">
              <a-space>
                <a-button 
                  type="link" 
                  size="small"
                  @click="handleViewDetail(record)"
                >
                  查看详情
                </a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-layout-content>
    </a-layout>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { message } from 'ant-design-vue'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()

const loading = ref(false)
const dataSource = ref<any[]>([])
const expandedRowKeys = ref<any[]>([])

const queryParams = reactive({
  orderNo: '',
  partsNumber: '',
  supplierOrderStatus: undefined as number | undefined
})

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条`
})

const columns = [
  { title: '订单号', dataIndex: 'order_no', key: 'order_no', width: 150, fixed: 'left' },
  { title: '成品零件号', dataIndex: 'parts_number', key: 'parts_number', width: 150, fixed: 'left' },
  { title: '成品名称', dataIndex: 'parts_name', key: 'parts_name', width: 200 },
  { title: '加工数量', dataIndex: 'need_number', key: 'need_number', width: 100 },
  { title: '已加工数量', dataIndex: 'processed_qty', key: 'processed_qty', width: 100 },
  { title: '交期', dataIndex: 'need_date', key: 'need_date', width: 120 },
  { title: '状态', dataIndex: 'supplier_order_status', key: 'supplier_order_status', width: 100 },
  { title: '操作', key: 'action', width: 100, fixed: 'right' }
]

const bomColumns = [
  { title: '原材料编码', dataIndex: 'material_code', key: 'material_code', width: 150 },
  { title: '原材料名称', dataIndex: 'material_name', key: 'material_name', width: 200 },
  { title: '单位用量', dataIndex: 'unit_qty', key: 'unit_qty', width: 100 },
  { title: '需求数量', dataIndex: 'required_qty', key: 'required_qty', width: 100 },
  { title: '已领数量', dataIndex: 'picked_qty', key: 'picked_qty', width: 100 },
  { title: '剩余需领', dataIndex: 'remaining_qty', key: 'remaining_qty', width: 100 }
]

function expandedRowRender(record: any) {
  const bomData = record.bom_details || []
  return h('div', { style: { padding: '16px' } }, [
    h('h4', { style: { marginBottom: '12px' } }, 'BOM 物料清单明细'),
    h('a-table', {
      columns: bomColumns,
      dataSource: bomData,
      pagination: false,
      size: 'small',
      rowKey: 'id'
    })
  ])
}

function onExpandedRowsChange(keys: any[]) {
  expandedRowKeys.value = keys
}

function getStatusColor(status: number) {
  const colorMap: Record<number, string> = {
    0: 'orange',
    20: 'green',
    25: 'blue',
    30: 'cyan',
    40: 'gray'
  }
  return colorMap[status] || 'default'
}

function getStatusText(status: number) {
  const textMap: Record<number, string> = {
    0: '待确认',
    20: '已确认',
    25: '部分发运',
    30: '已发运',
    40: '已结案'
  }
  return textMap[status] || '未知'
}

function parseBatchInput(input: string): string[] {
  if (!input || !input.trim()) return []
  return input
    .split(/[\n,，]/)
    .map(item => item.trim())
    .filter(item => item.length > 0)
}

async function handleSearch() {
  loading.value = true
  try {
    const orderNos = parseBatchInput(queryParams.orderNo)
    const partsNumbers = parseBatchInput(queryParams.partsNumber)
    
    message.info('委外加工领料单查询功能待实现')
    
    dataSource.value = []
    pagination.total = 0
  } catch (error) {
    message.error('查询失败')
  } finally {
    loading.value = false
  }
}

function handleReset() {
  queryParams.orderNo = ''
  queryParams.partsNumber = ''
  queryParams.supplierOrderStatus = undefined
  pagination.current = 1
  handleSearch()
}

function handleTableChange(pag: any) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  handleSearch()
}

function handleViewDetail(record: any) {
  message.info('查看详情功能待实现')
}

function handleExport() {
  message.info('导出功能待实现')
}

handleSearch()
</script>

<script lang="ts">
import { h } from 'vue'
export default {
  setup() {
    return {}
  }
}
</script>

<style scoped>
.outsourcing-material-view {
  padding: 16px;
}
</style>