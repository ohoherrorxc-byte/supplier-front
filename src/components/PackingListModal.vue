<template>
  <a-modal
    v-model:open="visible"
    title="箱单信息"
    width="900px"
    :footer="null"
    @cancel="handleClose"
  >
    <a-spin :spinning="loading">

      <!-- 已有箱单列表 -->
      <a-tabs v-if="packingLists.length > 0" style="margin-bottom: 16px">
        <a-tab-pane v-for="pl in packingLists" :key="pl.id">
          <template #tab>
            <span>{{ pl.packing_method === 'PALLET' ? '托盘' : '纸箱' }} #{{ pl.id }}</span>
          </template>
          <a-descriptions bordered size="small" :column="3" style="margin-bottom: 12px">
            <a-descriptions-item label="零件号">{{ pl.parts_no }}</a-descriptions-item>
            <a-descriptions-item label="包装方式">{{ pl.packing_method === 'PALLET' ? '托盘' : '纸箱' }}</a-descriptions-item>
            <a-descriptions-item label="发货数量">{{ pl.shipped_qty }}</a-descriptions-item>
            <template v-if="pl.packing_method === 'PALLET'">
              <a-descriptions-item label="单托件数">{{ pl.units_per_pallet }}</a-descriptions-item>
              <a-descriptions-item label="层数">{{ pl.layers }}</a-descriptions-item>
              <a-descriptions-item label="托数">{{ pl.pallet_count }}</a-descriptions-item>
              <a-descriptions-item label="机器总数">{{ pl.total_units }}</a-descriptions-item>
              <a-descriptions-item label="总毛重(KG)">{{ pl.total_gross_weight }}</a-descriptions-item>
              <a-descriptions-item label="总净重(KG)">{{ pl.total_net_weight }}</a-descriptions-item>
              <a-descriptions-item label="单托尺寸(mm)">{{ pl.pallet_length }}×{{ pl.pallet_width }}×{{ pl.pallet_height }}</a-descriptions-item>
              <a-descriptions-item label="总体积(CBM)">{{ pl.total_cbm }}</a-descriptions-item>
            </template>
            <template v-else>
              <a-descriptions-item label="箱数">{{ pl.carton_count }}</a-descriptions-item>
              <a-descriptions-item label="总毛重(KG)">{{ pl.total_gross_carton }}</a-descriptions-item>
              <a-descriptions-item label="总净重(KG)">{{ pl.total_net_carton }}</a-descriptions-item>
              <a-descriptions-item label="总体积(CBM)">{{ pl.carton_cbm }}</a-descriptions-item>
              <a-descriptions-item label="单箱尺寸(mm)" :span="2">{{ pl.carton_size }}</a-descriptions-item>
            </template>
            <a-descriptions-item label="备注" :span="3">{{ pl.remark || '-' }}</a-descriptions-item>
          </a-descriptions>

          <!-- Handling Units 展示 -->
          <a-divider>包装单元明细 ({{ pl.handlingUnits?.length || 0 }} 个)</a-divider>
          <a-table
            v-if="pl.handlingUnits?.length > 0"
            :columns="huColumns"
            :data-source="pl.handlingUnits"
            row-key="id"
            size="small"
            :pagination="false"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'unit_type'">
                <a-tag :color="record.unit_type === 'PALLET' ? 'blue' : 'green'">
                  {{ record.unit_type === 'PALLET' ? '托盘' : '纸箱' }}
                </a-tag>
              </template>
            </template>
          </a-table>
          <a-empty v-else description="暂无包装单元" />

          <a-space style="margin-top: 12px">
            <a-button danger size="small" @click="handleDelete(pl.id)">删除箱单</a-button>
          </a-space>
        </a-tab-pane>
      </a-tabs>

      <!-- 新建箱单表单 -->
      <a-divider v-if="packingLists.length > 0">新建箱单</a-divider>

      <a-form ref="formRef" :model="form" layout="vertical" @finish="handleSubmit">
        <a-row :gutter="16">
          <!-- 基础字段 -->
          <a-col :span="12">
            <a-form-item label="零件号" name="partsNo">
              <a-input v-model:value="form.partsNo" placeholder="请输入零件号" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="P/N号" name="pnNo">
              <a-input v-model:value="form.pnNo" placeholder="请输入P/N号" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="物料描述" name="description">
              <a-input v-model:value="form.description" placeholder="请输入物料描述" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="包装方式" name="packingMethod">
              <a-select v-model:value="form.packingMethod" placeholder="请选择包装方式">
                <a-select-option value="PALLET">托盘</a-select-option>
                <a-select-option value="CARTON">纸箱</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="发货总数量" name="shippedQty">
              <a-input-number v-model:value="form.shippedQty" :min="1" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>

        <!-- 托盘包装区 -->
        <template v-if="form.packingMethod === 'PALLET'">
          <a-divider>托盘包装信息</a-divider>
          <a-row :gutter="16">
            <a-col :span="8">
              <a-form-item label="单托机器总数">
                <a-input-number v-model:value="form.unitsPerPallet" :min="0" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="层数">
                <a-input-number v-model:value="form.layers" :min="0" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="托数">
                <a-input-number v-model:value="form.palletCount" :min="0" :step="0.5" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="单托毛重(KG)">
                <a-input-number v-model:value="form.grossWeightPer" :min="0" :precision="2" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="单托净重(KG)">
                <a-input-number v-model:value="form.netWeightPer" :min="0" :precision="2" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="机器总数(自动计算)">
                <a-input :value="calcTotalUnits" disabled />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="单托长度(mm)">
                <a-input-number v-model:value="form.palletLength" :min="0" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="单托宽度(mm)">
                <a-input-number v-model:value="form.palletWidth" :min="0" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="单托高度(mm)">
                <a-input-number v-model:value="form.palletHeight" :min="0" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="总体积CBM(自动计算)">
                <a-input :value="calcPalletCbm" disabled />
              </a-form-item>
            </a-col>
          </a-row>
        </template>

        <!-- 纸箱包装区 -->
        <template v-if="form.packingMethod === 'CARTON'">
          <a-divider>纸箱包装信息</a-divider>
          <a-row :gutter="16">
            <a-col :span="8">
              <a-form-item label="箱数">
                <a-input-number v-model:value="form.cartonCount" :min="0" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="总毛重(KG)">
                <a-input-number v-model:value="form.totalGrossCarton" :min="0" :precision="2" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="总净重(KG)">
                <a-input-number v-model:value="form.totalNetCarton" :min="0" :precision="2" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="总体积(CBM)">
                <a-input-number v-model:value="form.cartonCbm" :min="0" :precision="2" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="16">
              <a-form-item label="单箱尺寸(mm)">
                <a-input v-model:value="form.cartonSize" placeholder="格式：600400300" />
              </a-form-item>
            </a-col>
          </a-row>
        </template>

        <!-- 备注 -->
        <a-row>
          <a-col :span="24">
            <a-form-item label="备注" name="remark">
              <a-textarea v-model:value="form.remark" :rows="2" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item>
          <a-space>
            <a-button type="primary" html-type="submit" :loading="submitting">保存箱单</a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { getPackingListByAsn, createPackingList, deletePackingList } from '@/api/srm'
import type { JsonMap } from '@/api/srm'

const props = defineProps<{
  asnId: number
  asnLineId?: number
  partsNo?: string
  shippedQty?: number
}>()

const visible = ref(false)
const loading = ref(false)
const submitting = ref(false)
const packingLists = ref<JsonMap[]>([])
const formRef = ref()

const form = ref({
  partsNo: '',
  pnNo: '',
  description: '',
  packingMethod: undefined as string | undefined,
  shippedQty: 0,
  // 托盘
  unitsPerPallet: 0,
  layers: 0,
  palletCount: 0,
  grossWeightPer: 0,
  netWeightPer: 0,
  palletLength: 0,
  palletWidth: 0,
  palletHeight: 0,
  // 纸箱
  cartonCount: 0,
  totalGrossCarton: 0,
  totalNetCarton: 0,
  cartonCbm: 0,
  cartonSize: '',
  remark: '',
})

const huColumns = [
  { title: '单元编号', dataIndex: 'unit_no', key: 'unit_no' },
  { title: '类型', dataIndex: 'unit_type', key: 'unit_type' },
  { title: '装载数量', dataIndex: 'quantity', key: 'quantity', align: 'right' as const },
  { title: '毛重(KG)', dataIndex: 'gross_weight', key: 'gross_weight', align: 'right' as const },
  { title: '净重(KG)', dataIndex: 'net_weight', key: 'net_weight', align: 'right' as const },
  { title: '尺寸(mm)', key: 'size', customRender: ({ record }: any) => `${record.length_mm || '-'}-${record.width_mm || '-'}-${record.height_mm || '-'}` },
  { title: '体积(CBM)', dataIndex: 'cbm', key: 'cbm', align: 'right' as const },
]

// 自动计算
const calcTotalUnits = computed(() => {
  return form.value.unitsPerPallet * Math.ceil(form.value.palletCount || 0)
})

const calcPalletCbm = computed(() => {
  const { palletLength, palletWidth, palletHeight, palletCount } = form.value
  if (palletLength && palletWidth && palletHeight && palletCount) {
    return ((palletLength * palletWidth * palletHeight / 1_000_000_000) * palletCount).toFixed(4)
  }
  return '0'
})

watch(() => props.asnId, async (val) => {
  if (val) {
    await loadPackingLists()
  }
})

watch(() => props.partsNo, (val) => {
  if (val) form.value.partsNo = val
})

watch(() => props.shippedQty, (val) => {
  if (val) form.value.shippedQty = val
})

async function loadPackingLists() {
  if (!props.asnId) return
  loading.value = true
  try {
    packingLists.value = await getPackingListByAsn(props.asnId)
  } catch (e) {
    console.error('加载箱单失败', e)
  } finally {
    loading.value = false
  }
}

function open() {
  visible.value = true
  loadPackingLists()
  if (props.partsNo) form.value.partsNo = props.partsNo
  if (props.shippedQty) form.value.shippedQty = props.shippedQty
}

async function handleSubmit() {
  if (!form.value.packingMethod) {
    message.warning('请选择包装方式')
    return
  }
  submitting.value = true
  try {
    await createPackingList({
      asnId: props.asnId,
      asnLineId: props.asnLineId,
      partsNo: form.value.partsNo,
      pnNo: form.value.pnNo,
      description: form.value.description,
      packingMethod: form.value.packingMethod,
      shippedQty: form.value.shippedQty,
      unitsPerPallet: form.value.unitsPerPallet,
      layers: form.value.layers,
      palletCount: form.value.palletCount,
      grossWeightPer: form.value.grossWeightPer,
      netWeightPer: form.value.netWeightPer,
      palletLength: form.value.palletLength,
      palletWidth: form.value.palletWidth,
      palletHeight: form.value.palletHeight,
      cartonCount: form.value.cartonCount,
      totalGrossCarton: form.value.totalGrossCarton,
      totalNetCarton: form.value.totalNetCarton,
      cartonCbm: form.value.cartonCbm,
      cartonSize: form.value.cartonSize,
      remark: form.value.remark,
    })
    message.success('箱单保存成功')
    handleReset()
    await loadPackingLists()
  } catch (e: any) {
    message.error(e?.response?.data?.message || e?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

async function handleDelete(id: number) {
  try {
    await deletePackingList(id)
    message.success('删除成功')
    await loadPackingLists()
  } catch (e: any) {
    message.error(e?.response?.data?.message || '删除失败')
  }
}

function handleReset() {
  formRef.value?.resetFields()
}

function handleClose() {
  visible.value = false
}

defineExpose({ open })
</script>
