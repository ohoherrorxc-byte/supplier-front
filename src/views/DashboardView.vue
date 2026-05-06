<template>
  <div class="srm-page">
    <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 8px">工作台</h1>
    <p style="color: #64748b; margin-bottom: 24px">
      欢迎回来！聚焦订单协同与交付协同，核心操作一键可达。
    </p>

    <!-- 核心指标 -->
    <a-row :gutter="[16, 16]" style="margin-bottom: 24px">
      <a-col :xs="24" :sm="8">
        <a-card size="small" @click="go('/order-management?status=0')">
          <a-statistic title="待确认订单" :value="stats.pendingOrders" :value-style="{ color: '#cf1322' }">
            <template #prefix><unordered-list-outlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="8">
        <a-card size="small" @click="go('/shipments')">
          <a-statistic title="在途发货" :value="stats.activeAsn">
            <template #prefix><car-outlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="8">
        <a-card size="small" @click="go('/shipments?actualEtaDate=' + dayjs().format('YYYY-MM-DD'))">
          <a-statistic title="今日预计到货总数" :value="stats.todayArriving" :value-style="{ color: '#3f8600' }">
            <template #prefix><check-circle-outlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :md="16">
        <a-card title="快速导航" style="margin-bottom: 16px">
          <a-row :gutter="[16, 16]">
            <a-col :span="8">
              <a-card hoverable @click="go('/order-management?status=0')">
                <template #title>新订单</template>
                查看待处理采购订单
              </a-card>
            </a-col>
            <!-- <a-col :span="8">
              <a-card hoverable @click="go('/asn/create')">
                <template #title>创建 ASN</template>
                填写物流生成 ASN
              </a-card>
            </a-col> -->
            <a-col :span="8">
              <a-card hoverable @click="go('/shipments')">
                <template #title>我的发运单</template>
                追踪物流与收货状态
              </a-card>
            </a-col>
            <a-col :span="8">
              <a-card hoverable @click="go('/delivery-plan')">
                <template #title>交付计划</template>
                查看未来 7 日到货排期
              </a-card>
            </a-col>
            <!-- <a-col :span="8">
              <a-card hoverable @click="go('/file-upload')">
                <template #title>文件上传</template>
                测试文件上传功能
              </a-card>
            </a-col> -->
          </a-row>
        </a-card>

        <a-card title="绩效看板 (Q/D/C)">
          <p style="color: #64748b; font-size: 13px; text-align: center; padding: 40px 0">
            页面待开发
          </p>
        </a-card>
      </a-col>

      <a-col :xs="24" :md="8">
        <a-card title="公告通知">
          <a-list size="small">
            <a-list-item>
              <a-list-item-meta title="系统升级通知" description="每周五 22:00 进行例行维护" />
            </a-list-item>
            <a-list-item>
              <a-list-item-meta title="新业务规范发布" description="关于发货通知的填写规范" />
            </a-list-item>
          </a-list>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { getDashboardStats } from '@/api/srm'
import { useSessionStore } from '@/stores/session'
import { UnorderedListOutlined, CarOutlined, CheckCircleOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'

const router = useRouter()
const session = useSessionStore()

const stats = reactive({
  pendingOrders: 0,
  activeAsn: 0,
  todayArriving: 0
})

async function loadStats() {
  try {
    const res = await getDashboardStats(session.userId)
    Object.assign(stats, res)
  } catch (e) {
    console.error('Failed to load stats:', e)
  }
}

onMounted(loadStats)

function go(path: string) {
  if (path === '/delivery-plan') {
    const startDate = dayjs().format('YYYY-MM-DD')
    const endDate = dayjs().add(6, 'day').format('YYYY-MM-DD')
    router.push(`${path}?startDate=${startDate}&endDate=${endDate}`)
  } else {
    router.push(path)
  }
}
</script>
