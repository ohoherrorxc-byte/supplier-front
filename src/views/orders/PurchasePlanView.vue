<template>
  <div class="purchase-plan-view">
    <a-alert
      message="采购计划说明"
      description="采购计划为未来的周度排产意向，供应商必须在规定时间内填报【承诺可满足数量】。若承诺可满足数量小于计划量，系统将自动触发缺料预警。"
      type="warning"
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
            <a-form-item label="计划周期">
              <a-range-picker 
                v-model:value="queryParams.dateRange" 
                picker="week"
                format="YYYY-ww"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item label="反馈状态">
              <a-select 
                v-model:value="queryParams.feedbackStatus" 
                placeholder="选择状态" 
                style="width: 100%"
                allow-clear
              >
                <a-select-option value="pending">待反馈</a-select-option>
                <a-select-option value="confirmed">已确认</a-select-option>
                <a-select-option value="shortage">缺料预警</a-select-option>
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
            <a-button 
              type="primary" 
              :disabled="selectedRowKeys.length === 0"
              @click="handleBatchFeedback"
            >
              批量反馈产能
            </a-button>
            <a-button @click="handleExport">导出</a-button>
          </a-space>
        </div>

        <a-table
          :columns="columns"
          :data-source="dataSource"
          :loading="loading"
          :row-selection="rowSelection"
          :pagination="pagination"
          :row-key="record => record.id"
          @change="handleTableChange"
          :scroll="{ x: 1500 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'feedback_status'">
              <a-tag :color="getFeedbackStatusColor(record.feedback_status)">
                {{ getFeedbackStatusText(record.feedback_status) }}
              </a-tag>
            </template>
            <template v-if="column.key === 'planned_qty'">
              <span style="font-weight: 500; color: #1890ff">
                {{ record.planned_qty }}
              </span>
            </template>
            <template v-if="column.key === 'committed_qty'">
              <span 
                :style="{
                  fontWeight: 500,
                  color: record.committed_qty < record.planned_qty ? '#ff4d4f' : '#52c41a'
                }"
              >
                {{ record.committed_qty || '-' }}
              </span>
            </template>
            <template v-if="column.key === 'shortage_qty'">
              <span v-if="record.shortage_qty > 0" style="color: #ff4d4f; font-weight: 500">
                {{ record.shortage_qty }}
              </span>
              <span v-else style="color: #52c41a">-</span>
            </template>
            <template v-if="column.key === 'action'">
              <a-space>
                <a-button 
                  v-if="record.feedback_status === 'pending'" 
                  type="primary" 
                  size="small"
                  @click="handleFeedback(record)"
                >
                  反馈产能
                </a-button>
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

    <a-modal
      v-model:open="feedbackModalVisible"
      title="反馈产能"
      width="600px"
      @ok="handleFeedbackSubmit"
      @cancel="feedbackModalVisible = false"
    >
      <a-form :model="feedbackForm" layout="vertical">
        <a-form-item label="零件号">
          <a-input v-model:value="feedbackForm.parts_number" disabled />
        </a-form-item>
        <a-form-item label="零件名称">
          <a-input v-model:value="feedbackForm.parts_name" disabled />
        </a-form-item>
        <a-form-item label="计划周期">
          <a-input v-model:value="feedbackForm.plan_period" disabled />
        </a-form-item>
        <a-form-item label="计划交付数量">
          <a-input v-model:value="feedbackForm.planned_qty" disabled />
        </a-form-item>
        <a-form-item 
          label="承诺可满足数量" 
          :rules="[{ required: true, message: '请输入承诺可满足数量' }]"
        >
          <a-input-number 
            v-model:value="feedbackForm.committed_qty" 
            :min="0"
            :max="feedbackForm.planned_qty"
            style="width: 100%"
            placeholder="请输入承诺可满足数量"
          />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea 
            v-model:value="feedbackForm.remark" 
            placeholder="请输入备注信息" 
            :rows="3"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { message } from 'ant-design-vue'
import { useSessionStore } from '@/stores/session'
import { listPurchasePlan, submitPurchasePlanFeedback } from '@/api/srm'

const session = useSessionStore()

const loading = ref(false)
const dataSource = ref<any[]>([])
const selectedRowKeys = ref<any[]>([])
const selectedRows = ref<any[]>([])
const feedbackModalVisible = ref(false)

const queryParams = reactive({
  partsNumber: '',
  dateRange: null as any,
  feedbackStatus: undefined as string | undefined
})

const feedbackForm = reactive({
  id: undefined as number | undefined,
  parts_number: '',
  parts_name: '',
  plan_period: '',
  planned_qty: 0,
  committed_qty: undefined as number | undefined,
  remark: ''
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
  { title: '计划周期', dataIndex: 'plan_period', key: 'plan_period', width: 120 },
  { title: '计划数量', dataIndex: 'planned_qty', key: 'planned_qty', width: 120 },
  { title: '承诺可满足数量', dataIndex: 'committed_qty', key: 'committed_qty', width: 150 },
  { title: '缺料数量', dataIndex: 'shortage_qty', key: 'shortage_qty', width: 100 },
  { title: '反馈状态', dataIndex: 'feedback_status', key: 'feedback_status', width: 100 },
  { title: '反馈截止日期', dataIndex: 'feedback_deadline', key: 'feedback_deadline', width: 120 },
  { title: '操作', key: 'action', width: 150, fixed: 'right' }
]

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: any[], rows: any[]) => {
    selectedRowKeys.value = keys
    selectedRows.value = rows
  }
}))

function getFeedbackStatusColor(status: string) {
  const colorMap: Record<string, string> = {
    'pending': 'orange',
    'confirmed': 'green',
    'shortage': 'red'
  }
  return colorMap[status] || 'default'
}

function getFeedbackStatusText(status: string) {
  const textMap: Record<string, string> = {
    'pending': '待反馈',
    'confirmed': '已确认',
    'shortage': '缺料预警'
  }
  return textMap[status] || status
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

    const startDate = queryParams.dateRange?.[0] ? String(queryParams.dateRange[0]).substring(0, 7) : ''
    const endDate = queryParams.dateRange?.[1] ? String(queryParams.dateRange[1]).substring(0, 7) : ''

    const result = await listPurchasePlan({
      userId: session.userId.toString(),
      partsNumber: partsNumbers.length > 0 ? partsNumbers : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      feedbackStatus: queryParams.feedbackStatus,
      limit: pagination.pageSize,
      offset: (pagination.current - 1) * pagination.pageSize
    })

    dataSource.value = result.items || []
    pagination.total = result.total || 0
  } catch (error) {
    console.error('查询采购计划失败:', error)
    message.error('查询失败')
  } finally {
    loading.value = false
  }
}

function handleReset() {
  queryParams.partsNumber = ''
  queryParams.dateRange = null
  queryParams.feedbackStatus = undefined
  pagination.current = 1
  handleSearch()
}

function handleTableChange(pag: any) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  handleSearch()
}

function handleFeedback(record: any) {
  feedbackForm.id = record.id
  feedbackForm.parts_number = record.parts_number
  feedbackForm.parts_name = record.parts_name
  feedbackForm.plan_period = record.plan_period
  feedbackForm.planned_qty = record.planned_qty
  feedbackForm.committed_qty = record.committed_qty
  feedbackForm.remark = record.remark || ''
  feedbackModalVisible.value = true
}

async function handleFeedbackSubmit() {
  if (!feedbackForm.committed_qty || feedbackForm.committed_qty <= 0) {
    message.error('请输入有效的承诺可满足数量')
    return
  }

  try {
    await submitPurchasePlanFeedback(
      String(feedbackForm.id),
      session.userId.toString(),
      feedbackForm.committed_qty,
      feedbackForm.remark
    )
    message.success('产能反馈成功')
    feedbackModalVisible.value = false
    handleSearch()
  } catch (error) {
    console.error('产能反馈失败:', error)
    message.error('反馈失败')
  }
}

function handleBatchFeedback() {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请至少选择一条采购计划')
    return
  }

  message.info('批量反馈产能功能待实现')
}

function handleViewDetail(record: any) {
  message.info('查看详情功能待实现')
}

function handleExport() {
  message.info('导出功能待实现')
}

handleSearch()
</script>

<style scoped>
.purchase-plan-view {
  padding: 16px;
}
</style>