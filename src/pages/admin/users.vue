<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        ユーザー管理
      </h1>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        アプリケーションユーザーの管理と権限設定
      </p>
    </div>

    <!-- タブ切り替え -->
    <div class="mb-6">
      <nav class="flex space-x-4" aria-label="Tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            activeTab === tab.id
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            'px-3 py-2 font-medium text-sm rounded-md'
          ]"
        >
          {{ tab.name }}
        </button>
      </nav>
    </div>

    <!-- ユーザー一覧タブ -->
    <div v-if="activeTab === 'users'">
      <!-- フィルタ -->
      <div class="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div class="flex flex-wrap gap-4">
          <select
            v-model="roleFilter"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">すべてのユーザー</option>
            <option value="admin">管理者のみ</option>
            <option value="superAdmin">スーパー管理者のみ</option>
            <option value="user">一般ユーザーのみ</option>
          </select>
        </div>
      </div>

      <!-- ユーザー一覧 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div v-if="loading" class="p-8 text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p class="mt-4 text-gray-600 dark:text-gray-400">読み込み中...</p>
        </div>

        <div v-else-if="error" class="p-8 text-center text-red-600">
          <p>{{ error }}</p>
        </div>

        <div v-else>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    ユーザー
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    ロール
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    最終ログイン
                  </th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <tr v-for="user in filteredUsers" :key="user.uid">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="flex-shrink-0 h-10 w-10">
                        <img 
                          v-if="user.photoURL"
                          :src="user.photoURL" 
                          :alt="user.displayName || user.email"
                          class="h-10 w-10 rounded-full"
                        >
                        <div v-else class="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <span class="text-gray-600 dark:text-gray-300 font-medium">
                            {{ (user.email || '').charAt(0).toUpperCase() }}
                          </span>
                        </div>
                      </div>
                      <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900 dark:text-white">
                          {{ user.displayName || '未設定' }}
                        </div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">
                          {{ user.email }}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span 
                      v-if="user.superAdmin"
                      class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800"
                    >
                      スーパー管理者
                    </span>
                    <span 
                      v-else-if="user.admin"
                      class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800"
                    >
                      管理者
                    </span>
                    <span 
                      v-else
                      class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800"
                    >
                      一般ユーザー
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span 
                      v-if="user.disabled"
                      class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800"
                    >
                      無効
                    </span>
                    <span 
                      v-else
                      class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800"
                    >
                      有効
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {{ formatDate(user.lastSignInTime) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      @click="editUser(user)"
                      class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                      :disabled="!canEditUser(user)"
                    >
                      編集
                    </button>
                    <button
                      v-if="canDeleteUser(user)"
                      @click="confirmDeleteUser(user)"
                      class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- アナリティクスタブ -->
    <div v-else-if="activeTab === 'analytics'">
      <AnalyticsExample />
    </div>

    <!-- ユーザー編集モーダル -->
    <FormModal
      v-if="editingUser"
      :title="`ユーザー編集: ${editingUser.email}`"
      @close="editingUser = null"
      @submit="updateUser"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            表示名
          </label>
          <input
            v-model="editForm.displayName"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
        </div>

        <div v-if="isSuperAdmin">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            権限
          </label>
          <div class="space-y-2">
            <label class="flex items-center">
              <input
                v-model="editForm.admin"
                type="checkbox"
                class="mr-2"
              >
              <span>管理者権限</span>
            </label>
            <label class="flex items-center">
              <input
                v-model="editForm.superAdmin"
                type="checkbox"
                class="mr-2"
              >
              <span>スーパー管理者権限</span>
            </label>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            アカウント状態
          </label>
          <label class="flex items-center">
            <input
              v-model="editForm.disabled"
              type="checkbox"
              class="mr-2"
            >
            <span>アカウントを無効化</span>
          </label>
        </div>
      </div>
    </FormModal>

    <!-- 削除確認ダイアログ -->
    <ConfirmDialog
      v-if="deletingUser"
      :title="`ユーザーの削除`"
      :message="`${deletingUser.email} を完全に削除しますか？この操作は取り消せません。`"
      @confirm="deleteUser"
      @cancel="deletingUser = null"
    />
  </div>
</template>

<script setup lang="ts">
interface User {
  uid: string
  email?: string
  displayName?: string | null
  photoURL?: string | null
  disabled?: boolean
  admin?: boolean
  superAdmin?: boolean
  lastSignInTime?: string
  createdAt?: any
}

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const { user: currentUser } = useAdminAuth()
const { getCollection, updateDocument } = useAdminFirestore()
const { setAdminClaim, setUserDisabled, deleteUser: deleteUserFunc } = useCloudFunctions()

const tabs = [
  { id: 'users', name: 'ユーザー一覧' },
  { id: 'analytics', name: 'アクセス分析' }
]

const activeTab = ref('users')
const loading = ref(false)
const error = ref<string | null>(null)
const users = ref<User[]>([])
const roleFilter = ref('')
const editingUser = ref<User | null>(null)
const deletingUser = ref<User | null>(null)

const editForm = ref({
  displayName: '',
  admin: false,
  superAdmin: false,
  disabled: false
})

// 現在のユーザーがスーパー管理者かどうか
const isSuperAdmin = computed(() => {
  return currentUser.value?.superAdmin === true
})

// フィルタリングされたユーザーリスト
const filteredUsers = computed(() => {
  if (!roleFilter.value) return users.value

  return users.value.filter(user => {
    switch (roleFilter.value) {
      case 'admin':
        return user.admin || user.superAdmin
      case 'superAdmin':
        return user.superAdmin
      case 'user':
        return !user.admin && !user.superAdmin
      default:
        return true
    }
  })
})

// ユーザーを編集できるかどうか
const canEditUser = (user: User) => {
  // 自分自身は編集できない
  if (user.uid === currentUser.value?.uid) return false
  
  // スーパー管理者は全員編集可能
  if (isSuperAdmin.value) return true
  
  // 管理者は一般ユーザーのみ編集可能
  return !user.admin && !user.superAdmin
}

// ユーザーを削除できるかどうか
const canDeleteUser = (user: User) => {
  // 自分自身は削除できない
  if (user.uid === currentUser.value?.uid) return false
  
  // スーパー管理者のみ削除可能
  return isSuperAdmin.value
}

// ユーザー一覧の取得
const fetchUsers = async () => {
  loading.value = true
  error.value = null

  try {
    // Firestoreから直接取得（ハイブリッドアプローチ）
    const userDocs = await getCollection<User>('users')
    users.value = userDocs
  } catch (err) {
    console.error('Failed to fetch users:', err)
    error.value = 'ユーザー一覧の取得に失敗しました'
  } finally {
    loading.value = false
  }
}

// ユーザー編集
const editUser = (user: User) => {
  editingUser.value = user
  editForm.value = {
    displayName: user.displayName || '',
    admin: user.admin || false,
    superAdmin: user.superAdmin || false,
    disabled: user.disabled || false
  }
}

// ユーザー更新
const updateUser = async () => {
  if (!editingUser.value) return

  loading.value = true
  try {
    // 権限変更はCloud Functions経由
    if (isSuperAdmin.value && 
        (editForm.value.admin !== editingUser.value.admin || 
         editForm.value.superAdmin !== editingUser.value.superAdmin)) {
      await setAdminClaim(
        editingUser.value.uid,
        editForm.value.admin,
        editForm.value.superAdmin
      )
    }

    // 無効化/有効化もCloud Functions経由
    if (editForm.value.disabled !== editingUser.value.disabled) {
      await setUserDisabled(editingUser.value.uid, editForm.value.disabled)
    }

    // 表示名の更新はFirestore直接
    await updateDocument('users', editingUser.value.uid, {
      displayName: editForm.value.displayName
    })

    // リスト更新
    await fetchUsers()
    editingUser.value = null
  } catch (err) {
    console.error('Failed to update user:', err)
    error.value = 'ユーザーの更新に失敗しました'
  } finally {
    loading.value = false
  }
}

// ユーザー削除確認
const confirmDeleteUser = (user: User) => {
  deletingUser.value = user
}

// ユーザー削除
const deleteUser = async () => {
  if (!deletingUser.value) return

  loading.value = true
  try {
    // Cloud Functions経由で削除
    await deleteUserFunc(deletingUser.value.uid)
    
    // リスト更新
    await fetchUsers()
    deletingUser.value = null
  } catch (err) {
    console.error('Failed to delete user:', err)
    error.value = 'ユーザーの削除に失敗しました'
  } finally {
    loading.value = false
  }
}

// 日付フォーマット
const formatDate = (dateString?: string) => {
  if (!dateString) return '未ログイン'
  return new Date(dateString).toLocaleString('ja-JP')
}

// 初期データ取得
onMounted(() => {
  fetchUsers()
})
</script>