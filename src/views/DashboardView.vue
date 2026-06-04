<template>
  <div class="dashboard">
    <!-- 顶部欢迎区域 -->
    <div class="welcome-section">
      <div class="welcome-content">
        <h1>欢迎回来</h1>
        <p>聚焦订单协同与交付协同，核心操作一键可达</p>
      </div>
      <div class="welcome-date">
        <span class="date">{{ currentDate }}</span>
        <span class="week">{{ weekDay }}</span>
      </div>
    </div>

    <!-- 消息轮播横幅 -->
    <div class="message-banner" v-if="messages.length > 0">
      <div class="message-marquee">
        <div class="message-item" @click="goToMessage(messages[currentIndex])">
          <component :is="getIcon(messages[currentIndex].type)" class="message-icon" />
          <span>{{ messages[currentIndex].text }}</span>
          <span class="message-count">{{ currentIndex + 1 }}/{{ messages.length }}</span>
          <left-outlined class="message-nav prev" @click.stop="prevMessage" />
          <right-outlined class="message-nav next" @click.stop="nextMessage" />
        </div>
      </div>
    </div>

    <!-- 核心指标卡片 -->
    <div class="stats-grid">
      <div class="stat-card stat-primary" :class="{ 'has-value': stats.pendingOrders > 0 }" @click="go('/order-management?status=0')">
        <div class="stat-icon">
          <file-search-outlined />
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.pendingOrders }}</span>
          <span class="stat-label">待确认订单</span>
        </div>
        <div class="stat-arrow">
          <right-outlined />
        </div>
      </div>
    
      <div class="stat-card stat-danger" :class="{ 'has-value': stats.pendingInvoiceCount > 0 }" @click="go('/invoice/pending/general')">
        <div class="stat-icon">
          <file-text-outlined />
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.pendingInvoiceCount }}</span>
          <span class="stat-label">待开票数量</span>
        </div>
        <div class="stat-arrow">
          <right-outlined />
        </div>
      </div>
        <div class="stat-card stat-warning" :class="{ 'has-value': stats.pendingForecast > 0 }" @click="go('/order-management-purchase-plan?feedbackStatus=pending')">
        <div class="stat-icon">
          <file-search-outlined />
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.pendingForecast }}</span>
          <span class="stat-label">待确认预测</span>
        </div>
        <div class="stat-arrow">
          <right-outlined />
        </div>
      </div>
      <div class="stat-card stat-success" @click="go('/shipments')">
        <div class="stat-icon">
          <car-outlined />
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.activeAsn }}</span>
          <span class="stat-label">在途发货</span>
        </div>
        <div class="stat-arrow">
          <right-outlined />
        </div>
      </div>

      <!-- <div class="stat-card stat-info" @click="go('/shipments?actualEtaDate=' + dayjs().format('YYYY-MM-DD'))">
        <div class="stat-icon">
          <inbox-outlined />
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.todayArriving }}</span>
          <span class="stat-label">今日预计到货</span>
        </div>
        <div class="stat-arrow">
          <right-outlined />
        </div>
      </div> -->
    </div>

    <!-- 快捷入口 -->
    <div class="quick-actions">
      <h2 class="section-title">
        <rocket-outlined />
        快捷操作
      </h2>
      <div class="actions-grid">
        <div class="action-card" @click="go('/order-management?status=0')">
          <div class="action-icon bg-blue">
            <file-search-outlined />
          </div>
          <div class="action-text">
            <span class="action-title">新订单</span>
            <span class="action-desc">查看待处理采购订单</span>
          </div>
        </div>

        <div class="action-card" @click="go('/invoice/pending/bom')">
          <div class="action-icon bg-purple">
            <container-outlined />
          </div>
          <div class="action-text">
            <span class="action-title">生产采购</span>
            <span class="action-desc">生产采购待开票清单</span>
          </div>
        </div>

        <div class="action-card" @click="go('/invoice/pending/general')">
          <div class="action-icon bg-orange">
            <file-text-outlined />
          </div>
          <div class="action-text">
            <span class="action-title">一般采购</span>
            <span class="action-desc">一般采购待开票清单</span>
          </div>
        </div>

        <div class="action-card" @click="go('/shipments')">
          <div class="action-icon bg-green">
            <car-outlined />
          </div>
          <div class="action-text">
            <span class="action-title">我的发运单</span>
            <span class="action-desc">追踪物流与收货状态</span>
          </div>
        </div>

        <div class="action-card" @click="go('/delivery-plan')">
          <div class="action-icon bg-teal">
            <schedule-outlined />
          </div>
          <div class="action-text">
            <span class="action-title">交付计划</span>
            <span class="action-desc">未来7日到货排期</span>
          </div>
        </div>

        <div class="action-card" @click="go('/invoice/settlement/list')">
          <div class="action-icon bg-indigo">
            <account-book-outlined />
          </div>
          <div class="action-text">
            <span class="action-title">结算单管理</span>
            <span class="action-desc">查看历史结算单</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部区域 -->
    <div class="bottom-section">
      <!-- 公告通知 -->
      <div class="notice-card">
        <div class="card-header">
          <span class="card-title">
            <bell-outlined />
            公告通知
          </span>
        </div>
        <div class="notice-list">
          <div class="notice-item" v-for="(item, index) in notices" :key="index">
            <div class="notice-dot"></div>
            <div class="notice-content">
              <span class="notice-title">{{ item.title }}</span>
              <span class="notice-desc">{{ item.desc }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 快捷操作帮助 -->
      <div class="help-card">
        <div class="card-header">
          <span class="card-title">
            <question-circle-outlined />
            操作提示
          </span>
        </div>
        <div class="help-list">
          <div class="help-item">
            <div class="help-icon">
              <unordered-list-outlined />
            </div>
            <div class="help-text">
              <span>点击卡片可直接跳转到对应功能页面</span>
            </div>
          </div>
          <div class="help-item">
            <div class="help-icon">
              <check-circle-outlined />
            </div>
            <div class="help-text">
              <span>待开票清单支持按零件号、零件名称、验收单号搜索</span>
            </div>
          </div>
          <!-- <div class="help-item">
            <div class="help-icon">
              <car-outlined />
            </div>
            <div class="help-text">
              <span>发运单状态实时更新，预计到货时间仅供参考</span>
            </div>
          </div> -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  FileSearchOutlined,
  CarOutlined,
  InboxOutlined,
  FileTextOutlined,
  UnorderedListOutlined,
  RightOutlined,
  LeftOutlined,
  RocketOutlined,
  ContainerOutlined,
  ScheduleOutlined,
  AccountBookOutlined,
  BellOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons-vue'
import { getDashboardStats, getPendingInvoiceCount, getDashboardMessages } from '@/api/srm'
import { useSessionStore } from '@/stores/session'
import dayjs from 'dayjs'

const router = useRouter()
const session = useSessionStore()

const stats = reactive({
  pendingOrders: 0,
  activeAsn: 0,
  todayArriving: 0,
  pendingInvoiceCount: 0,
  pendingInvoiceGeneral: 0,
  pendingInvoiceBom: 0,
  pendingForecast: 0
})

interface Message {
  type: string
  no: string
  text: string
}

const messages = reactive<Message[]>([])
const currentIndex = ref(0)
let timer: any = null

const notices = reactive([
  { title: '系统升级通知', desc: '每周五 22:00 进行例行维护' },
  { title: '新业务规范发布', desc: '关于发货通知的填写规范' },
  { title: '供应商门户更新', desc: '新增供应商对账平台功能' }
])

const currentDate = computed(() => dayjs().format('YYYY年MM月DD日'))
const weekDay = computed(() => {
  const week = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return week[dayjs().day()]
})

async function loadStats() {
  try {
    const res = await getDashboardStats(session.userId)
    Object.assign(stats, res)
  } catch (e) {
    console.error('Failed to load stats:', e)
  }
}

async function loadMessages() {
  try {
    const res = await getDashboardMessages(session.operatorUserId)
    messages.length = 0
    messages.push(...res)
    if (timer) clearInterval(timer)
    if (messages.length > 1) {
      timer = setInterval(() => {
        currentIndex.value = (currentIndex.value + 1) % messages.length
      }, 4000)
    }
  } catch (e) {
    console.error('Failed to load messages:', e)
  }
}

async function loadInvoiceCount() {
  try {
    const res = await getPendingInvoiceCount(session.operatorUserId)
    stats.pendingInvoiceCount = res.total || 0
    stats.pendingInvoiceGeneral = res.general || 0
    stats.pendingInvoiceBom = res.bom || 0
  } catch (e) {
    console.error('Failed to load invoice count:', e)
  }
}

onMounted(() => {
  loadStats()
  loadInvoiceCount()
  loadMessages()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function go(path: string) {
  if (path === '/delivery-plan') {
    const startDate = dayjs().format('YYYY-MM-DD')
    const endDate = dayjs().add(6, 'day').format('YYYY-MM-DD')
    router.push(`${path}?startDate=${startDate}&endDate=${endDate}`)
  } else {
    router.push(path)
  }
}

function prevMessage() {
  if (messages.length > 0) {
    currentIndex.value = (currentIndex.value - 1 + messages.length) % messages.length
  }
}

function nextMessage() {
  if (messages.length > 0) {
    currentIndex.value = (currentIndex.value + 1) % messages.length
  }
}

function goToMessage(msg: Message) {
  if (msg.type === 'order') {
    router.push('/order-management?status=0')
  } else if (msg.type === 'general') {
    router.push('/invoice/pending/general')
  } else if (msg.type === 'bom') {
    router.push('/invoice/pending/bom')
  }
}

function getIcon(type: string) {
  if (type === 'order') return FileSearchOutlined
  if (type === 'bom') return ContainerOutlined
  return FileTextOutlined
}
</script>

<style scoped>
.dashboard {
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  min-height: 100vh;
}

/* 欢迎区域 */
.welcome-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  border-radius: 16px;
  padding: 32px 40px;
  margin-bottom: 16px;
  color: #fff;
  box-shadow: 0 8px 24px rgba(24, 144, 255, 0.25);
}

.welcome-content h1 {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px;
  color: #fff;
}

.welcome-content p {
  font-size: 14px;
  margin: 0;
  opacity: 0.9;
  color: #fff;
}

.welcome-date {
  text-align: right;
}

.welcome-date .date {
  display: block;
  font-size: 18px;
  font-weight: 500;
  color: #fff;
}

.welcome-date .week {
  display: block;
  font-size: 14px;
  opacity: 0.85;
  margin-top: 4px;
  color: #fff;
}

/* 消息轮播横幅 */
.message-banner {
  margin-bottom: 16px;
}

.message-marquee {
  background: linear-gradient(135deg, #fff7e6 0%, #ffd591 100%);
  border-radius: 8px;
  padding: 4px;
}

.message-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  cursor: pointer;
  transition: all 0.3s;
  color: #d46b08;
  font-weight: 500;
  font-size: 14px;
}

.message-item:hover {
  background: rgba(255, 160, 0, 0.1);
  border-radius: 6px;
}

.message-icon {
  color: #fa8c16;
  font-size: 16px;
}

.message-count {
  margin-left: auto;
  font-size: 12px;
  color: #8c8c8c;
}

.message-nav {
  color: #8c8c8c;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
  transition: all 0.3s;
}

.message-nav:hover {
  color: #fa8c16;
}

.prev {
  margin-left: 8px;
}

/* 核心指标 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

@media (max-width: 991px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 575px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #f0f0f0;
  position: relative;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.stat-card.has-value {
  border-color: transparent;
  background: linear-gradient(#fff, #fff) padding-box,
              linear-gradient(135deg, #ff4d4f, #ff7875) border-box;
}

.stat-card.has-value .stat-value {
  color: #ff4d4f;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-right: 16px;
}

.stat-primary .stat-icon {
  background: linear-gradient(135deg, #fff2e8 0%, #ffd591 100%);
  color: #fa541c;
}

.stat-success .stat-icon {
  background: linear-gradient(135deg, #f6ffed 0%, #b7eb8f 100%);
  color: #52c41a;
}

.stat-warning .stat-icon {
  background: linear-gradient(135deg, #e6fffb 0%, #87e8de 100%);
  color: #13c2c2;
}

.stat-danger .stat-icon {
  background: linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%);
  color: #ff4d4f;
}

.stat-info .stat-icon {
  background: linear-gradient(135deg, #e6f4ff 0%, #adc6ff 100%);
  color: #597ef7;
}

.stat-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #262626;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: #8c8c8c;
  margin-top: 4px;
}

.stat-arrow {
  color: #d9d9d9;
  font-size: 16px;
  transition: all 0.3s;
}

.stat-card:hover .stat-arrow {
  color: #1890ff;
  transform: translateX(4px);
}

/* 快捷入口 */
.quick-actions {
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title :deep(.anticon) {
  color: #1890ff;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 991px) {
  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 575px) {
  .actions-grid {
    grid-template-columns: 1fr;
  }
}

.action-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #f0f0f0;
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border-color: #1890ff;
}

.action-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin-right: 16px;
}

.action-icon.bg-blue {
  background: linear-gradient(135deg, #e6f7ff 0%, #91d5ff 100%);
  color: #1890ff;
}

.action-icon.bg-purple {
  background: linear-gradient(135deg, #f9f0ff 0%, #d9b8ff 100%);
  color: #722ed1;
}

.action-icon.bg-orange {
  background: linear-gradient(135deg, #fff7e6 0%, #ffd591 100%);
  color: #fa8c16;
}

.action-icon.bg-green {
  background: linear-gradient(135deg, #f6ffed 0%, #b7eb8f 100%);
  color: #52c41a;
}

.action-icon.bg-teal {
  background: linear-gradient(135deg, #e6fffb 0%, #87e8de 100%);
  color: #13c2c2;
}

.action-icon.bg-indigo {
  background: linear-gradient(135deg, #e6f4ff 0%, #adc6ff 100%);
  color: #597ef7;
}

.action-text {
  display: flex;
  flex-direction: column;
}

.action-title {
  font-size: 15px;
  font-weight: 600;
  color: #262626;
}

.action-desc {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
}

/* 底部区域 */
.bottom-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 767px) {
  .bottom-section {
    grid-template-columns: 1fr;
  }
}

.notice-card,
.help-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #f0f0f0;
}

.card-header {
  margin-bottom: 16px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #262626;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title :deep(.anticon) {
  color: #1890ff;
}

.notice-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notice-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  transition: all 0.3s;
}

.notice-item:hover {
  background: #f0f7ff;
}

.notice-dot {
  width: 8px;
  height: 8px;
  background: #1890ff;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}

.notice-content {
  display: flex;
  flex-direction: column;
}

.notice-title {
  font-size: 14px;
  font-weight: 500;
  color: #262626;
}

.notice-desc {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 2px;
}

.help-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.help-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 8px;
}

.help-icon {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #e6f7ff 0%, #91d5ff 100%);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1890ff;
  font-size: 14px;
}

.help-text {
  flex: 1;
}

.help-text span {
  font-size: 13px;
  color: #595959;
}
</style>