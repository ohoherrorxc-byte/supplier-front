import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const STORAGE_KEY = 'srm_user_id'
const USER_NAME_KEY = 'srm_user_name'
const IS_ADMIN_KEY = 'srm_is_admin'
const IS_SUPPLIER_CLIENT_KEY = 'srm_is_supplier_client'
const SUPPLIER_NO_KEY = 'srm_supplier_no'

export const useSessionStore = defineStore('session', () => {
  const userId = ref('')
  const userName = ref('')
  const isAdmin = ref(false)
  const isSupplierClient = ref(false)
  const supplierNo = ref('')

  function load() {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v) {
      userId.value = v
    }
    const name = localStorage.getItem(USER_NAME_KEY)
    if (name) {
      userName.value = name
    }
    const admin = localStorage.getItem(IS_ADMIN_KEY)
    if (admin) {
      isAdmin.value = admin === 'true'
    }
    const supplierClient = localStorage.getItem(IS_SUPPLIER_CLIENT_KEY)
    if (supplierClient) {
      isSupplierClient.value = supplierClient === 'true'
    }
    const supNo = localStorage.getItem(SUPPLIER_NO_KEY)
    if (supNo) {
      supplierNo.value = supNo
    }
  }

  function setUserId(id: string) {
    userId.value = id.trim()
    localStorage.setItem(STORAGE_KEY, userId.value)
  }

  function setUserName(name: string) {
    userName.value = name.trim()
    localStorage.setItem(USER_NAME_KEY, userName.value)
  }

  function setPermissions(admin: boolean, supplierClient: boolean) {
    isAdmin.value = admin
    isSupplierClient.value = supplierClient
    localStorage.setItem(IS_ADMIN_KEY, String(admin))
    localStorage.setItem(IS_SUPPLIER_CLIENT_KEY, String(supplierClient))
  }

  function setSupplierNo(no: string) {
    supplierNo.value = no
    localStorage.setItem(SUPPLIER_NO_KEY, no)
  }

  function logout() {
    userId.value = ''
    userName.value = ''
    isAdmin.value = false
    isSupplierClient.value = false
    supplierNo.value = ''
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(USER_NAME_KEY)
    localStorage.removeItem(IS_ADMIN_KEY)
    localStorage.removeItem(IS_SUPPLIER_CLIENT_KEY)
    localStorage.removeItem(SUPPLIER_NO_KEY)
    localStorage.removeItem('srm_token')
  }

  const operatorUserId = computed(() => {
    return userId.value
  })

  return { userId, userName, isAdmin, isSupplierClient, supplierNo, load, setUserId, setUserName, setPermissions, setSupplierNo, logout, operatorUserId }
})
