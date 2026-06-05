<template>
  <div style="padding: 24px">
    <h2 style="margin-bottom: 16px">创建结算单</h2>

    <a-spin :spinning="submitting">
      <!-- 发票信息表格 -->
      <a-card title="发票信息" style="margin-bottom: 16px">
        <template #extra> 
        </template>
        <el-row>
          <el-col :span="24">
            <a-upload
              :before-upload="handleFileUpload"
              :show-upload-list="false"
              accept=".pdf,.jpg,.jpeg,.png"
            >
            <a-button type="primary">
              <UploadOutlined /> 上传发票
            </a-button>
          </a-upload>
          </el-col>
        </el-row>
        <a-table
          :columns="invoiceColumns"
          :data-source="invoiceLines"
          :pagination="false"
          row-key="key"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'invoiceNo'">
              {{ record.invoiceNo }}
              <!-- <a-input disabled v-model:value="record.invoiceNo" placeholder="发票号码" /> -->
            </template>
            <template v-else-if="column.key === 'invoiceDate'">
              <!-- <a-date-picker disabled
                v-model:value="record.invoiceDate"
                format="YYYY-MM-DD"
                placeholder="开票日期"
                style="width: 100%"
              /> -->
              {{ record.invoiceDate ? dayjs(record.invoiceDate).format('YYYY-MM-DD') : '' }}
            </template>
            <template v-else-if="column.key === 'projectName'">
              <!-- <a-input disabled v-model:value="record.projectName" placeholder="项目名称" /> -->
              {{ record.projectName }}
            </template>
            <template v-else-if="column.key === 'partNo'">
              <!-- <a-input  disabled v-model:value="record.partNo" placeholder="零件号" /> -->
              {{ record.partNo }}
            </template>
            <template v-else-if="column.key === 'quantity'">
              {{ record.quantity || 0 }}
            </template>
            <template v-else-if="column.key === 'unit'">
              {{ record.unit || '' }}
            </template>
            <template v-else-if="column.key === 'taxRate'">
              <!-- <a-input-number disabled
                v-model:value="record.taxRate"
                :min="0"
                :max="100"
                style="width: 100%"
                placeholder="税率"
              /> -->
              {{ record.taxRate }}%
            </template>
            <template v-else-if="column.key === 'amount'">
              <!-- <a-input-number disabled
                v-model:value="record.amount"
                :min="0"
                :precision="2"
                style="width: 100%"
                placeholder="金额(不含税)"
              /> -->
              {{ record.amount ? `¥${Number(record.amount).toFixed(2)}` : '' }}
            </template>
            <template v-else-if="column.key === 'taxAmount'">
              <!-- <a-input-number disabled
                v-model:value="record.taxAmount"
                :min="0"
                :precision="2"
                style="width: 100%"
                placeholder="税额"
              /> -->
              {{ record.taxAmount ? `¥${Number(record.taxAmount).toFixed(2)}` : '' }}
            </template>
            <template v-else-if="column.key === 'totalAmount'">
              <!-- <a-input-number disabled
                v-model:value="record.totalAmount"
                :min="0"
                :precision="2"
                style="width: 100%"
                placeholder="价税合计"
              /> -->
              {{ record.totalAmount ? `¥${Number(record.totalAmount).toFixed(2)}` : '' }}
            </template>
            <template v-else-if="column.key === 'fileName'">
              <a href="javascript:void(0)" v-if="record.fileUrl" @click="downloadFile(record.fileUrl, record.fileName)">
                {{ record.fileName }}
              </a>
              <span v-else>-</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="link" danger size="small" @click="removeInvoiceLine(record.key)">
                删除
              </a-button>
            </template>
          </template>
        </a-table>

        <div v-if="ocrLoading" style="margin-top: 8px; color: #1890ff">
          <LoadingOutlined /> OCR识别中...
        </div>

        <div style="margin-top: 8px; color: #999; font-size: 12px">
          提示：如发票识别有误，请联系IT工作人员
        </div>

        <!-- 发票汇总金额 -->
        <div style="margin-top: 16px; text-align: right; font-size: 16px">
          <span>发票总金额：</span>
          <strong style="color: #1890ff; font-size: 20px">
            ¥{{ totalInvoiceAmount.toFixed(2) }}
          </strong>
        </div>
      </a-card>

      <!-- 关联验收明细 -->
      <a-card title="关联验收明细" style="margin-bottom: 16px">
        <div v-if="selectedDetails.length > 0" style="margin-bottom: 12px; padding: 8px 12px; background: #f5f5f5; border-radius: 4px; display: flex; gap: 24px;">
          <div>
            <span style="font-weight: 500;">项目名称：</span>
            <span>{{ selectedDetails[0]?.projectName || '-' }}</span>
          </div>
          <div v-if="selectedDetails[0]?.acceptDate">
            <span style="font-weight: 500;">验收归档时间：</span>
            <span>{{ dayjs(selectedDetails[0].acceptDate).format('YYYY-MM-DD') }}</span>
          </div>
        </div>
        <a-table
          :columns="detailColumns"
          :data-source="selectedDetails"
          :pagination="false"
          row-key="accept_detail_id"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'quantity'">
              {{ Number(record.quantity || 0).toFixed(2) }}
            </template>
            <template v-if="column.key === 'amount'">
              {{ Number(record.amount || 0).toFixed(2) }}
            </template>
          </template>
        </a-table>

       

        <!-- 金额汇总 -->
        <div style="margin-top: 16px; text-align: right; font-size: 16px">
          <span>勾选明细总金额：</span>
          <strong style="color: #1890ff; font-size: 20px">¥{{ totalDetailAmount.toFixed(2) }}</strong>
          <span style="margin-left: 24px; color: #666">发票总金额：</span>
          <strong :style="{ color: amountMatch ? '#52c41a' : '#ff4d4f', fontSize: '20px' }">
            ¥{{ totalInvoiceAmount.toFixed(2) }}
          </strong>
        </div>

        <!-- 金额校验提示 -->
        <div v-if="amountDiff !== 0" style="margin-top: 8px; text-align: right; color: #ff4d4f">
          {{ amountDiff < 0 ? '发票金额偏小' : '发票金额偏大' }}：相差¥{{ Math.abs(amountDiff).toFixed(2) }}
          <span v-if="Math.abs(amountDiff) > tolerance" style="color: #ff4d4f">（数据不一致）</span>
          <span v-else style="color: #52c41a">（数据一致）</span>
        </div>
      </a-card>

      <!-- 完工单附件 -->
      <a-card style="margin-bottom: 16px">
        <template #title>
          <span>账单/完工单附件</span>
          <span v-if="isCompletionRequired" style="color: #ff4d4f"> *</span>
        </template>
        <a-upload
          :before-upload="handleCompletionFileUpload"
          :show-upload-list="true"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
        >
          <a-button type="primary">
            <UploadOutlined /> 上传账单/完工单
          </a-button>
        </a-upload>
        <div v-if="isCompletionRequired" style="margin-top: 12px; text-align: center; border-top: 1px dashed #ddd; padding-top: 12px">
          <a-button type="link" @click="downloadCompletionTemplate">
            <DownloadOutlined /> 下载完工单模版
          </a-button>
        </div>
      </a-card>

      <!-- 订单附件 -->
      <a-card style="margin-bottom: 16px">
        <template #title>
          <span>订单附件</span>
          <span v-if="isOrderRequired" style="color: #ff4d4f"> *</span>
        </template>
        <a-upload
          :before-upload="handleOrderFileUpload"
          :show-upload-list="true"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
        >
          <a-button type="primary">
            <UploadOutlined /> 上传订单附件
          </a-button>
        </a-upload>
      </a-card>

      <!-- 备注 -->
      <a-card title="备注" style="margin-bottom: 16px">
        <a-textarea v-model:value="remark" :rows="2" placeholder="可选填写备注信息" />
      </a-card>

      <!-- 操作按钮 -->
      <div style="text-align: center">
        <a-button @click="onCancel" style="margin-right: 16px">取消</a-button>
        <a-button type="primary" @click="onSubmit" :loading="submitting">
          保存结算单
        </a-button>
      </div>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { createSettlementOrder, ocrRecognize, uploadFile, checkDraftSettlement, downloadFile, getInvoiceDetailsByApplyNos, listPendingInvoiceGeneral, listPendingInvoiceBom } from '@/api/srm'
import { useSessionStore } from '@/stores/session'
import { LoadingOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()
const session = useSessionStore()

const submitting = ref(false)
const ocrLoading = ref(false)
const selectedDetails = ref<any[]>([])
const remark = ref('')
const completionFiles = ref<{ id: number; name: string; url: string }[]>([])
const orderFiles = ref<{ id: number; name: string; url: string }[]>([])

const orderType = computed(() => selectedDetails.value[0]?.purchaseOrderType || '')
console.log('订单类型:', orderType.value)
console.log('选中明细:', selectedDetails.value) 

const isCompletionRequired = computed(() => {
  const ot = orderType.value
  return ot === '服务类' || ot === '开发费及其他' || ot === '其他'
})
const isOrderRequired = computed(() => {
  const ot = (orderType.value || '').toLowerCase()
  return ot.includes('license') || ot.includes('lisence')
})

interface InvoiceLine {
  key: string
  invoiceNo: string
  invoiceDate: any
  projectName: string
  partNo: string
  quantity: number
  unit: string
  taxRate: number
  amount: number
  taxAmount: number
  totalAmount: number
  attachmentId: number | null
  fileName: string
  fileUrl: string,
  acceptApplyNo: string
}

const invoiceLines = ref<InvoiceLine[]>([])

const invoiceColumns = [
  { title: '发票号码', key: 'invoiceNo', width: 120 },
  { title: '开票日期', key: 'invoiceDate', width: 120 },
  { title: '品名', key: 'projectName', width: 120 },
  { title: '零件号', key: 'partNo', width: 100 },
  { title: '数量', key: 'quantity', width: 80, align: 'right' },
  { title: '单位', key: 'unit', width: 60 },
  { title: '税率(%)', key: 'taxRate', width: 80 },
  { title: '金额(不含税)', key: 'amount', width: 120, align: 'right' },
  { title: '税额', key: 'taxAmount', width: 100, align: 'right' },
  { title: '价税合计', key: 'totalAmount', width: 120, align: 'right' },
  { title: '附件', key: 'fileName', width: 150 },
  { title: '操作', key: 'action', width: 80 }
]

const detailColumns = [
 
  { title: '品名', dataIndex: 'partsName', key: 'partsName', width: 180 },
  { title: '详述及技术性能', dataIndex: 'remark', key: 'remark' ,width: 180},
   { title: '零件号', dataIndex: 'partsNo', key: 'partsNo', width: 120},
  { title: '单位', dataIndex: 'unitName', key: 'unitName', width: 60},
  { title: '验收单号', dataIndex: 'acceptApplyNo', key: 'acceptApplyNo', width: 180 },
  { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80, align: 'right' },
  { title: '金额', dataIndex: 'amount', key: 'amount', width: 120, align: 'right' }
]

const totalDetailAmount = computed(() => {
  return selectedDetails.value.reduce((sum, d) => sum + Number(d.amount || 0), 0)
})

const totalInvoiceAmount = computed(() => {
  return invoiceLines.value.reduce((sum, line) => sum + Number(line.totalAmount || 0), 0)
})

const amountDiff = computed(() => {
  return totalInvoiceAmount.value - totalDetailAmount.value
})

const tolerance = 1 // 容差 ±1元

const amountMatch = computed(() => {
  return Math.abs(amountDiff.value) <= tolerance
})

function generateKey() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9)
}

function addInvoiceLine() {
  invoiceLines.value.push({
    key: generateKey(),
    invoiceNo: '',
    invoiceDate: null,
    projectName: '',
    partNo: '',
    taxRate: 13,
    amount: 0,
    taxAmount: 0,
    totalAmount: 0,
    attachmentId: null,
    fileName: '',
    fileUrl: '',
    acceptApplyNo: ''
    
  })
}

function removeInvoiceLine(key: string) {
  invoiceLines.value = invoiceLines.value.filter(line => line.key !== key)
}

async function handleFileUpload(file: File) {
  ocrLoading.value = true
  try {
    // 先上传文件到文件服务
    const uploadResult = await uploadFile(file, undefined, 'supplierInvoice')
    const attachmentId = uploadResult.success && uploadResult.id ? uploadResult.id : null

    // 调用OCR识别
    const result: any = await ocrRecognize(file)

    // 支持多张发票：invoiceResults 数组有多条则添加多条
    const results = result.invoiceResults || [result]
    for (let i = 0; i < results.length; i++) {
      const r = results[i]
      const newLine: InvoiceLine = {
        key: generateKey(),
        invoiceNo: r.invoiceNo || '',
        invoiceDate: r.invoiceDate ? dayjs(r.invoiceDate) : null,
        projectName: r.projectName || '',
        partNo: r.partNo || '',
        quantity: r.quantity || 0,
        unit: r.unit || '',
        taxRate: r.taxRate || 13,
        amount: r.amount || 0,
        taxAmount: r.taxAmount || 0,
        totalAmount: r.totalAmount || 0,
        attachmentId: attachmentId,
        fileName: i === 0 ? (uploadResult.name || file.name) : '同上一张发票',
        fileUrl: i === 0 ? (uploadResult.url || '') : '',
        acceptApplyNo: selectedDetails.value[0]?.acceptApplyNo || ''
      }
      invoiceLines.value.push(newLine)
    }

    message.success(result.message || `OCR识别完成，已添加 ${results.length} 条发票`)
  } catch (e: any) {
    message.error(e.message || '处理失败')
  } finally {
    ocrLoading.value = false
  }
  return false // 阻止默认上传
}

async function handleCompletionFileUpload(file: File) {
  try {
    const uploadResult = await uploadFile(file, undefined, 'completionDoc')
    if (uploadResult.success) {
      completionFiles.value.push({
        id: uploadResult.id,
        name: uploadResult.name || file.name,
        url: uploadResult.url || ''
      })
      message.success('上传成功')
    }
  } catch (e: any) {
    message.error(e.message || '上传失败')
  }
  return false // 阻止默认上传
}

async function handleOrderFileUpload(file: File) {
  try {
    const uploadResult = await uploadFile(file, undefined, 'orderDoc')
    if (uploadResult.success) {
      orderFiles.value.push({
        id: uploadResult.id,
        name: uploadResult.name || file.name,
        url: uploadResult.url || ''
      })
      message.success('上传成功')
    }
  } catch (e: any) {
    message.error(e.message || '上传失败')
  }
  return false // 阻止默认上传
}

async function onSubmit() {
  if (invoiceLines.value.length === 0) {
    message.warning('请上传至少一张发票')
    return
  }

  // 验证每行发票
  for (const line of invoiceLines.value) {
    if (!line.invoiceNo) {
      message.warning('请填写所有发票的发票号码')
      return
    }
  }

  if (selectedDetails.value.length === 0) {
    message.warning('没有可结算的明细')
    return
  }

  // 校验所有勾选的明细必须是同一验收申请编号
  const applyNos = [...new Set(selectedDetails.value.map((d: any) => d.acceptApplyNo))]
  if (applyNos.length > 1) {
    message.warning('不允许同时结算不同验收申请编号的明细，请分开操作')
    return
  }

  // 检查是否有草稿结算单
  const acceptDetailIds = selectedDetails.value.map(d => d.acceptDetailId)
  try {
    const checkResult = await checkDraftSettlement(acceptDetailIds)
    if (checkResult.hasDraft) {
      message.warning(checkResult.message || '已有草稿结算单，请勿重复操作')
      return
    }
  } catch (e: any) {
    message.error(e.message || '检查失败')
    return
  }

  // 金额校验
  if (!amountMatch.value) {
    message.warning(`发票金额与验收明细金额不符，相差 ¥${Math.abs(amountDiff.value).toFixed(2)}，请核实后再提交`)
    return
  }

  // 校验发票条目数必须与验收明细条目数一致（逐条对应）
  if (invoiceLines.value.length !== selectedDetails.value.length) {
    message.warning(`发票条目数(${invoiceLines.value.length})与验收明细条目数(${selectedDetails.value.length})不一致，请核实后再提交`)
    return
  }

  // 获取订单类型：硬件PO订单、License、开发费及其他
  const orderTypeStr = selectedDetails.value[0]?.purchaseOrderType || ''

  // 逐条校验：根据订单类型进行不同校验
  for (let i = 0; i < invoiceLines.value.length; i++) {
    const invoice = invoiceLines.value[i]
    const detail = selectedDetails.value[i]
    const errors: string[] = []

    // 硬件PO订单：严格校验（品名、数量、单位、税后金额）
    if (orderTypeStr === '硬件PO订单') {
      if (invoice.projectName && detail.partsName && invoice.projectName !== detail.partsName) {
        errors.push(`品名(${invoice.projectName}≠${detail.partsName})`)
      }
      if (Number(invoice.quantity || 0) !== Number(detail.quantity || 0)) {
        errors.push(`数量(${invoice.quantity}≠${detail.quantity})`)
      }
      if (invoice.unit && detail.unitName && invoice.unit !== detail.unitName) {
        errors.push(`单位(${invoice.unit}≠${detail.unitName})`)
      }
      if (Math.abs(Number(invoice.totalAmount || 0) - Number(detail.amount || 0)) > 0) {
        errors.push(`价税合计(¥${Number(invoice.totalAmount || 0).toFixed(2)}≠¥${Number(detail.amount || 0).toFixed(2)})`)
      }
    }
    // License：校验条目数、总额，但不校验品名
    else if (orderTypeStr === 'License') {
      if (Math.abs(Number(invoice.totalAmount || 0) - Number(detail.amount || 0)) > 0) {
        errors.push(`价税合计(¥${Number(invoice.totalAmount || 0).toFixed(2)}≠¥${Number(detail.amount || 0).toFixed(2)})`)
      }
    }
    // 开发费及其他：不校验品名和条目数，只校验总额
    else {
      if (Math.abs(Number(invoice.totalAmount || 0) - Number(detail.amount || 0)) > 0) {
        errors.push(`价税合计(¥${Number(invoice.totalAmount || 0).toFixed(2)}≠¥${Number(detail.amount || 0).toFixed(2)})`)
      }
    }

    if (errors.length > 0) {
      message.warning(`第${i + 1}条发票与验收明细不一致: ${errors.join(', ')}`)
      return
    }
  }

  // 校验发票日期不能小于验收归档日期
  const acceptDate = selectedDetails.value[0]?.acceptDate
  if (acceptDate) {
    const acceptDateStr = dayjs(acceptDate).format('YYYY-MM-DD')
    for (let i = 0; i < invoiceLines.value.length; i++) {
      const invoiceDateStr = invoiceLines.value[i].invoiceDate ? dayjs(invoiceLines.value[i].invoiceDate).format('YYYY-MM-DD') : null
      if (invoiceDateStr && invoiceDateStr < acceptDateStr) {
        message.warning(`第${i + 1}条开票日期(${invoiceDateStr})不能小于验收归档日期(${acceptDateStr})`)
        return
      }
    }
  }

  // 附件要求校验
  const ot = orderType.value || ''
  const otLower = ot.toLowerCase()
  console.log('附件校验 otLower:', otLower, 'orderFiles:', orderFiles.value.length)
  if (otLower === 'lisence' || otLower.includes('lisence')) {
    if (orderFiles.value.length === 0) {
      message.warning('License类型验收单必须上传订单附件')
      return
    }
  }
  if ((ot === '服务类' || ot === '开发费及其他' || ot === '其他') && completionFiles.value.length === 0) {
    message.warning('服务类类型验收单必须上传账单/完工单附件')
    return
  }

  doSubmit()
}

async function doSubmit() {
  submitting.value = true
  try {
    const acceptDetailIds = selectedDetails.value.map(d => d.acceptDetailId)
    console.log('acceptDetailIds:', acceptDetailIds)

    const invoiceLinesData = invoiceLines.value.map(line => ({
      invoiceNo: line.invoiceNo,
      invoiceDate: line.invoiceDate ? dayjs(line.invoiceDate).format('YYYY-MM-DD') : null,
      projectName: line.projectName,
      partNo: line.partNo,
      quantity: line.quantity,
      unit: line.unit,
      taxRate: line.taxRate,
      amount: line.amount,
      taxAmount: line.taxAmount,
      totalAmount: line.totalAmount,
      attachmentId: line.attachmentId,
      attachmentName: line.fileName,
      attachmentUrl: line.fileUrl,
      acceptApplyNo: line.acceptApplyNo
    }))

    const result = await createSettlementOrder({
      userId: session.operatorUserId,
      supplierName: selectedDetails.value[0]?.supplier_name || '',
      remark: remark.value,
      createDept: session.userId,
      acceptDetailIds,
      invoiceLines: invoiceLinesData,
      completionFiles: completionFiles.value.map(f => ({ id: f.id, name: f.name, url: f.url })),
      orderFiles: orderFiles.value.map(f => ({ id: f.id, name: f.name, url: f.url }))
    })

    message.success(result.message || '结算单创建成功')
    router.push({ name: 'invoice-settlement-list' })
  } catch (e: any) {
    message.error(e.response?.data?.message || e.message || '创建失败')
  } finally {
    submitting.value = false
  }
}

function onCancel() {
  router.back()
}

function downloadCompletionTemplate() {
  const totalAmount = selectedDetails.value.reduce((sum, d) => sum + Number(d.amount || 0), 0).toFixed(2)
  const contractNo = selectedDetails.value[0]?.contractNo || ''
  const supplierName = selectedDetails.value[0]?.supplierName || ''

  // 拼接零件名称
  const partsNames = [...new Set(selectedDetails.value.map((d: any) => d.partsName).filter(Boolean))]
  const docTitle = '上汽海外出行科技有限公司和' + supplierName + partsNames.join('，') + '服务完工单'

  // 调用后端API下载Word文档
  const url = `/api/file/completion-slip-docx?docTitle=${encodeURIComponent(docTitle)}&acceptAmountRmb=${encodeURIComponent(totalAmount)}&contractNo=${encodeURIComponent(contractNo)}`
  window.open(url, '_blank')
}

onMounted(async () => {
  // 从路由参数解析验收单号，调用API获取明细
  if (route.query.applyNos && route.query.type) {
    try {
      const applyNos = JSON.parse(route.query.applyNos as string)
      const type = route.query.type as 'general' | 'bom'
      const result = await getInvoiceDetailsByApplyNos({
        supplierNo: session.supplierNo,
        isAdmin: session.isAdmin,
        applyNos,
        type
      })
      selectedDetails.value = result.items || []
      console.log('获取验收明细:', selectedDetails.value)
    } catch (e) {
      console.error('获取验收明细失败', e)
    }
  }
})
</script>