import { httpsCallable } from 'firebase/functions'

/**
 * Cloud Functions呼び出し用のcomposable
 */
export const useCloudFunctions = () => {
  const { $firebase } = useNuxtApp()

  /**
   * 管理者権限の設定
   */
  const setAdminClaim = async (uid: string, admin: boolean, superAdmin: boolean = false) => {
    const func = httpsCallable($firebase.functions, 'setAdminClaim')
    const result = await func({ uid, admin, superAdmin })
    return result.data
  }

  /**
   * ユーザーの無効化/有効化
   */
  const setUserDisabled = async (uid: string, disabled: boolean) => {
    const func = httpsCallable($firebase.functions, 'setUserDisabled')
    const result = await func({ uid, disabled })
    return result.data
  }

  /**
   * ユーザーの削除
   */
  const deleteUser = async (uid: string) => {
    const func = httpsCallable($firebase.functions, 'deleteUser')
    const result = await func({ uid })
    return result.data
  }

  /**
   * データの公開
   */
  const publishData = async (dataType: 'timetable' | 'fare' | 'holidays') => {
    const func = httpsCallable($firebase.functions, 'publishData')
    const result = await func({ dataType })
    return result.data
  }

  /**
   * データのロールバック
   */
  const rollbackData = async (historyId: string) => {
    const func = httpsCallable($firebase.functions, 'rollbackData')
    const result = await func({ historyId })
    return result.data
  }

  /**
   * バックアップの作成
   */
  const createBackup = async (collections?: string[]) => {
    const func = httpsCallable($firebase.functions, 'createBackup')
    const result = await func({ collections })
    return result.data
  }

  return {
    // 認証関連
    setAdminClaim,
    setUserDisabled,
    deleteUser,

    // データ公開関連
    publishData,
    rollbackData,

    // バックアップ関連
    createBackup
  }
}