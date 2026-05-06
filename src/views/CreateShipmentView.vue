<template>
  <div class="srm-page">
    <div class="srm-card-title">发运信息新增</div>

    <a-layout style="background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
      <!-- 左侧表单区域 -->
      <!-- <a-layout-sider width="500" style="background: #fafafa; padding: 16px; border-radius: 8px; margin-right: 16px;">
      
      </a-layout-sider> -->

      <!-- 右侧发运明细区域 -->
      <a-layout-content style="flex: 1;">
          <a-card size="small">
          <a-form layout="vertical" :model="formData">
            <a-row :gutter="16">
              <a-col :span="8">
                <a-form-item label="供应商名称">
                  <a-input v-model:value="formData.supplierName" disabled />
                </a-form-item>
              </a-col>
              <!-- <a-col :span="8">
                <a-form-item label="送货工厂">
                  <a-input v-model:value="formData.shipToPlant" disabled />
                </a-form-item>
              </a-col> -->
               <a-col :span="8">
                <a-form-item label="发运批次号">
                  <a-input v-model:value="formData.shipmentBatchNo"  />
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="16">
              <a-col :span="8">
                <a-form-item label="联系人" required>
                  <a-input v-model:value="formData.contactName" placeholder="请输入联系人" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="联系电话" required>
                  <a-input v-model:value="formData.contactPhone" placeholder="请输入联系电话" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="联系邮箱">
                  <a-input v-model:value="formData.contactEmail" placeholder="请输入联系邮箱" />
                </a-form-item>
              </a-col>
            </a-row>

            <a-row :gutter="16">
              <!-- <a-col :span="8">
                <a-form-item label="承运商实际提货日期">
                  <a-input v-model:value="formData.actualPickupDate" disabled />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="计划送达工厂日期">
                  <a-input v-model:value="formData.plannedDeliveryDate" disabled />
                </a-form-item>
              </a-col> -->
               <!-- <a-col :span="8">
                <a-form-item label="承运商名称">
                  <a-input v-model:value="formData.carrierName" disabled />
                </a-form-item>
              </a-col> -->
            </a-row>
          </a-form>
        </a-card>
        <a-card size="small" title="发运明细">
          <a-table
            :columns="detailColumns"
            :data-source="detailRows"
            :pagination="false"
            row-key="order_detail_id"
            size="middle"
          >
            <template #bodyCell="{ column, record, text }">
              <template v-if="column.key === 'need_date'">
                {{ formatDate(text) }}
              </template>
              <template v-else-if="column.key === 'current_shipped_qty'">
                <a-input-number
                  v-model:value="record.current_shipped_qty"
                  :min="1"
                  :max="record.remaining_qty"
                  :precision="0"
                  style="width: 100%"
                  @change="handleShippedQtyChange(record)"
                />
              </template>
              <template v-else-if="column.key === 'remaining_qty'">
                <span :style="{ color: record.remaining_qty <= 0 ? '#ff4d4f' : '#52c41a' }">
                  {{ text }}
                </span>
              </template>
              <template v-else-if="column.key === 'ship_date'">
                 <a-date-picker
                  v-model:value="record.ship_date"
                  type="date" format="YYYY-MM-DD"
                  placeholder="选择日期">
                </a-date-picker>
              </template>
              <template v-else-if="column.key === 'actual_eta_date'">
                 <a-date-picker
                  v-model:value="record.actual_eta_date"
                  type="date" format="YYYY-MM-DD"
                  placeholder="选择日期">
                </a-date-picker>
              </template>
              <template  v-else-if="column.key === 'warehouse_in_no'">
              <a-input
                v-model:value="record.warehouse_in_no"
                placeholder="请输入进仓单号"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="link" danger size="small" @click="removeDetailRow(record)">删除</a-button>
            </template>
            </template>
            
          </a-table>
        </a-card>
      </a-layout-content>
    </a-layout>

    <div style="text-align: right">
      <a-space>
        <a-button @click="handleCancel">取消</a-button>
        <a-button v-if="session.isSupplierClient" type="primary" :loading="submitting" @click="handleSubmit">创建发运申请</a-button>
      </a-space>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { useSessionStore } from '@/stores/session'
import { createAsnFromOrders, getOrderById } from '@/api/srm'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()
const session = useSessionStore()

const formData = reactive({
  supplierName: '',
  shipToPlant: '',
  shipmentBatchNo: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  actualPickupDate: '',
  plannedDeliveryDate: '',
  carrierName: '默认承运商'
})

const detailRows = ref<any[]>([])
const submitting = ref(false)

const detailColumns = [
    { title: '订单号', dataIndex: 'order_no', key: 'order_no', width: 150 },
    { title: '零件号', dataIndex: 'parts_number', key: 'parts_number', width: 120 },
    { title: '零件名称', dataIndex: 'parts_name', key: 'parts_name', width: 200 },
    { title: '订单数量', dataIndex: 'need_number', key: 'need_number', width: 100, align: 'right' },
    { title: '确认数量', dataIndex: 'need_number', key: 'need_number', width: 100, align: 'right' },
    { title: '已申请发运数量', dataIndex: 'shipped_qty', key: 'shipped_qty', width: 120, align: 'right' },
    { title: '剩余可申请发数量', dataIndex: 'remaining_qty', key: 'remaining_qty', width:120, align: 'right' },
    { title: '本次发运数量', dataIndex: 'current_shipped_qty', key: 'current_shipped_qty', width: 120, align: 'right' },
    { title: '要求到货日期', dataIndex: 'need_date', key: 'need_date', width: 120 },
    { title: '实际发货时间', dataIndex: 'ship_date', key: 'ship_date', width: 120 },
    { title: '实际到货时间', dataIndex: 'actual_eta_date', key: 'actual_eta_date', width: 120 },
    { title: '进仓单号', dataIndex: 'warehouse_in_no', key: 'warehouse_in_no', width: 120, scopedSlots: { customRender: 'warehouse_in_no' } },
    { title: '操作', key: 'action', width: 80, fixed: 'right' }
  ]

async function loadOrderDetails() {
  const orderId = route.query.orderId as string
  const orderIds = route.query.orderIds as string
  const selectedDetailIds = route.query.selectedDetailIds as string
  const selectedIds = route.query.selectedIds as string

  // 判断是订单纬度还是零件纬度
  // 零件纬度: orderIds + selectedDetailIds (多个订单，筛选指定详情) 或 orderId + selectedDetailIds (单个订单，筛选指定详情)
  // 订单纬度: selectedIds (多个订单，展示所有详情)
  const isOrderLevel = !!selectedIds && !orderId && !orderIds // 只有selectedIds则是订单纬度

  if (isOrderLevel) {
    // 订单纬度：加载多个订单的详情
    await loadMultipleOrdersDetails(selectedIds)
    return
  }

  // 零件纬度：orderIds (多订单) + selectedDetailIds 或 orderId (单订单) + selectedDetailIds
  const hasOrderIds = !!orderIds && orderIds !== 'undefined'
  const hasOrderId = !!orderId && orderId !== 'undefined'
  const hasSelectedDetailIds = !!selectedDetailIds && selectedDetailIds !== 'undefined' && selectedDetailIds !== 'null' && selectedDetailIds.trim() !== ''

  if (!hasOrderIds && !hasOrderId) {
    message.error('未选择订单')
    router.push('/order-management')
    return
  }

  // 确定要加载的订单ID列表
  const orderIdList = hasOrderIds
    ? orderIds.split(',').filter(id => id.trim())
    : [orderId]

  // 确定要筛选的详情ID列表
  const detailIdsToFilter = hasSelectedDetailIds
    ? selectedDetailIds.split(',').filter(id => id.trim())
    : []

  try {
    const today = dayjs().format('YYYY-MM-DD')
    const allDetails: any[] = []
    let supplierName = ''

    // 逐个加载订单详情
    for (const oid of orderIdList) {
      const result = await getOrderById(oid.trim(), session.operatorUserId)
      const order = result.order
      const details = result.details || []

      if (!supplierName && order.supplier_name) {
        supplierName = String(order.supplier_name)
      }

      details.forEach((detail: any) => {
        // 如果没有选中ID筛选，则展示所有；否则只展示选中的
        const isSelected = detailIdsToFilter.length === 0 || detailIdsToFilter.includes(String(detail.order_detail_id))
        // 只展示已确认的零件（supplier_order_status !== 0）且被选中的
        if (detail.supplier_order_status !== 0 && isSelected) {
          allDetails.push({
            ...detail,
            order_no: order.order_no,
            asnList: []
          })
        }
      })
    }

    detailRows.value = allDetails.map((item: any) => ({
      ...item,
      current_shipped_qty: item.remaining_qty,
      confirmShipmentDate: today,
      warehouseInNo: ''
    }))

    // 设置联系人信息
    formData.supplierName = supplierName

    if (detailRows.value.length > 0) {
      formData.shipToPlant = detailRows.value[0].ship_to_plant || ''
      const earliestDate = detailRows.value.reduce((min: string, item: any) => {
        if (!item.need_date) return min
        if (!min || item.need_date < min) return item.need_date
        return min
      }, '')
      formData.plannedDeliveryDate = formatDate(earliestDate)
    }
  } catch (e: any) {
    message.error(e.response?.data?.message || '加载订单详情失败')
    router.push('/order-management')
  }
}

async function loadMultipleOrdersDetails(orderIdsStr: string) {
  // 订单纬度：加载多个订单的详情
  const orderIds = orderIdsStr.split(',').filter(id => id.trim())
  if (orderIds.length === 0) {
    message.error('未选择订单')
    router.push('/order-management')
    return
  }

  try {
    const today = dayjs().format('YYYY-MM-DD')
    const allDetails: any[] = []
    let supplierName = ''

    // 逐个加载订单详情
    for (const orderId of orderIds) {
      const result = await getOrderById(orderId.trim(), session.operatorUserId)
      const order = result.order
      const details = result.details || []

      if (!supplierName && order.supplier_name) {
        supplierName = String(order.supplier_name)
      }

      details.forEach((detail: any) => {
        // 只展示已确认的零件（supplier_order_status !== 0）
        if (detail.supplier_order_status !== 0) {
          allDetails.push({
            ...detail,
            order_no: order.order_no,
            asnList: []
          })
        }
      })
    }

    detailRows.value = allDetails.map((item: any) => ({
      ...item,
      current_shipped_qty: item.remaining_qty,
      confirmShipmentDate: today,
      warehouseInNo: ''
    }))

    formData.supplierName = supplierName

    if (detailRows.value.length > 0) {
      formData.shipToPlant = detailRows.value[0].ship_to_plant || ''
      const earliestDate = detailRows.value.reduce((min: string, item: any) => {
        if (!item.need_date) return min
        if (!min || item.need_date < min) return item.need_date
        return min
      }, '')
      formData.plannedDeliveryDate = formatDate(earliestDate)
    }
  } catch (e: any) {
    message.error(e.response?.data?.message || '加载订单详情失败')
    router.push('/order-management')
  }
}

function handleShippedQtyChange(record: any) {
  if (record.current_shipped_qty > record.remaining_qty) {
    message.error('发运数量不可超过订单剩余可发量')
    record.current_shipped_qty = record.remaining_qty
  }
  if (record.current_shipped_qty <= 0) {
    message.warning('发运数量必须大于0')
    record.current_shipped_qty = 1
  }
}

async function handleSubmit() {
  if (!formData.contactName.trim()) {
    message.error('请输入联系人')
    return
  }
  if (!formData.contactPhone.trim()) {
    message.error('请输入联系电话')
    return
  }

  const validRows = detailRows.value.filter(row => row.current_shipped_qty > 0)
  if (validRows.length === 0) {
    message.error('请至少填写一行发运数量')
    return
  }

  submitting.value = true
  try {
    const lines = validRows.map(row => ({
      orderDetailId: row.order_detail_id,
      shippedQty: row.current_shipped_qty,
      confirmShipmentDate: row.confirmShipmentDate,
      warehouseInNo: row.warehouse_in_no,
      shipDate: row.ship_date ? dayjs(row.ship_date).format('YYYY-MM-DD') : undefined,
      actualEtaDate: row.actual_eta_date ? dayjs(row.actual_eta_date).format('YYYY-MM-DD') : undefined
    }))

    await createAsnFromOrders({
      operatorUserId: session.operatorUserId,
      contactInfo: {
        contactName: formData.contactName,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail
      },
      lines
    })

    message.success('发运信息创建成功')
    router.push('/shipments')
  } catch (e: any) {
    message.error(e.response?.data?.message || '创建失败')
  } finally {
    submitting.value = false
  }
}

function removeDetailRow(record: any) {
  const idx = detailRows.value.findIndex((r: any) => r.order_detail_id === record.order_detail_id)
  if (idx !== -1) {
    detailRows.value.splice(idx, 1)
  }
}

function handleCancel() {
  Modal.confirm({
    title: '确认取消',
    content: '取消后当前发运信息将不会保存，是否确认返回？',
    onOk: () => {
      router.push('/order-management')
    }
  })
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return dayjs(dateStr).format('YYYY-MM-DD')
}

onMounted(() => {
  formData.actualPickupDate = dayjs().format('YYYY-MM-DD')
  formData.shipmentBatchNo = 'SHIP-' + dayjs().format('YYYYMMDD') + '-' + Math.floor(Math.random() * 1000)
  
  loadOrderDetails()
})
</script>

<style scoped>
.srm-page {
  background: #f0f2f5;
  min-height: 100vh;
}

.srm-card-title {
  font-size: 20px;
  font-weight: 500;
  color: #1f1f1f;
  margin-bottom: 16px;
}
</style>
