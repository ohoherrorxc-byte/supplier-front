<template>
  <div class="srm-page">
    <div class="srm-card-title">供应商资料</div>
    <a-spin :spinning="loading">
      <a-alert v-if="error" type="error" :message="error" show-icon style="margin-bottom: 16px" />
      <a-alert v-if="successMessage" type="success" :message="successMessage" show-icon style="margin-bottom: 16px" />
      <a-row v-if="profile" :gutter="[16, 16]">
        <a-col :span="24">
          <a-card title="供应商资料" size="small">
            <a-descriptions bordered column="2" :column="2">
              <a-descriptions-item label="用户真实名称">
                {{ getUserName() }}
              </a-descriptions-item>
              <a-descriptions-item label="手机号">
                {{ getPhoneNumber() }}
              </a-descriptions-item>
              <a-descriptions-item label="供应商名称">
                {{ getSupplierName() }}
              </a-descriptions-item>
              <a-descriptions-item label="供应商编号">
                {{ getSupplierNo() }}
              </a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-col>
        <a-col :span="24">
          <a-card title="修改密码" size="small">
            <a-form :model="passwordForm" @submit.prevent="handleChangePassword">
              <a-form-item label="旧密码" :validate-status="passwordForm.errors.oldPassword ? 'error' : ''" :help="passwordForm.errors.oldPassword">
                <a-input-password v-model:value="passwordForm.oldPassword" placeholder="请输入旧密码" />
              </a-form-item>
              <a-form-item label="新密码" :validate-status="passwordForm.errors.newPassword ? 'error' : ''" :help="passwordForm.errors.newPassword">
                <a-input-password v-model:value="passwordForm.newPassword" placeholder="请输入新密码" />
              </a-form-item>
              <a-form-item label="确认新密码" :validate-status="passwordForm.errors.confirmPassword ? 'error' : ''" :help="passwordForm.errors.confirmPassword">
                <a-input-password v-model:value="passwordForm.confirmPassword" placeholder="请确认新密码" />
              </a-form-item>
              <a-form-item>
                <a-button type="primary" html-type="submit" :loading="passwordLoading">修改密码</a-button>
              </a-form-item>
            </a-form>
          </a-card>
        </a-col>
      </a-row>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { getSupplierProfile, changePassword, type JsonMap } from '@/api/srm'

const router = useRouter()
const session = useSessionStore()
const loading = ref(false)
const error = ref('')
const successMessage = ref('')
const profile = ref<{ user: JsonMap | null; userDetail: JsonMap | null; supplier: JsonMap | null } | null>(
  null
)

// 密码表单
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
  errors: {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
})
const passwordLoading = ref(false)

function pretty(o: unknown) {
  return JSON.stringify(o, null, 2)
}

// 获取用户真实名称
function getUserName() {
  if (!profile.value?.user) return '未设置'
  return profile.value.user.name || profile.value.user.nickname || '未设置'
}

// 获取手机号
function getPhoneNumber() {
  if (!profile.value?.user) return '未设置'
  return profile.value.user.phone || profile.value.user.mobile || '未设置'
}

// 获取供应商名称
function getSupplierName() {
  if (!profile.value?.supplier) return '未绑定'
  return profile.value.supplier.supplierName || profile.value.supplier.name || '未设置'
}

// 获取供应商编号
function getSupplierNo() {
  if (!profile.value?.supplier) return '未绑定'
  return profile.value.supplier.supplierNo || profile.value.supplier.code || '未设置'
}

// 验证密码表单
function validatePasswordForm() {
  let isValid = true
  
  // 重置错误信息
  passwordForm.value.errors = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
  
  // 验证旧密码
  if (!passwordForm.value.oldPassword) {
    passwordForm.value.errors.oldPassword = '请输入旧密码'
    isValid = false
  }
  
  // 验证新密码
  if (!passwordForm.value.newPassword) {
    passwordForm.value.errors.newPassword = '请输入新密码'
    isValid = false
  } else if (passwordForm.value.newPassword.length < 6) {
    passwordForm.value.errors.newPassword = '新密码长度至少6位'
    isValid = false
  }
  
  // 验证确认密码
  if (!passwordForm.value.confirmPassword) {
    passwordForm.value.errors.confirmPassword = '请确认新密码'
    isValid = false
  } else if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordForm.value.errors.confirmPassword = '两次输入的密码不一致'
    isValid = false
  }
  
  return isValid
}

// 处理修改密码
async function handleChangePassword() {
  if (!validatePasswordForm()) {
    return
  }
  
  passwordLoading.value = true
  error.value = ''
  successMessage.value = ''
  
  try {
    await changePassword({
      userId: session.userId,
      oldPassword: passwordForm.value.oldPassword,
      newPassword: passwordForm.value.newPassword
    })

    successMessage.value = '密码修改成功，请重新登录'

    // 重置表单
    passwordForm.value = {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
      errors: {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
    }

    // 1秒后跳转到登录页
    setTimeout(() => {
      session.logout()
      router.push({ name: 'login' })
    }, 1000)
  } catch (e: unknown) {
    error.value = (e as { friendlyMessage?: string }).friendlyMessage || '修改密码失败'
  } finally {
    passwordLoading.value = false
  }
}

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await getSupplierProfile(session.userId)
    profile.value = {
      user: (data.user as JsonMap) ?? null,
      userDetail: (data.userDetail as JsonMap) ?? null,
      supplier: (data.supplier as JsonMap) ?? null,
    }
  } catch (e: unknown) {
    error.value = (e as { friendlyMessage?: string }).friendlyMessage || '加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.json-pre {
  margin: 0;
  font-size: 12px;
  overflow: auto;
  max-height: 360px;
  background: #f8fafc;
  padding: 12px;
  border-radius: 8px;
}
</style>
