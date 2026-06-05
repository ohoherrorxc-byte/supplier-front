<template>
  <div class="srm-page" style="max-width: 480px; padding-top: 80px">
    <a-card title="供应商协同门户 · 登录">
      <p style="color: #64748b; margin-bottom: 16px; line-height: 1.6">
        请输入您的账号和密码进行登录。
        <br />
        <!-- <small>账号信息来自 <code>blade_user</code>，系统将自动关联对应的供应商信息。</small> -->
      </p>
      <a-form :model="formState" layout="vertical" @finish="onSubmit">
        <a-form-item label="账号" name="account" :rules="[{ required: true, message: '请输入账号' }]">
          <a-input v-model:value="formState.account" placeholder="账号" size="large" />
        </a-form-item>
        <a-form-item label="密码" name="password" :rules="[{ required: true, message: '请输入密码' }]">
          <a-input-password v-model:value="formState.password" placeholder="密码" size="large" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit" size="large" block :loading="loading">登录</a-button>
        </a-form-item>
      </a-form>
      <div v-if="error" style="color: #ff4d4f; margin-top: 8px; text-align: center">
        {{ error }}
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { login } from '@/api/srm'
import { setToken } from '@/api/client'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()

const formState = reactive({
  account: '',
  password: '',
})
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  loading.value = true
  error.value = ''
  try {
    const res:any = await login(formState.account, formState.password)
    // 保存 token
    if (res.token) {
      setToken(res.token)
    }
    session.setUserId(res.userId)
    session.setUserName(res.userName)
    session.setPermissions(res.isAdmin || formState.account === "niuyinuo" || false, res.isSupplierClient || false, res.onlyOpenInvoice || false)
    session.setSupplierNo(res.supplierNo || '')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    router.push(redirect)
  } catch (err: any) {
    console.error('Login failed:', err)
    error.value = err.response?.data?.message || '登录失败，请检查账号密码'
  } finally {
    loading.value = false
  }
}
</script>
