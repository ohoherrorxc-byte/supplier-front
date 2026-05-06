<template>
  <div class="sales-forecast-view">
    <a-alert
      message="销售预测说明"
      description="销售预测为主机厂共享的未来12个月滚动预测，供应商视角绝对只读。仅供其作为二级物料采购的参考。"
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
            <a-form-item label="零件号">
              <a-textarea 
                v-model:value="queryParams.partsNumber" 
                placeholder="请输入零件号，支持批量输入（换行或逗号分隔）" 
                :rows="3"
                allow-clear 
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item label="预测月份">
              <a-range-picker 
                v-model:value="queryParams.dateRange" 
                picker="month"
                format="YYYY-MM"
                style="width: 100%"
              />
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
            <a-button type="primary" @click="handleConfirmReceived">
              确认收到
            </a-button>
            <a-button @click="handleExport">导出 Excel</a-button>
          </a-space>
        </div>

        <a-table
          :columns="columns"
          :data-source="dataSource"
          :loading="loading"
          :pagination="pagination"
          @change="handleTableChange"
          :scroll="{ x: 1500 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'forecast_month'">
              <a-tag color="blue">{{ record.forecast_month }}</a-tag>
            </template>
            <template v-if="column.key === 'forecast_qty'">
              <span style="font-weight: 500; color: #1890ff">
                {{ record.forecast_qty }}
              </span>
            </template>
            <template v-if="column.key === 'confidence_level'">
              <a-tag :color="getConfidenceColor(record.confidence_level)">
                {{ getConfidenceText(record.confidence_level) }}
              </a-tag>
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

const queryParams = reactive({
  partsNumber: '',
  dateRange: null as any
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
  { title: '零件号', dataIndex: 'parts_number', key: 'parts_number', width: 150, fixed: 'left' },
  { title: '零件名称', dataIndex: 'parts_name', key: 'parts_name', width: 200, fixed: 'left' },
  { title: '预测月份', dataIndex: 'forecast_month', key: 'forecast_month', width: 120 },
  { title: '预测数量', dataIndex: 'forecast_qty', key: 'forecast_qty', width: 120 },
  { title: '置信度', dataIndex: 'confidence_level', key: 'confidence_level', width: 100 },
  { title: '版本号', dataIndex: 'version', key: 'version', width: 100 },
  { title: '发布日期', dataIndex: 'publish_date', key: 'publish_date', width: 120 },
  { title: '备注', dataIndex: 'remark', key: 'remark', width: 200 }
]

function getConfidenceColor(level: string) {
  const colorMap: Record<string, string> = {
    '高': 'green',
    '中': 'orange',
    '低': 'red'
  }
  return colorMap[level] || 'default'
}

function getConfidenceText(level: string) {
  const textMap: Record<string, string> = {
    'HIGH': '高',
    'MEDIUM': '中',
    'LOW': '低'
  }
  return textMap[level] || level
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
    const partsNumbers = parseBatchInput(queryParams.partsNumber)
    
    const startDate = queryParams.dateRange?.[0] || ''
    const endDate = queryParams.dateRange?.[1] || ''
    
    message.info('销售预测查询功能待实现')
    
    dataSource.value = []
    pagination.total = 0
  } catch (error) {
    message.error('查询失败')
  } finally {
    loading.value = false
  }
}

function handleReset() {
  queryParams.partsNumber = ''
  queryParams.dateRange = null
  pagination.current = 1
  handleSearch()
}

function handleTableChange(pag: any) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  handleSearch()
}

function handleConfirmReceived() {
  message.info('确认收到功能待实现')
}

function handleExport() {
  message.info('导出 Excel 功能待实现')
}

handleSearch()
</script>

<style scoped>
.sales-forecast-view {
  padding: 16px;
}
</style>