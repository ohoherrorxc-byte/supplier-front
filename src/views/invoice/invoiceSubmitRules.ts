/** 开票提交校验。与《供应商开票/校验规则》保持一致。 */

export function isFixedAssetOrderType(ot: string) {
  return (ot || '').includes('固定资产')
}

export function isLicenseOrderType(ot: string) {
  const s = (ot || '').toLowerCase()
  return s.includes('license') || s.includes('lisence')
}

export function isDevFeeOrderType(ot: string) {
  return (ot || '') === '开发费及其他'
}

export function roundMoney(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100
}

export function moneyEquals(a: number, b: number) {
  return Math.abs(roundMoney(a) - roundMoney(b)) < 0.005
}

/** 比对用：去掉税收分类简称前缀 *xxx* */
export function normalizeInvoiceName(name: unknown): string {
  if (name == null) return ''
  return String(name)
    .trim()
    .replace(/^\*[^*]+\*/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeSupplierName(name: string) {
  return name.trim().toLowerCase().replace(/（/g, '(').replace(/）/g, ')')
}

/** 不校验发票条目数、也不逐条比对：Cerence、航趣 */
const SKIP_INVOICE_LINE_COUNT_SUPPLIERS = ['cerence gmbh', '航趣（上海）信息技术有限公司', '航趣(上海)信息技术有限公司']

export function shouldSkipInvoiceLineCount(supplierNames: string[]) {
  return supplierNames.some((name) => {
    const normalized = normalizeSupplierName(name || '')
    return SKIP_INVOICE_LINE_COUNT_SUPPLIERS.some((s) => normalizeSupplierName(s) === normalized)
  })
}

export function orderAttachmentRequired(ot: string) {
  return isLicenseOrderType(ot) || isFixedAssetOrderType(ot) || isDevFeeOrderType(ot)
}

export function completionAttachmentRequired(ot: string) {
  return ot === '服务类' || isDevFeeOrderType(ot) || ot === '其他' || ot == null || ot === '' || isFixedAssetOrderType(ot)
}

export interface RuleInvoiceLine {
  invoiceDate?: string | null
  projectName?: string
  partNo?: string
  quantity?: number
  unit?: string
  totalAmount?: number
  currency?: string
  attachmentId?: number | null
  fileUrl?: string
  fileName?: string
}

export interface RuleAcceptDetail {
  partsName?: string
  partsNo?: string
  unitName?: string
  quantity?: number
  compareAmount: number
  acceptDate?: string | null
}

export interface InvoiceRuleInput {
  orderType: string
  skipLineCount: boolean
  invoiceTotal: number
  acceptTotal: number
  invoices: RuleInvoiceLine[]
  details: RuleAcceptDetail[]
  orderFileCount: number
  completionFileCount: number
  formatAmount?: (amount: number, currency?: string) => string
}

function defaultFormatAmount(amount: number) {
  return `¥${roundMoney(amount).toFixed(2)}`
}

/** 返回第一条拦截文案；通过则返回 null。 */
export function validateInvoiceRules(input: InvoiceRuleInput): string | null {
  const orderType = input.orderType || ''
  const isFixedAsset = isFixedAssetOrderType(orderType)
  const isLicense = isLicenseOrderType(orderType)
  const isDevFee = isDevFeeOrderType(orderType)
  const formatAmount = input.formatAmount || defaultFormatAmount

  if (!moneyEquals(input.invoiceTotal, input.acceptTotal)) {
    const diff = Math.abs(roundMoney(input.invoiceTotal - input.acceptTotal))
    return `发票金额与验收单总金额不符，相差 ${formatAmount(diff)}，请核实后再提交`
  }

  const needLineCountCheck =
    orderType === '硬件PO订单' ||
    isFixedAsset ||
    (isLicense && !input.skipLineCount)
  if (needLineCountCheck && input.invoices.length !== input.details.length) {
    return `发票条目数(${input.invoices.length})与验收明细条目数(${input.details.length})不一致，请核实后再提交`
  }

  // 硬件PO逐条比对。License / 固定资产 / 开发费及其他只校总额（及各自的条目数），不逐条比价。
  // 服务类、其他：不强制条目数，有对应明细时比对行金额。
  if (!input.skipLineCount && !isFixedAsset && !isLicense && !isDevFee) {
    for (let i = 0; i < input.invoices.length; i++) {
      const invoice = input.invoices[i]
      const detail = input.details[i]
      if (!detail) break
      const errors: string[] = []
      if (orderType === '硬件PO订单') {
        const invoiceName = normalizeInvoiceName(invoice.projectName)
        const detailName = normalizeInvoiceName(detail.partsName)
        if (invoiceName !== detailName) {
          errors.push(`品名(${invoice.projectName || '空'}≠${detail.partsName || '空'})`)
        }
        const invoicePartNo = String(invoice.partNo || '').trim().toUpperCase()
        const detailPartNo = String(detail.partsNo || '').trim().toUpperCase()
        if (invoicePartNo !== detailPartNo) {
          errors.push(`零件号(${invoice.partNo || '空'}≠${detail.partsNo || '空'})`)
        }
        if (Number(invoice.quantity || 0) !== Number(detail.quantity || 0)) {
          errors.push(`数量(${invoice.quantity}≠${detail.quantity})`)
        }
        const invoiceUnit = String(invoice.unit || '').trim()
        const detailUnit = String(detail.unitName || '').trim()
        if (invoiceUnit !== detailUnit) {
          errors.push(`单位(${invoice.unit || '空'}≠${detail.unitName || '空'})`)
        }
        if (!moneyEquals(Number(invoice.totalAmount || 0), detail.compareAmount)) {
          errors.push(`价税合计(${formatAmount(Number(invoice.totalAmount || 0), invoice.currency)}≠${formatAmount(detail.compareAmount)})`)
        }
      } else if (!moneyEquals(Number(invoice.totalAmount || 0), detail.compareAmount)) {
        errors.push(`价税合计(${formatAmount(Number(invoice.totalAmount || 0), invoice.currency)}≠${formatAmount(detail.compareAmount)})`)
      }
      if (errors.length > 0) {
        return `第${i + 1}条发票与验收明细不一致: ${errors.join(', ')}`
      }
    }
  }

  const acceptDate = input.details[0]?.acceptDate
  if (acceptDate) {
    for (let i = 0; i < input.invoices.length; i++) {
      const invoiceDate = input.invoices[i].invoiceDate
      if (!invoiceDate) {
        return `第${i + 1}条发票缺少开票日期`
      }
      if (invoiceDate < acceptDate) {
        return `第${i + 1}条开票日期(${invoiceDate})不能小于验收归档日期(${acceptDate})`
      }
    }
  }

  for (let i = 0; i < input.invoices.length; i++) {
    const line = input.invoices[i]
    if (!line.attachmentId && !line.fileUrl && !line.fileName) {
      return `第${i + 1}条发票缺少附件，请重新上传`
    }
  }

  if (orderAttachmentRequired(orderType) && input.orderFileCount <= 0) {
    if (isFixedAsset) return '固定资产类型必须上传订单附件'
    if (isDevFee) return '开发费及其他类型必须上传订单附件'
    return 'License类型验收单必须上传订单附件'
  }

  if (completionAttachmentRequired(orderType) && input.completionFileCount <= 0) {
    if (isFixedAsset) return '固定资产类型必须上传账单/完工单附件'
    if (isDevFee) return '开发费及其他类型必须上传账单/完工单附件'
    return '服务类类型验收单必须上传账单/完工单附件'
  }

  return null
}
