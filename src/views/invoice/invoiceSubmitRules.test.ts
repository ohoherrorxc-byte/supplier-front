import assert from 'node:assert/strict'
import {
  moneyEquals,
  roundMoney,
  validateInvoiceRules,
  type RuleAcceptDetail,
  type RuleInvoiceLine
} from './invoiceSubmitRules.ts'

const invoice = (patch: Partial<RuleInvoiceLine> = {}): RuleInvoiceLine => ({
  invoiceDate: '2026-10-20',
  projectName: '测试品名',
  partNo: 'P-1',
  quantity: 1,
  unit: '个',
  totalAmount: 100,
  attachmentId: 1,
  fileName: 'a.pdf',
  ...patch
})

const detail = (patch: Partial<RuleAcceptDetail> = {}): RuleAcceptDetail => ({
  partsName: '测试品名',
  partsNo: 'P-1',
  unitName: '个',
  quantity: 1,
  compareAmount: 100,
  acceptDate: '2026-10-01',
  ...patch
})

function check(name: string, message: string | null, expected: string | null) {
  assert.equal(message, expected, name + ' => ' + message)
  console.log('ok', name)
}

assert.equal(roundMoney(10.1 + 10.2), 20.3)
assert.equal(moneyEquals(15351795.55, 15351795.550000001), true)
console.log('ok float')

const attached = { orderFileCount: 1, completionFileCount: 1, skipLineCount: false }

check(
  'fixed asset header not detail sum',
  validateInvoiceRules({
    orderType: '固定资产类',
    ...attached,
    invoiceTotal: 33900,
    acceptTotal: 33900,
    invoices: [
      invoice({ projectName: '测试设备甲', partNo: 'X', totalAmount: 11300 }),
      invoice({ projectName: '测试设备乙', partNo: 'Y', totalAmount: 22600 })
    ],
    details: [
      detail({ partsName: 'FA26-A', partsNo: 'FA26-A', compareAmount: 8000 }),
      detail({ partsName: 'FA26-B', partsNo: 'FA26-B', compareAmount: 9000 })
    ]
  }),
  null
)

check(
  'fixed asset line count',
  validateInvoiceRules({
    orderType: '固定资产类',
    ...attached,
    invoiceTotal: 33900,
    acceptTotal: 33900,
    invoices: [invoice({ totalAmount: 33900 })],
    details: [detail({ compareAmount: 8000 }), detail({ compareAmount: 9000 })]
  }),
  '发票条目数(1)与验收明细条目数(2)不一致，请核实后再提交'
)

check(
  'fixed asset missing order',
  validateInvoiceRules({
    orderType: '固定资产',
    skipLineCount: false,
    orderFileCount: 0,
    completionFileCount: 1,
    invoiceTotal: 100,
    acceptTotal: 100,
    invoices: [invoice()],
    details: [detail()]
  }),
  '固定资产类型必须上传订单附件'
)

check(
  'license ignores line price',
  validateInvoiceRules({
    orderType: 'License',
    ...attached,
    invoiceTotal: 587525.21,
    acceptTotal: 587525.21,
    invoices: [invoice({ projectName: '别的名字', partNo: 'NO', quantity: 9, unit: '套', totalAmount: 4450 })],
    details: [detail({ compareAmount: 51125.21 })]
  }),
  null
)

check(
  'lisence spelling',
  validateInvoiceRules({
    orderType: 'Lisence',
    ...attached,
    invoiceTotal: 100,
    acceptTotal: 100,
    invoices: [invoice({ projectName: 'x', totalAmount: 100 })],
    details: [detail({ partsName: 'y', compareAmount: 40 })]
  }),
  null
)

check(
  'hangqu skips line count',
  validateInvoiceRules({
    orderType: 'License',
    skipLineCount: true,
    orderFileCount: 1,
    completionFileCount: 0,
    invoiceTotal: 11300,
    acceptTotal: 11300,
    invoices: [invoice({ totalAmount: 11300 })],
    details: [detail({ compareAmount: 1000 }), detail({ compareAmount: 2000 })]
  }),
  null
)

check(
  'license still checks line count',
  validateInvoiceRules({
    orderType: 'PC License',
    ...attached,
    completionFileCount: 0,
    invoiceTotal: 100,
    acceptTotal: 100,
    invoices: [invoice()],
    details: [detail(), detail()]
  }),
  '发票条目数(1)与验收明细条目数(2)不一致，请核实后再提交'
)

check(
  'license needs order file',
  validateInvoiceRules({
    orderType: 'License',
    skipLineCount: false,
    orderFileCount: 0,
    completionFileCount: 0,
    invoiceTotal: 100,
    acceptTotal: 100,
    invoices: [invoice()],
    details: [detail()]
  }),
  'License类型验收单必须上传订单附件'
)

check(
  'dev fee ignores line price and needs both files',
  validateInvoiceRules({
    orderType: '开发费及其他',
    skipLineCount: false,
    orderFileCount: 1,
    completionFileCount: 1,
    invoiceTotal: 33900,
    acceptTotal: 33900,
    invoices: [invoice({ projectName: '汇总', totalAmount: 33900 })],
    details: [detail({ compareAmount: 8000 }), detail({ compareAmount: 25900 })]
  }),
  null
)

check(
  'dev fee missing order',
  validateInvoiceRules({
    orderType: '开发费及其他',
    skipLineCount: false,
    orderFileCount: 0,
    completionFileCount: 1,
    invoiceTotal: 100,
    acceptTotal: 100,
    invoices: [invoice()],
    details: [detail()]
  }),
  '开发费及其他类型必须上传订单附件'
)

check(
  'dev fee missing completion',
  validateInvoiceRules({
    orderType: '开发费及其他',
    ...attached,
    completionFileCount: 0,
    invoiceTotal: 100,
    acceptTotal: 100,
    invoices: [invoice()],
    details: [detail()]
  }),
  '开发费及其他类型必须上传账单/完工单附件'
)

check(
  'hardware float line amount passes',
  validateInvoiceRules({
    orderType: '硬件PO订单',
    skipLineCount: false,
    orderFileCount: 0,
    completionFileCount: 0,
    invoiceTotal: 20.3,
    acceptTotal: roundMoney(10.1 + 10.2),
    invoices: [
      invoice({ totalAmount: 10.1, quantity: 1 }),
      invoice({ totalAmount: 10.2, quantity: 1 })
    ],
    details: [
      detail({ compareAmount: 10.1 }),
      detail({ compareAmount: 10.2 })
    ]
  }),
  null
)

check(
  'hardware name mismatch',
  validateInvoiceRules({
    orderType: '硬件PO订单',
    skipLineCount: false,
    orderFileCount: 0,
    completionFileCount: 0,
    invoiceTotal: 100,
    acceptTotal: 100,
    invoices: [invoice({ projectName: '*税目*车载主机' })],
    details: [detail({ partsName: '其他零件' })]
  }),
  '第1条发票与验收明细不一致: 品名(*税目*车载主机≠其他零件)'
)

check(
  'hardware strips tax prefix',
  validateInvoiceRules({
    orderType: '硬件PO订单',
    skipLineCount: false,
    orderFileCount: 0,
    completionFileCount: 0,
    invoiceTotal: 100,
    acceptTotal: 100,
    invoices: [invoice({ projectName: '*家用音视频设备*车载主机' })],
    details: [detail({ partsName: '车载主机' })]
  }),
  null
)

check(
  'date before archive',
  validateInvoiceRules({
    orderType: 'License',
    ...attached,
    invoiceTotal: 100,
    acceptTotal: 100,
    invoices: [invoice({ invoiceDate: '2026-09-01' })],
    details: [detail({ acceptDate: '2026-10-01' })]
  }),
  '第1条开票日期(2026-09-01)不能小于验收归档日期(2026-10-01)'
)

check(
  'missing invoice date',
  validateInvoiceRules({
    orderType: '固定资产类',
    ...attached,
    invoiceTotal: 100,
    acceptTotal: 100,
    invoices: [invoice({ invoiceDate: null })],
    details: [detail()]
  }),
  '第1条发票缺少开票日期'
)

check(
  'service still checks line amount',
  validateInvoiceRules({
    orderType: '服务类',
    skipLineCount: false,
    orderFileCount: 0,
    completionFileCount: 1,
    invoiceTotal: 100,
    acceptTotal: 100,
    invoices: [invoice({ totalAmount: 100 })],
    details: [detail({ compareAmount: 40 })]
  }),
  '第1条发票与验收明细不一致: 价税合计(¥100.00≠¥40.00)'
)

check(
  'total mismatch',
  validateInvoiceRules({
    orderType: 'License',
    ...attached,
    invoiceTotal: 90,
    acceptTotal: 100,
    invoices: [invoice({ totalAmount: 90 })],
    details: [detail()]
  }),
  '发票金额与验收单总金额不符，相差 ¥10.00，请核实后再提交'
)

console.log('all passed')
