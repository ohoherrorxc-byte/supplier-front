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
          class="invoice-info-table"
          :columns="invoiceColumns"
          :data-source="invoiceLines"
          :pagination="false"
          :scroll="{ x: invoiceTableScrollX }"
          row-key="key"
          size="small"
          table-layout="fixed"
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
              <span class="invoice-project-name">{{ record.projectName }}</span>
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
              {{ formatMoney(record.amount, record.currency) }}
            </template>
            <template v-else-if="column.key === 'taxAmount'">
              <!-- <a-input-number disabled
                v-model:value="record.taxAmount"
                :min="0"
                :precision="2"
                style="width: 100%"
                placeholder="税额"
              /> -->
              {{ formatMoney(record.taxAmount, record.currency) }}
            </template>
            <template v-else-if="column.key === 'currency'">
              {{ record.currency || '' }}
            </template>
            <template v-else-if="column.key === 'totalAmount'">
              <!-- <a-input-number disabled
                v-model:value="record.totalAmount"
                :min="0"
                :precision="2"
                style="width: 100%"
                placeholder="价税合计"
              /> -->
              {{ formatMoney(record.totalAmount, record.currency) }}
            </template>
            <template v-else-if="column.key === 'fileName'">
              <a
                v-if="record.fileUrl"
                class="invoice-file-link"
                href="javascript:void(0)"
                :title="record.fileName"
                @click="downloadFile(record.fileUrl, record.fileName)"
              >
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
            {{ formatMoney(totalInvoiceAmount) }}
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
          :key="showOriginalCurrency ? 'detail-original' : 'detail-rmb'"
          :columns="detailColumns"
          :data-source="selectedDetails"
          :pagination="false"
          row-key="acceptDetailId"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'quantity'">
              {{ Number(record.quantity || 0).toFixed(2) }}
            </template>
            <template v-if="column.key === 'amount'">
              {{ formatMoney(record.amount, 'RMB') }}
            </template>
            <template v-if="column.key === 'originalAmount'">
              {{ formatMoney(record.originalAmount, record.currency) }}
            </template>
            <template v-if="column.key === 'currency'">
              {{ record.currency || '' }}
            </template>
          </template>
        </a-table>

       

        <!-- 金额汇总：验收总金额取验收单人民币总额，不按明细加总 -->
        <div style="margin-top: 16px; text-align: right; font-size: 16px">
          <span>验收单总金额：</span>
          <strong style="color: #1890ff; font-size: 20px">{{ formatMoney(totalDetailAmount) }}</strong>
          <span style="margin-left: 24px; color: #666">发票总金额：</span>
          <strong :style="{ color: amountMatch ? '#52c41a' : '#ff4d4f', fontSize: '20px' }">
            {{ formatMoney(totalInvoiceAmount) }}
          </strong>
        </div>

        <!-- 金额校验提示：按分比较，避免浮点误差误报 -->
        <div v-if="!amountMatch" style="margin-top: 8px; text-align: right; color: #ff4d4f">
          {{ amountDiff < 0 ? '发票金额偏小' : '发票金额偏大' }}：相差{{ formatMoney(Math.abs(amountDiff)) }}（须完全一致）
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
import { createSettlementOrder, ocrRecognize, uploadFile, checkDraftSettlement, checkUsedInvoices, downloadFile, getInvoiceDetailsByApplyNos, listPendingInvoiceGeneral, listPendingInvoiceBom } from '@/api/srm'
import { completionAttachmentRequired, orderAttachmentRequired, roundMoney, shouldSkipInvoiceLineCount, validateInvoiceRules } from './invoiceSubmitRules'
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

const isCompletionRequired = computed(() => completionAttachmentRequired(orderType.value))
const isOrderRequired = computed(() => orderAttachmentRequired(orderType.value || ''))

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
  currency: string
}

const invoiceLines = ref<InvoiceLine[]>([])

function isForeignCurrency(currency: unknown): boolean {
  const s = String(currency ?? '').trim().toUpperCase()
  return s !== '' && s !== 'RMB' && s !== 'CNY' && s !== '人民币'
}

const foreignCurrency = computed(() => {
  const fromInvoice = invoiceLines.value.find(line => isForeignCurrency(line.currency))?.currency
  if (fromInvoice) return String(fromInvoice).trim().toUpperCase()
  const fromDetail = selectedDetails.value.find(d => isForeignCurrency(d.currency))?.currency
  return fromDetail ? String(fromDetail).trim().toUpperCase() : ''
})

const isForeign = computed(() => !!foreignCurrency.value)

function detailSupplierName(detail: any) {
  return String(detail?.supplierName || detail?.supplier_name || '').trim()
}

const isCerenceSupplier = computed(() =>
  selectedDetails.value.some(d => detailSupplierName(d).toLowerCase() === 'cerence gmbh')
)

const skipInvoiceLineCountCheck = computed(() =>
  shouldSkipInvoiceLineCount(selectedDetails.value.map((d) => detailSupplierName(d)))
)

const showOriginalCurrency = computed(() => isForeign.value || isCerenceSupplier.value)

function formatMoney(value: unknown, currency?: string) {
  if (value == null || value === '') return ''
  const n = Number(value)
  if (Number.isNaN(n)) return ''
  const text = n.toFixed(2)
  const code = String(currency || (isForeign.value ? foreignCurrency.value : 'RMB')).trim().toUpperCase()
  if (isForeignCurrency(code)) return `${code} ${text}`
  return `¥${text}`
}

function detailCompareAmount(detail: any) {
  if (showOriginalCurrency.value) return Number(detail?.originalAmount ?? detail?.amount ?? 0)
  return Number(detail?.amount || 0)
}

const nowrapCell = () => ({ style: { whiteSpace: 'nowrap' } })

const invoiceColumns = computed(() => {
  const cols: any[] = [
    { title: '发票号码', key: 'invoiceNo', width: 210, customCell: nowrapCell, customHeaderCell: nowrapCell },
    { title: '开票日期', key: 'invoiceDate', width: 120, customCell: nowrapCell, customHeaderCell: nowrapCell },
    { title: '品名', key: 'projectName', width: 280 },
    { title: '零件号', key: 'partNo', width: 130, customCell: nowrapCell, customHeaderCell: nowrapCell },
    { title: '数量', key: 'quantity', width: 80, align: 'right', customCell: nowrapCell, customHeaderCell: nowrapCell },
    { title: '单位', key: 'unit', width: 70, customCell: nowrapCell, customHeaderCell: nowrapCell },
    { title: '税率(%)', key: 'taxRate', width: 90, customCell: nowrapCell, customHeaderCell: nowrapCell },
    { title: '金额(不含税)', key: 'amount', width: 140, align: 'right', customCell: nowrapCell, customHeaderCell: nowrapCell },
    { title: '税额', key: 'taxAmount', width: 110, align: 'right', customCell: nowrapCell, customHeaderCell: nowrapCell },
    { title: '价税合计', key: 'totalAmount', width: 120, align: 'right', customCell: nowrapCell, customHeaderCell: nowrapCell }
  ]
  if (showOriginalCurrency.value) {
    cols.push({ title: '币种', key: 'currency', width: 80, customCell: nowrapCell, customHeaderCell: nowrapCell })
  }
  cols.push({ title: '附件', key: 'fileName', width: 280 })
  cols.push({ title: '操作', key: 'action', width: 80, customCell: nowrapCell, customHeaderCell: nowrapCell })
  return cols
})

const invoiceTableScrollX = computed(() =>
  invoiceColumns.value.reduce((sum, col) => sum + Number(col.width || 0), 0)
)

const detailColumns = computed(() => {
  const cols: any[] = [
    { title: '品名', dataIndex: 'partsName', key: 'partsName', width: 180 },
    { title: '详述及技术性能', dataIndex: 'remark', key: 'remark', width: 180 },
    { title: '零件号', dataIndex: 'partsNo', key: 'partsNo', width: 120 },
    { title: '单位', dataIndex: 'unitName', key: 'unitName', width: 60 },
    { title: '验收单号', dataIndex: 'acceptApplyNo', key: 'acceptApplyNo', width: 180 },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80, align: 'right' },
    { title: '金额', dataIndex: 'amount', key: 'amount', width: 120, align: 'right' }
  ]
  if (showOriginalCurrency.value) {
    cols.push({ title: '原币', dataIndex: 'originalAmount', key: 'originalAmount', width: 130, align: 'right' })
    cols.push({ title: '币种', dataIndex: 'currency', key: 'currency', width: 70 })
  }
  return cols
})

/** 验收总金额：优先验收单表头人民币/原币总额，不按明细行加总 */
const totalDetailAmount = computed(() => {
  const first = selectedDetails.value[0]
  if (!first) return 0
  if (showOriginalCurrency.value) {
    const original = Number(first.acceptAmountOriginal)
    if (!Number.isNaN(original) && original > 0) return roundMoney(original)
  }
  const rmb = Number(first.acceptAmountRmb)
  if (!Number.isNaN(rmb) && first.acceptAmountRmb != null && first.acceptAmountRmb !== '') {
    return roundMoney(rmb)
  }
  // 兼容旧接口未返回表头金额时回退明细加总
  return roundMoney(selectedDetails.value.reduce((sum, d) => sum + detailCompareAmount(d), 0))
})

const totalInvoiceAmount = computed(() => {
  return roundMoney(invoiceLines.value.reduce((sum, line) => sum + Number(line.totalAmount || 0), 0))
})

const amountDiff = computed(() => {
  return roundMoney(totalInvoiceAmount.value - totalDetailAmount.value)
})

const amountMatch = computed(() => {
  return Math.abs(amountDiff.value) < 0.005
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
    acceptApplyNo: '',
    currency: ''
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
        projectName: (r.projectName || '').trim(),
        partNo: r.partNo || '',
        quantity: r.quantity || 0,
        unit: r.unit || '',
        taxRate: r.taxRate === undefined || r.taxRate === null || r.taxRate === '' ? 13 : Number(r.taxRate),
        amount: Number(r.amount || 0),
        taxAmount: Number(r.taxAmount || 0),
        totalAmount: Number(r.totalAmount || 0),
        currency: r.currency || '',
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

  const invoiceNos = [...new Set(
    invoiceLines.value
      .map(line => String(line.invoiceNo || '').replace(/\s/g, ''))
      .filter(Boolean)
  )]
  try {
    const usedResult = await checkUsedInvoices(invoiceNos)
    if (usedResult.used) {
      message.warning(usedResult.message || '该发票已经使用过了，不可重复提交')
      return
    }
  } catch (e: any) {
    message.error(e.response?.data?.message || e.message || '发票号校验失败')
    return
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

  const orderTypeStr = selectedDetails.value[0]?.purchaseOrderType || ''
  const ruleError = validateInvoiceRules({
    orderType: orderTypeStr,
    skipLineCount: skipInvoiceLineCountCheck.value,
    invoiceTotal: totalInvoiceAmount.value,
    acceptTotal: totalDetailAmount.value,
    orderFileCount: orderFiles.value.length,
    completionFileCount: completionFiles.value.length,
    formatAmount: (amount, currency) => formatMoney(amount, currency),
    invoices: invoiceLines.value.map(line => ({
      invoiceDate: line.invoiceDate ? dayjs(line.invoiceDate).format('YYYY-MM-DD') : null,
      projectName: line.projectName,
      partNo: line.partNo,
      quantity: line.quantity,
      unit: line.unit,
      totalAmount: line.totalAmount,
      currency: line.currency,
      attachmentId: line.attachmentId,
      fileUrl: line.fileUrl,
      fileName: line.fileName
    })),
    details: selectedDetails.value.map(detail => ({
      partsName: detail.partsName,
      partsNo: detail.partsNo,
      unitName: detail.unitName,
      quantity: detail.quantity,
      compareAmount: detailCompareAmount(detail),
      acceptDate: detail.acceptDate ? dayjs(detail.acceptDate).format('YYYY-MM-DD') : null
    }))
  })
  if (ruleError) {
    message.warning(ruleError)
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
      currency: line.currency || (isForeign.value ? foreignCurrency.value : 'RMB'),
      attachmentId: line.attachmentId,
      attachmentName: line.fileName,
      attachmentUrl: line.fileUrl,
      acceptApplyNo: line.acceptApplyNo
    }))

    const result = await createSettlementOrder({
      userId: session.operatorUserId,
      supplierName: detailSupplierName(selectedDetails.value[0]),
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
  const totalAmount = Number(totalDetailAmount.value || 0).toFixed(2)
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

<style scoped>
.invoice-project-name {
  display: inline-block;
  max-width: 260px;
  line-height: 22px;
  white-space: normal;
  word-break: break-word;
}

.invoice-file-link {
  display: inline-block;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
</style>