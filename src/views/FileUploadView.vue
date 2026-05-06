<template>
  <div class="srm-page">
    <div class="srm-card-title">文件上传测试</div>

    <a-layout style="background: #fff; padding: 16px; border-radius: 8px;">
      <a-card title="上传文件" size="small">
        <a-form layout="vertical">
          <a-form-item label="业务名称">
            <a-input v-model:value="form.businessName" placeholder="如：订单附件、ASN附件" />
          </a-form-item>
          <a-form-item label="业务ID（可选）">
            <a-input v-model:value="form.businessId" placeholder="关联的业务ID" />
          </a-form-item>
          <a-form-item label="选择文件">
            <a-upload
              :before-upload="beforeUpload"
              :file-list="fileList"
              :remove="handleRemove"
              accept="*"
            >
              <a-button><upload-outlined /> 选择文件</a-button>
            </a-upload>
          </a-form-item>
          <a-form-item>
            <a-button type="primary" :loading="uploading" :disabled="!selectedFile" @click="handleUpload">
              上传
            </a-button>
            <a-button style="margin-left: 8px" @click="handleReset">重置</a-button>
          </a-form-item>
        </a-form>

        <a-divider>上传结果</a-divider>

        <a-alert v-if="uploadResult" :type="uploadResult.success ? 'success' : 'error'" show-icon style="margin-top: 16px">
          <template #message>{{ uploadResult.message }}</template>
          <template #description>
            <div v-if="uploadResult.success">
              <p>文件名：{{ uploadResult.name }}</p>
              <p>文件大小：{{ formatSize(uploadResult.size) }}</p>
              <p>文件URL：
                <a :href="getDownloadUrl(uploadResult.url, uploadResult.name)" target="_blank">{{ uploadResult.url }}</a>
              </p>
            </div>
          </template>
        </a-alert>
      </a-card>

      <a-card title="文件列表" size="small" style="margin-top: 16px">
        <a-table
          :columns="columns"
          :data-source="files"
          :loading="loading"
          row-key="id"
          :pagination="false"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <a :href="getDownloadUrl(record.url, record.name)" target="_blank">{{ record.name }}</a>
            </template>
            <template v-else-if="column.key === 'size'">
              {{ formatSize(record.size) }}
            </template>
            <template v-else-if="column.key === 'createTime'">
              {{ formatDate(record.createTime) }}
            </template>
          </template>
        </a-table>
      </a-card>
    </a-layout>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { message } from 'ant-design-vue'
import { UploadOutlined } from '@ant-design/icons-vue'
import { uploadFile, listFiles, type JsonMap } from '@/api/srm'
import dayjs from 'dayjs'

const API_BASE = 'http://localhost:30157'

const form = reactive({
  businessName: '',
  businessId: ''
})

const selectedFile = ref<File | null>(null)
const fileList = ref<any[]>([])
const uploading = ref(false)
const uploadResult = ref<any>(null)
const loading = ref(false)
const files = ref<JsonMap[]>([])

const columns = [
  { title: '文件名', dataIndex: 'name', key: 'name' },
  { title: '大小', dataIndex: 'size', key: 'size', width: 100 },
  { title: '业务名称', dataIndex: 'businessName', key: 'businessName', width: 120 },
  { title: '上传时间', dataIndex: 'createTime', key: 'createTime', width: 180 }
]

// 将 OSS URL 转为后端下载代理 URL
function getDownloadUrl(ossUrl: string, originalName?: string) {
  if (!ossUrl) return ''
  try {
    // ossUrl 格式: http://10.30.4.68:9000/upload/20260422/xxx.csv
    // 提取路径部分: upload/20260422/xxx.csv
    const urlObj = new URL(ossUrl)
    const path = urlObj.pathname.replace(/^\//, '') // 去掉开头的 /
    let downloadUrl = `${API_BASE}/api/file/download?path=${encodeURIComponent(path)}`
    if (originalName) {
      downloadUrl += `&filename=${encodeURIComponent(originalName)}`
    }
    return downloadUrl
  } catch {
    return ossUrl
  }
}

function beforeUpload(file: File) {
  selectedFile.value = file
  fileList.value = [file]
  return false
}

function handleRemove() {
  selectedFile.value = null
  fileList.value = []
}

function handleReset() {
  form.businessName = ''
  form.businessId = ''
  selectedFile.value = null
  fileList.value = []
  uploadResult.value = null
}

async function handleUpload() {
  if (!selectedFile.value) {
    message.warning('请先选择文件')
    return
  }

  uploading.value = true
  uploadResult.value = null

  try {
    const result = await uploadFile(
      selectedFile.value,
      form.businessId || undefined,
      form.businessName || undefined
    )
    uploadResult.value = result
    message.success('上传成功')
    loadFiles()
  } catch (e: any) {
    uploadResult.value = { success: false, message: e.message || '上传失败' }
    message.error('上传失败')
  } finally {
    uploading.value = false
  }
}

async function loadFiles() {
  loading.value = true
  try {
    const result = await listFiles({
      businessName: form.businessName || undefined,
      limit: 50,
      offset: 0
    })
    files.value = result.items
  } catch (e) {
    console.error('加载文件列表失败', e)
  } finally {
    loading.value = false
  }
}

function formatSize(size: number) {
  if (!size) return '-'
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDate(date: string) {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

// 初始加载
loadFiles()
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