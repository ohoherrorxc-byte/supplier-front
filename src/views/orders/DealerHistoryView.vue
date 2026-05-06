<template>
  <div class="dealer-history-view">
    <a-alert
      message="历史采购需求说明"
      description="历史采购需求为主机厂计划员的数据分析看板，用于分析特定时间段内各需求工厂对各零件的真实历史采购流水记录，为销售预测提供数据支持。"
      type="info"
      show-icon
      style="margin-bottom: 16px"
    />

    <a-layout style="background: #fff; padding: 16px; border-radius: 8px;">
      <!-- 左侧多维分析控制台 -->
      <a-layout-sider width="350" style="background: #fafafa; padding: 16px; border-radius: 8px; margin-right: 16px;">
        <div class="query-section">
          <h3 style="margin-bottom: 16px; font-size: 16px; font-weight: 500;">多维分析控制台</h3>
          <a-form :model="queryParams">
            <a-form-item label="聚合粒度" required>
              <a-radio-group v-model:value="queryParams.granularity" @change="handleGranularityChange">
                <a-radio value="month">按月</a-radio>
                <a-radio value="year">按年</a-radio>
              </a-radio-group>
            </a-form-item>
            <a-form-item label="时间范围" required>
              <a-range-picker 
                v-if="queryParams.granularity === 'month'"
                v-model:value="queryParams.dateRange" 
                picker="month"
                format="YYYY-MM"
                style="width: 100%"
              />
              <a-range-picker 
                v-else
                v-model:value="queryParams.dateRange" 
                picker="year"
                format="YYYY"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item label="需求工厂">
              <a-select 
                v-model:value="queryParams.demandFactories" 
                mode="multiple"
                placeholder="请选择需求工厂（可多选）"
                allow-clear 
                show-search
                :filter-option="filterOption"
                style="width: 100%"
              >
                <a-select-option v-for="factory in factoryOptions" :key="factory.value" :value="factory.value">
                  {{ factory.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="零件号">
              <a-textarea 
                v-model:value="queryParams.partsNumbers" 
                placeholder="支持批量输入多个零件号（回车或逗号分隔）"
                :rows="3"
                allow-clear 
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item>
              <a-space style="width: 100%" direction="vertical">
                <a-space style="width: 100%">
                  <a-button type="primary" @click="handleAnalyze" style="flex: 1;">开始分析</a-button>
                  <a-button @click="handleReset" style="flex: 1;">重置</a-button>
                </a-space>
              </a-space>
            </a-form-item>
          </a-form>
        </div>
      </a-layout-sider>

      <!-- 右侧趋势可视化看板和动态聚合数据表 -->
      <a-layout-content style="flex: 1;">
        <!-- 趋势可视化看板 -->
        <a-card size="small" style="margin-bottom: 16px;">
          <template #title>趋势可视化看板</template>
          <div ref="chartRef" style="width: 100%; height: 400px;"></div>
        </a-card>

        <!-- 动态聚合数据表 -->
        <a-card size="small">
          <template #title>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>动态聚合数据表</span>
              <a-button type="primary" size="small" @click="handleExport">导出分析数据</a-button>
            </div>
          </template>
          <a-table
            :columns="dynamicColumns"
            :data-source="aggregatedData"
            :loading="loading"
            :pagination="false"
            :scroll="{ x: 2000, y: 600 }"
            size="small"
            :virtual="true"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'index'">
                {{ index + 1 }}
              </template>
              <template v-else-if="column.isTimeColumn && record[column.key] > 0">
                <a @click="handleDrillDown(record, column.key)" style="color: #1890ff; cursor: pointer;">
                  {{ record[column.key].toLocaleString() }}
                </a>
              </template>
              <template v-else-if="column.isTimeColumn">
                <span>0</span>
              </template>
              <template v-else-if="column.key === 'total'">
                <span style="font-weight: 500;">{{ record.total.toLocaleString() }}</span>
              </template>
            </template>
          </a-table>
        </a-card>
      </a-layout-content>
    </a-layout>

    <!-- 数值下钻抽屉 -->
    <a-drawer
      v-model:open="drillDownDrawer.open"
      title="数值下钻 - 明细追溯"
      width="800"
      placement="right"
    >
      <a-table
        :columns="drillDownColumns"
        :data-source="drillDownDrawer.data"
        :loading="drillDownDrawer.loading"
        :pagination="false"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'demandQty'">
            <span style="text-align: right; display: block;">
              {{ record.demandQty.toLocaleString() }}
            </span>
          </template>
        </template>
      </a-table>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { useSessionStore } from '@/stores/session'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import type { ColumnsType } from 'ant-design-vue/es/table'
import dayjs from 'dayjs'

const session = useSessionStore()

const loading = ref(false)
const chartRef = ref<HTMLElement>()
const chartInstance = ref<any>()

const queryParams = reactive({
  granularity: 'month' as 'month' | 'year',
  dateRange: null as any,
  demandFactories: [] as string[],
  partsNumbers: ''
})

const factoryOptions = ref([
  { label: '上海工厂 (SHPC)', value: 'SHPC' },
  { label: '北京工厂 (BJPC)', value: 'BJPC' },
  { label: '广州工厂 (GZPC)', value: 'GZPC' },
  { label: '武汉工厂 (WHPC)', value: 'WHPC' },
  { label: '重庆工厂 (CQPC)', value: 'CQPC' }
])

const aggregatedData = ref<any[]>([])
const dynamicColumns = ref<ColumnsType>([])

const drillDownDrawer = reactive({
  open: false,
  loading: false,
  data: [] as any[],
  filter: {} as any
})

const drillDownColumns: ColumnsType = [
  { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 180 },
  { title: '订单行号', dataIndex: 'orderLineNo', key: 'orderLineNo', width: 120 },
  { title: '零件号', dataIndex: 'partsNumber', key: 'partsNumber', width: 150 },
  { title: '零件名称', dataIndex: 'partsName', key: 'partsName', width: 200 },
  { title: '需求工厂', dataIndex: 'demandFactory', key: 'demandFactory', width: 120 },
  { title: '采购日期', dataIndex: 'purchaseDate', key: 'purchaseDate', width: 120 },
  { title: '需求量', dataIndex: 'demandQty', key: 'demandQty', width: 120, align: 'right' }
]

function filterOption(input: string, option: any) {
  return option.label.toLowerCase().includes(input.toLowerCase())
}

function handleGranularityChange() {
  queryParams.dateRange = null
}

function formatDate(date: any): string {
  if (!date) return ''
  if (date.format) {
    return date.format(queryParams.granularity === 'month' ? 'YYYY-MM' : 'YYYY')
  }
  return date
}

function parseBatchInput(input: string): string[] {
  if (!input) return []
  return input
    .split(/[\n,;\s]+/)
    .map(item => item.trim())
    .filter(item => item.length > 0)
}

async function handleAnalyze() {
  if (!queryParams.dateRange || queryParams.dateRange.length !== 2) {
    message.warning('请选择完整的时间范围')
    return
  }

  const startDate = formatDate(queryParams.dateRange[0])
  const endDate = formatDate(queryParams.dateRange[1])

  const monthsDiff = dayjs(endDate).diff(dayjs(startDate), 'month')
  const yearsDiff = dayjs(endDate).diff(dayjs(startDate), 'year')

  if (queryParams.granularity === 'month' && monthsDiff > 36) {
    message.warning('按月查询跨度最多不超过 36 个月')
    return
  }

  if (queryParams.granularity === 'year' && yearsDiff > 10) {
    message.warning('按年查询跨度最多不超过 10 年')
    return
  }

  loading.value = true
  try {
    const response = await fetch('/api/v1/forecast/historical-demands/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: session.userId,
        granularity: queryParams.granularity,
        startDate: startDate,
        endDate: endDate,
        demandFactories: queryParams.demandFactories,
        partsNumbers: parseBatchInput(queryParams.partsNumbers)
      })
    })

    if (response.ok) {
      const data = await response.json()
      aggregatedData.value = data.aggregatedData || []
      renderChart(data.chartData || {})
      generateDynamicColumns(data.timeLabels || [])
    } else {
      throw new Error('分析失败')
    }
  } catch (error) {
    message.error('分析失败')
    generateMockData()
  } finally {
    loading.value = false
  }
}

function generateMockData() {
  const timeLabels = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06']
  
  aggregatedData.value = [
    // {
    //   partsNumber: '26644565',
    //   partsName: '制动盘',
    //   demandFactory: 'SHPC',
    //   '2024-01': 1500,
    //   '2024-02': 1800,
    //   '2024-03': 1200,
    //   '2024-04': 2000,
    //   '2024-05': 1600,
    //   '2024-06': 1900,
    //   total: 10000
    // },
    // {
    //   partsNumber: '12171083',
    //   partsName: '刹车片',
    //   demandFactory: 'BJPC',
    //   '2024-01': 800,
    //   '2024-02': 900,
    //   '2024-03': 1100,
    //   '2024-04': 750,
    //   '2024-05': 1000,
    //   '2024-06': 850,
    //   total: 5400
    // }
  ]

  generateDynamicColumns(timeLabels)
  
  const chartData = {
    xAxis: timeLabels,
    series: [
      {
        name: '26644565 (SHPC)',
        data: [1500, 1800, 1200, 2000, 1600, 1900]
      },
      {
        name: '12171083 (BJPC)',
        data: [800, 900, 1100, 750, 1000, 850]
      }
    ]
  }
  renderChart(chartData)
}

function generateDynamicColumns(timeLabels: string[]) {
  const columns: ColumnsType = [
    { title: '序号', dataIndex: 'index', key: 'index', width: 80, fixed: 'left' },
    { title: '需求工厂', dataIndex: 'demandFactory', key: 'demandFactory', width: 120, fixed: 'left' },
    { title: '零件号', dataIndex: 'partsNumber', key: 'partsNumber', width: 150, fixed: 'left' },
    { title: '零件名称', dataIndex: 'partsName', key: 'partsName', width: 200, fixed: 'left' }
  ]

  timeLabels.forEach(label => {
    columns.push({
      title: label,
      dataIndex: label,
      key: label,
      width: 120,
      align: 'right',
      isTimeColumn: true
    })
  })

  columns.push({
    title: '期间总合计',
    dataIndex: 'total',
    key: 'total',
    width: 150,
    align: 'right',
    fixed: 'right'
  })

  dynamicColumns.value = columns
}

function renderChart(chartData: any) {
  nextTick(() => {
    if (!chartRef.value) return

    if (chartInstance.value) {
      chartInstance.value.dispose()
    }

    chartInstance.value = echarts.init(chartRef.value)

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          let result = params[0].axisValue + '<br/>'
          params.forEach((param: any) => {
            result += `${param.seriesName}: ${param.value.toLocaleString()}<br/>`
          })
          return result
        }
      },
      legend: {
        data: chartData.series?.map((s: any) => s.name) || [],
        top: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: chartData.xAxis || []
      },
      yAxis: {
        type: 'value',
        name: '采购数量'
      },
      series: chartData.series?.map((s: any) => ({
        name: s.name,
        type: 'line',
        data: s.data,
        smooth: true
      })) || []
    }

    chartInstance.value.setOption(option)
  })
}

function handleReset() {
  queryParams.granularity = 'month'
  queryParams.dateRange = null
  queryParams.demandFactories = []
  queryParams.partsNumbers = ''
  aggregatedData.value = []
  dynamicColumns.value = []
  
  if (chartInstance.value) {
    chartInstance.value.dispose()
    chartInstance.value = undefined
  }
}

async function handleDrillDown(record: any, timeKey: string) {
  drillDownDrawer.open = true
  drillDownDrawer.loading = true
  drillDownDrawer.filter = {
    partsNumber: record.partsNumber,
    demandFactory: record.demandFactory,
    timeKey: timeKey,
    granularity: queryParams.granularity
  }

  try {
    const response = await fetch('/api/v1/forecast/historical-demands/drill-down', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: session.userId,
        ...drillDownDrawer.filter
      })
    })

    if (response.ok) {
      const data = await response.json()
      drillDownDrawer.data = data.details || []
    } else {
      throw new Error('查询明细失败')
    }
  } catch (error) {
    message.error('查询明细失败')
    drillDownDrawer.data = generateMockDrillDownData(record, timeKey)
  } finally {
    drillDownDrawer.loading = false
  }
}

function generateMockDrillDownData(record: any, timeKey: string) {
  const quantity = record[timeKey]
  const mockData = []
  let remaining = quantity

  while (remaining > 0) {
    const qty = Math.min(Math.floor(Math.random() * 500) + 100, remaining)
    mockData.push({
      orderNo: `WLDD${Date.now()}${mockData.length}`,
      orderLineNo: String(mockData.length + 1),
      partsNumber: record.partsNumber,
      partsName: record.partsName,
      demandFactory: record.demandFactory,
      purchaseDate: `${timeKey}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      demandQty: qty
    })
    remaining -= qty
  }

  return mockData
}

async function handleExport() {
  if (aggregatedData.value.length === 0) {
    message.warning('暂无数据可导出')
    return
  }

  if (aggregatedData.value.length > 100000) {
    message.warning('导出数据维度过大，请缩小时间范围或明确零件号后再试')
    return
  }

  try {
    const startDate = formatDate(queryParams.dateRange?.[0])
    const endDate = formatDate(queryParams.dateRange?.[1])
    
    const response = await fetch('/api/v1/forecast/historical-demands/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: session.userId,
        granularity: queryParams.granularity,
        startDate: startDate,
        endDate: endDate,
        demandFactories: queryParams.demandFactories,
        partsNumbers: parseBatchInput(queryParams.partsNumbers)
      })
    })
    
    if (response.ok) {
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `历史采购需求分析_${startDate}_${endDate}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      message.success('导出成功')
    } else {
      throw new Error('导出失败')
    }
  } catch (error) {
    message.error('导出失败')
  }
}

onMounted(() => {
  window.addEventListener('resize', () => {
    chartInstance.value?.resize()
  })
})
</script>

<style scoped>
.dealer-history-view {
  padding: 16px;
}
</style>
