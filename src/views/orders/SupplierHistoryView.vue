<template>
  <div class="supplier-history-view">
    <a-alert
      message="供应商历史采购需求说明"
      description="展示本供应商收到的历史订单数据，支持按月/按年聚合分析采购趋势，为销售预测提供数据支持。"
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
            <!-- <a-form-item label="聚合粒度" required>
              <a-radio-group v-model:value="queryParams.granularity" @change="handleGranularityChange">
                <a-radio value="month">按月</a-radio>
                <a-radio value="year">按年</a-radio>
              </a-radio-group>
            </a-form-item> -->
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
            <!-- <a-form-item label="需求地址">
              <a-select
                v-model:value="queryParams.demandFactories"
                mode="multiple"
                placeholder="请选择需求地址（可多选）"
                allow-clear
                show-search
                :filter-option="filterOption"
                style="width: 100%"
              >
                <a-select-option v-for="factory in factoryOptions" :key="factory.value" :value="factory.value">
                  {{ factory.label }}
                </a-select-option>
              </a-select>
            </a-form-item> -->
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
              <a-space>
                <a-button type="primary" size="small" @click="handleExport">导出分析数据</a-button>
              </a-space>
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
              <template v-else-if="column.key === 'dataType'">
                <a-tag :color="record.hasForecast && !record.hasOrder ? 'orange' : 'green'">
                  {{ record.hasForecast && !record.hasOrder ? '预测' : '订单' }}
                </a-tag>
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
      width="900"
      placement="right"
    >
      <template #extra>
        <a-space>
          <span style="color: #666;">零件号：{{ drillDownDrawer.filter.partsNumber }}</span>
          <!-- <span style="color: #666;">需求地址：{{ drillDownDrawer.filter.address }}</span> -->
          <span style="color: #666;">周期：{{ drillDownDrawer.filter.timeKey }}</span>
        </a-space>
      </template>
      <a-table
        :columns="drillDownColumns"
        :data-source="drillDownDrawer.data"
        :loading="drillDownDrawer.loading"
        :pagination="{ pageSize: 10, showSizeChanger: true, showTotal: (total: number) => `共 ${total} 条` }"
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
import { analyzeSupplierHistory, drillDownSupplierHistory, exportSupplierHistory } from '@/api/srm'
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
  // { title: '需求地址', dataIndex: 'address', key: 'address', width: 120 },
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

  const monthsDiff = dayjs(endDate).startOf('month').diff(dayjs(startDate).startOf('month'), 'month')
  const yearsDiff = dayjs(endDate).startOf('year').diff(dayjs(startDate).startOf('year'), 'year')

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
    const result = await analyzeSupplierHistory({
      userId: session.userId,
      granularity: queryParams.granularity,
      startDate: startDate,
      endDate: endDate,
      demandFactories: queryParams.demandFactories,
      partsNumbers: parseBatchInput(queryParams.partsNumbers)
    })

    if (result.success) {
      aggregatedData.value = result.aggregatedData || []
      // 将零件号23817611移到最后
      aggregatedData.value.sort((a: any, b: any) => {
        if (a.partsNumber === '23817611') return 1
        if (b.partsNumber === '23817611') return -1
        return 0
      })
      renderChart(result.chartData || {})
      generateDynamicColumns(result.timeLabels || [])
    } else {
      message.error(result.message || '分析失败')
      generateMockData()
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
    
  ]

  generateDynamicColumns(timeLabels)

  const chartData = {
    xAxis: timeLabels,
    series: [
      
    ]
  }
  renderChart(chartData)
}

function generateDynamicColumns(timeLabels: string[]) {
  const columns: ColumnsType = [
    { title: '序号', dataIndex: 'index', key: 'index', width: 50, fixed: 'left' },
    { title: '零件号', dataIndex: 'partsNumber', key: 'partsNumber', width: 150, fixed: 'left' },
    { title: '零件名称', dataIndex: 'partsName', key: 'partsName', width: 150, fixed: 'left' },
    // { title: '类型', dataIndex: 'dataType', key: 'dataType', width: 80, fixed: 'left' }
  ]

  timeLabels.forEach(label => {
    columns.push({
      title: label,
      dataIndex: label,
      key: label,
      width: 120,
      align: 'right',
      isTimeColumn: true
    } as any)
  })

  columns.push({
    title: '期间总合计',
    dataIndex: 'total',
    key: 'total',
    width: 100,
    align: 'right',
    fixed: 'right'
  } as any)

  dynamicColumns.value = columns
}

function renderChart(chartData: any) {
  nextTick(() => {
    if (!chartRef.value) return

    if (chartInstance.value) {
      chartInstance.value.dispose()
    }

    chartInstance.value = echarts.init(chartRef.value)

    console.log('chartData:', chartData)

    const option: EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: function(params: any) {
          if (!params) return ''
          const dataType = params.data?.hasForecast && !params.data?.hasOrder ? '预测' : ''
          return params.seriesName + (dataType ? ' [预测]' : '') + '<br/>' + params.value
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
        smooth: true,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: {
          borderWidth: 2
        },
        lineStyle: {
          type: s.hasForecast && !s.hasOrder ? 'dashed' : 'solid'
        }
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
    address: record.address,
    timeKey: timeKey,
    granularity: queryParams.granularity
  }

  try {
    const result = await drillDownSupplierHistory({
      userId: session.userId,
      partsNumber: record.partsNumber,
      address: record.address,
      timeKey: timeKey,
      granularity: queryParams.granularity
    })

    if (result.success) {
      drillDownDrawer.data = result.details || []
    } else {
      message.error(result.message || '查询明细失败')
      drillDownDrawer.data = generateMockDrillDownData(record, timeKey)
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
      orderNo: `ORD${Date.now()}${mockData.length}`,
      orderLineNo: String(mockData.length + 1),
      partsNumber: record.partsNumber,
      partsName: record.partsName,
      address: record.address,
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

    const result = await exportSupplierHistory({
      userId: session.userId,
      granularity: queryParams.granularity,
      startDate: startDate,
      endDate: endDate,
      demandFactories: queryParams.demandFactories,
      partsNumbers: parseBatchInput(queryParams.partsNumbers)
    })

    if (result.success) {
      message.success('导出成功')
    } else {
      message.error(result.message || '导出失败')
    }
  } catch (error) {
    message.error('导出失败')
  }
}

onMounted(() => {
  window.addEventListener('resize', () => {
    chartInstance.value?.resize()
  })
  // 设置默认时间范围：之前一年 + 之后4个月
  const now = dayjs()
  queryParams.dateRange = [now.subtract(1, 'year').startOf('month'), now.add(4, 'month')]
  // 自动加载数据
  handleAnalyze()
})
</script>

<style scoped>
.supplier-history-view {
  padding: 16px;
}
</style>
