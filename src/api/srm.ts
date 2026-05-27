import { st } from 'vue-router/dist/router-CWoNjPRp.mjs'
import { getToken, http } from './client'
import { md5 } from 'js-md5'

export type JsonMap = Record<string, unknown>

export async function getSupplierProfile(userId: string) {
  const { data } = await http.get<JsonMap>(`/users/${userId}/supplier-profile`)
  return data
}

export async function getUserPermissions(userId: string) {
  const { data } = await http.get<{ isAdmin: boolean; isSupplierClient: boolean }>(`/users/${userId}/permissions`)
  return data
}

export async function getDashboardStats(userId: string) {
  const { data } = await http.get<{ pendingOrders: number; activeAsn: number; todayArriving: number }>('/dashboard/stats', {
    params: { userId },
  })
  return data
}

export async function login(account: string, password: string) {
  const { data } = await http.post<{ token: string; userId: string; userName: string; isAdmin: boolean; isSupplierClient: boolean }>('/auth/login', { account, password: md5(password) })
  return data
}

export async function changePassword(params: { userId: string; oldPassword: string; newPassword: string }) {
  const { data } = await http.post<{ message: string }>('/auth/change-password', params)
  return data
}

export interface OrderQueryParams {
  userId: string
  orderNo?: string[]
  partsNumber?: string[]
  supplierOrderStatus?: number | number[]
  deliveryStatus?: string[]
  startDate?: string
  endDate?: string
  requireAttr?: string
  limit?: number
  offset?: number
  sortField?: string
  sortOrder?: 'asc' | 'desc'
}

export async function listNewOrders(params: OrderQueryParams) {
  const { data } = await http.get<{ items: JsonMap[]; total: number }>('/collaboration/orders/new', { params })
  return data
}

export async function listOrderHeaders(params: Omit<OrderQueryParams, 'partsNumber'>) {
  const { data } = await http.get<{ items: JsonMap[]; total: number }>('/collaboration/orders/headers', { params })
  return data
}

export async function getOrderHeadersSummary(params: {
  userId: string
  orderNo?: string[]
  partsNumber?: string[]
  supplierOrderStatus?: number[]
  deliveryStatus?: string[]
  startDate?: string
  endDate?: string
}) {
  const { data } = await http.get<{
    order_count: number
    total_need_qty: number
    pending_confirm_qty: number
    total_shipped_qty: number
    pending_ship_qty: number
    remaining_qty: number
  }>('/collaboration/orders/headers/summary', { params })
  return data
}

export async function getOrder(id: string, userId: string) {
  const { data } = await http.get<{ order: JsonMap; details: JsonMap[] }>(`/collaboration/orders/${id}`, { params: { userId } })
  return data
}

export async function listAsns(userId: string, limit = 10, offset = 0) {
  const { data } = await http.get<{ items: JsonMap[]; total: number }>('/collaboration/asn/list', {
    params: { userId, limit, offset },
  })
  return data
}

export async function listAsnPlan(userId: string) {
  const { data } = await http.get<{ items: JsonMap[] }>('/collaboration/asn/plan', {
    params: { userId },
  })
  return data.items ?? []
}

export async function listInvoicesByOrder(orderId: string, limit = 50, offset = 0) {
  const { data } = await http.get<{ items: JsonMap[] }>(`/orders/${orderId}/invoices`, {
    params: { limit, offset },
  })
  return data.items ?? []
}

export async function confirmOrder(orderId: string, operatorUserId: string, reason?: string) {
  const { data } = await http.post<JsonMap>(`/collaboration/orders/${orderId}/confirm`, {
    operatorUserId: operatorUserId,
    reason,
  })
  return data
}

export async function confirmOrderDetail(orderDetailId: string, operatorUserId: string, reason?: string) {
  const { data } = await http.post<JsonMap>(`/collaboration/orders/details/${orderDetailId}/confirm`, {
    operatorUserId: operatorUserId,
    reason,
  })
  return data
}

export async function rejectOrder(orderId: string, operatorUserId: string, reason: string) {
  const { data } = await http.post<JsonMap>(`/collaboration/orders/${orderId}/reject`, {
    operatorUserId: operatorUserId,
    reason,
  })
  return data
}

export async function updateOrderDetail(detailId: string, userId: string, params: { need_date?: string; need_number?: number }) {
  const { data } = await http.post<JsonMap>(`/collaboration/orders/detail/${detailId}/update`, {
    ...params,
    userId,
  })
  return data
}

export async function getOrderAsnList(orderId: string, userId: string) {
  const { data } = await http.get<JsonMap[]>(`/collaboration/orders/${orderId}/asn`, { params: { userId } })
  return data
}

export async function getOrderReceipts(orderId: string, userId: string) {
  const { data } = await http.get<JsonMap[]>(`/collaboration/orders/${orderId}/receipts`, { params: { userId } })
  return data
}

export async function getOrderTimeline(orderId: string, userId: string) {
  const { data } = await http.get<JsonMap[]>(`/collaboration/orders/${orderId}/timeline`, { params: { userId } })
  return data
}

export async function getOrderAuditLog(orderId: string, userId: string) {
  const { data } = await http.get<JsonMap[]>(`/collaboration/orders/${orderId}/audit-log`, { params: { userId } })
  return data
}

export async function splitOrderDetail(detailId: string, userId: string, params: {
  quantity1: number;
  quantity2: number;
  expectedDate1: string;
  expectedDate2: string;
}) {
  const { data } = await http.post<JsonMap>(`/collaboration/orders/detail/${detailId}/split`, {
    ...params,
    userId,
  })
  return data
}

export async function createAsn(body: {
  operatorUserId: string
  orderIds: number[]
  logisticsCompany: string
  trackingNo: string
  etaDate: string
}) {
  const { data } = await http.post<JsonMap>('/collaboration/asn', body)
  return data
}

/** ASN.md：按订单拉取拆分行（含剩余可发） */
export async function listOrderSplitLines(orderId: string, userId: string) {
  const { data } = await http.get<{ items: JsonMap[] }>(`/collaboration/orders/${orderId}/split-lines`, {
    params: { userId },
  })
  return data.items ?? []
}

/** ASN.md：确认订单 + 拆单（CONFIRM_ONLY / SPLIT_AND_CONFIRM） */
export async function confirmAndSplit(
  orderId: string,
  body: {
    operatorUserId: string
    detailId: number
    action: 'CONFIRM_ONLY' | 'SPLIT_AND_CONFIRM'
    splitLines?: { splitQty: number; committedDate?: string }[]
    confirmOrderHeader?: boolean
  }
) {
  const { data } = await http.post<JsonMap>(`/collaboration/orders/${orderId}/confirm-and-split`, body)
  return data
}

/** ASN.md：按拆分行创建 ASN（防超发） */
export async function createAsnFromSplitLines(body: {
  operatorUserId: string
  logisticsCompany?: string
  trackingNo?: string
  etaDate?: string
  lines: { splitLineId: number; shippedQty: number }[]
}) {
  const { data } = await http.post<JsonMap>('/collaboration/asn/from-split-lines', body)
  return data
}

/** ASN.md：ASN 明细行收货 */
export async function receiveAsnLine(asnLineId: number, body: { operatorUserId: string; receivedQty: number }) {
  const { data } = await http.post<JsonMap>(`/collaboration/asn/lines/${asnLineId}/receive`, body)
  return data
}

export async function getAsn(asnId: number, userId: string) {
  const { data } = await http.get<JsonMap>(`/collaboration/asn/${asnId}`, {
    params: { userId }
  })
  return data
}

export async function getAsnTimeline(asnId: number, userId: string) {
  const { data } = await http.get<{ items: JsonMap[] }>(`/collaboration/asn/${asnId}/timeline`, {
    params: { userId }
  })
  return data.items ?? []
}

export async function shipAsn(asnId: number, userId: string) {
  const { data } = await http.post<JsonMap>(`/collaboration/asn/${asnId}/ship`, null, {
    params: { userId }
  })
  return data
}

export async function deleteAsn(asnId: number, userId: string) {
  const { data } = await http.delete<JsonMap>(`/collaboration/asn/${asnId}`, {
    params: { userId }
  })
  return data
}

// ========== 箱单 (Packing List) API ==========

export async function getPackingListByAsn(asnId: number) {
  const { data } = await http.get<JsonMap[]>(`/collaboration/packing/asn/${asnId}`)
  return data
}

export async function getPackingListDetail(id: number) {
  const { data } = await http.get<JsonMap>(`/collaboration/packing/${id}`)
  return data
}

export async function createPackingList(body: any) {
  const { data } = await http.post<JsonMap>('/collaboration/packing', body)
  return data
}

export async function deletePackingList(id: number) {
  await http.delete(`/collaboration/packing/${id}`)
}

// 交付计划 API
export async function createDeliveryPlan(body: {
  operatorUserId: string
  orderId: string
  orderDetailId: number
  planQuantity: number
  planDate: string
  remark?: string
}) {
  const { data } = await http.post<JsonMap>('/collaboration/delivery-plan', body)
  return data
}

export async function listDeliveryPlanByOrder(orderId: string, userId: string) {
  const { data } = await http.get<{ items: JsonMap[] }>(`/collaboration/delivery-plan/order/${orderId}`, {
    params: { userId }
  })
  return data.items ?? []
}

export async function listDeliveryPlanBySupplier(
  userId: string,
  orderNo?: string,
  partsNo?: string,
  startDate?: string,
  endDate?: string,
  status?: string,
  pageSize?: number,
  pageNum?: number
) {
  const { data } = await http.get<{ items: JsonMap[]; total: number }>('/collaboration/delivery-plan/supplier', {
    params: { userId, orderNo, partsNo, startDate, endDate, status, pageSize, pageNum }
  })
  return data
}

export async function listUpcomingDeliveryPlan(userId: string) {
  const { data } = await http.get<{ items: JsonMap[] }>('/collaboration/delivery-plan/upcoming', {
    params: { userId }
  })
  return data.items ?? []
}

export async function updateDeliveryPlanShipInfo(planId: number, body: {
  operatorUserId: string
  actualQuantity: number
  actualEtaDate: string
  trackingNo: string
  logisticsCompany: string
  shipDate: string
}) {
  const { data } = await http.put<JsonMap>(`/collaboration/delivery-plan/${planId}/ship`, body)
  return data
}

// 发运信息管理（deliver.md）
export async function searchShipments(params: {
  operatorUserId?: string,
  isAdmin?: boolean,
  asnNos?: string
  supplierDuns?: string
  systemOrderNos?: string
  sapOrderNos?: string
  shippedFlag?: string
  partsNos?: string
  actualEtaDate?: string
  limit?: number
  offset?: number
}) {
  const { data } = await http.get<{ items: JsonMap[], total: number }>('/shipments', { params })
  return { items: data.items ?? [], total: data.total || 0 }
}

export async function shipShipment(asnId: number, body: {
  operatorUserId: string,
  shippedQty: number
  actualEtaDate:string,
  shipDate: string,
  warehouseInNo:string
  
}) {
  const { data } = await http.post<JsonMap>(`/shipments/${asnId}/ship`, body)
  return data
}

// 待发货订单列表接口
export async function listPendingShipmentOrderDetails(
  userId: string,
  orderNo?: string[],
  partsNumber?: string[],
  startDate?: string,
  endDate?: string,
  limit = 20,
  offset = 0
) {
  const { data } = await http.get<{ items: JsonMap[]; total: number }>('/collaboration/orders/pending-shipment', {
    params: { userId, orderNo, partsNumber, startDate, endDate, limit, offset }
  })
  return data
}

// 获取订单详情（根据ID列表）
export async function getOrderDetailsByIds(ids: string[], userId: string) {
  const { data } = await http.get<{ orders: JsonMap[]; contactInfo: JsonMap }>('/collaboration/orders/details/by-ids', {
    params: { ids: ids.join(','), userId }
  })
  return data
}

// 获取订单详情（根据订单ID）
export async function getOrderById(orderId: string, userId: string) {
  const { data } = await http.get<{ order: JsonMap; details: JsonMap[] }>(`/collaboration/orders/${orderId}`, {
    params: { userId }
  })
  return data
}

// 从订单创建发运信息
export async function createAsnFromOrders(body: {
  operatorUserId: string
  contactInfo: {
    contactName: string
    contactPhone: string
    contactEmail: string
  }
  lines: {
    orderDetailId: string
    shippedQty: number
    confirmShipmentDate: string
    warehouseInDate: string
    shipDate?: string
    actualEtaDate?: string
  }[]
}) {
  const { data } = await http.post<JsonMap>('/collaboration/asn/from-orders', body)
  return data
}

// ============ 供应商历史模块 API ============

// 供应商历史需求分析
export async function analyzeSupplierHistory(params: {
  userId: string
  granularity: 'month' | 'year'
  startDate: string
  endDate: string
  demandFactories: string[]
  partsNumbers: string[]
}) {
  const { data } = await http.post<{
    success: boolean
    message?: string
    aggregatedData: any[]
    timeLabels: string[]
    chartData: { xAxis: string[]; series: { name: string; data: number[] }[] }
  }>('/v1/forecast/supplier-history/analyze', params)
  return data
}

// 供应商历史下钻明细
export async function drillDownSupplierHistory(params: {
  userId: string
  partsNumber: string
  demandFactory: string
  timeKey: string
  granularity: 'month' | 'year'
}) {
  const { data } = await http.post<{
    success: boolean
    message?: string
    details: any[]
  }>('/v1/forecast/supplier-history/drill-down', params)
  return data
}

// 供应商历史导出
export async function exportSupplierHistory(params: {
  userId: string
  granularity: 'month' | 'year'
  startDate: string
  endDate: string
  demandFactories: string[]
  partsNumbers: string[]
}) {
  const token = getToken()
  const response = await fetch('/api/v1/forecast/supplier-history/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error('导出失败')
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `供应商历史采购需求_${params.startDate}_${params.endDate}.xlsx`
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
  return { success: true }
}

// 文件上传
export async function uploadFile(file: File, businessId?: string, businessName?: string) {
  const formData = new FormData()
  formData.append('file', file)
  if (businessId) {
    formData.append('businessId', businessId)
  }
  if (businessName) {
    formData.append('businessName', businessName)
  }
  const response = await fetch('/api/file/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('srm_token') || ''}`
    },
    body: formData
  })
  if (!response.ok) {
    throw new Error('上传失败')
  }
  return response.json()
}

// 文件列表
export async function listFiles(params: {
  businessId?: string
  businessName?: string
  limit?: number
  offset?: number
}) {
  const { data } = await http.get<{ items: JsonMap[]; total: number }>('/file/list', { params })
  return data
}

// ============ 供应商开票 API ============

// 待开票清单 - 一般采购
export async function listPendingInvoiceGeneral(params: {
  userId: string
  partsNo?: string
  partsName?: string
  pageSize?: number
  pageNum?: number
}) {
  const { data } = await http.get<{ items: JsonMap[]; total: number }>('/invoice/pending/general', { params })
  return data
}

// 待开票清单 - BOM采购
export async function listPendingInvoiceBom(params: {
  userId: string
  partsNo?: string
  partsName?: string
  pageSize?: number
  pageNum?: number
}) {
  const { data } = await http.get<{ items: JsonMap[]; total: number }>('/invoice/pending/bom', { params })
  return data
}

// 待开票数量统计
export async function getPendingInvoiceCount(userId: string) {
  const { data } = await http.get<{ general: number; bom: number; total: number }>('/invoice/pending/count', { params: { userId } })
  return data
}

// 获取工作台消息列表
export async function getDashboardMessages(userId: string) {
  const { data } = await http.get<{ type: string; no: string; text: string }[]>('/invoice/dashboard/messages', { params: { userId } })
  return data
}

// 创建结算单
export async function createSettlementOrder(params: {
  userId: string
  supplierName: string
  remark?: string
  createDept?: string
  acceptDetailIds: number[]
  invoiceLines: JsonMap[]
  completionFiles?: { id: number; name: string; url: string }[]
}) {
  const { data } = await http.post<{ settlementId: number; settlementNo: string; message: string }>('/invoice/settlement', params)
  return data
}

// 结算单列表
export async function listSettlementOrders(params: {
  userId: string
  settlementNo?: string
  status?: number
  acceptApplyNo?: string
  bomOrderNo?: string
  contractNo?: string
  pageSize?: number
  pageNum?: number
}) {
  const { data } = await http.get<{ items: JsonMap[]; total: number }>('/invoice/settlement/list', { params })
  return data
}

// 结算单明细
export async function getSettlementDetails(settlementId: string) {
  const { data } = await http.get<{ invoiceLines: JsonMap[]; details: JsonMap[]; completionFiles: JsonMap[]; remark: string }>(`/invoice/settlement/${settlementId}`)
  return data
}

// 代理下载文件
export async function downloadFile(url: string, filename?: string) {
  const path = url.replace(/^https?:\/\/[^\/]+\//, '')
  const params = new URLSearchParams({ path })
  if (filename) params.set('filename', filename)
  const res = await fetch(`/api/file/download?${params.toString()}`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('srm_token') || ''}` }
  })
  if (!res.ok) throw new Error('下载失败')
  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename || '附件'
  a.click()
  URL.revokeObjectURL(blobUrl)
}

// 提交结算单
export async function submitSettlement(settlementId: string) {
  const { data } = await http.post<{ success: boolean; message: string }>(`/invoice/settlement/${settlementId}/submit`)
  return data
}

// 删除草稿结算单
export async function deleteSettlement(settlementId: string) {
  const { data } = await http.post<{ success: boolean; message: string }>(`/invoice/settlement/${settlementId}/delete`)
  return data
}

// 检查是否有草稿结算单
export async function checkDraftSettlement(acceptDetailIds: number[]) {
  const { data } = await http.post<{ hasDraft: boolean; settlementNo?: string; message?: string }>('/invoice/settlement/check', acceptDetailIds)
  return data
}

// OCR识别发票
export async function ocrRecognize(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch('/api/invoice/ocr', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('srm_token') || ''}`
    },
    body: formData
  })
  if (!response.ok) {
    throw new Error('OCR识别失败')
  }
  return response.json()
}

// ========== 采购计划 API ==========

export interface PurchasePlanQueryParams {
  userId: string
  partsNumber?: string[]
  startDate?: string
  endDate?: string
  feedbackStatus?: string
  limit?: number
  offset?: number
}

export async function listPurchasePlan(params: PurchasePlanQueryParams) {
  const { data } = await http.get<{ items: JsonMap[]; total: number }>('/order-management/purchase-plan', { params })
  return data
}

export async function submitPurchasePlanFeedback(planId: string, userId: string, committedQty: number, remark?: string) {
  const { data } = await http.post<{ success: boolean; message: string }>(`/order-management/purchase-plan/${planId}/feedback`, {
    userId,
    committedQty,
    remark: remark || ''
  })
  return data
}
