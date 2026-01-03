import axios from 'axios'
import { ref } from 'vue'

import type { ApiResponse } from '@/types/api'
import type { PluginMarketItem, ToastColor } from '@/types/extension'

export type ToastFn = (message: unknown, color: ToastColor, timeToClose?: number) => void
export type Tm = (key: string, ...args: any[]) => string

type InstallResult = { name: string; repo?: string | null }

export function usePluginInstall({
  tm,
  toast,
  loadingFlag,
  setLoading,
  onLoadingResult,
  afterInstall
}: {
  tm: Tm
  toast: ToastFn
  loadingFlag: { value: boolean }
  setLoading: (title: string) => void
  onLoadingResult: (statusCode: number, result: unknown, timeToClose?: number) => void
  afterInstall: (result: InstallResult) => Promise<void>
}) {
  const fileInput = ref<{ click?: () => void } | null>(null)

  const extension_url = ref('')
  const dialog = ref(false)
  const upload_file = ref<File | null>(null)
  const uploadTab = ref<'file' | 'url'>('file')

  const dangerConfirmDialog = ref(false)
  const selectedDangerPlugin = ref<PluginMarketItem | null>(null)

  const handleInstallPlugin = async (plugin: PluginMarketItem) => {
    if (plugin.tags && plugin.tags.includes('danger')) {
      selectedDangerPlugin.value = plugin
      dangerConfirmDialog.value = true
    } else {
      extension_url.value = plugin.repo || ''
      dialog.value = true
      uploadTab.value = 'url'
    }
  }

  const confirmDangerInstall = () => {
    if (selectedDangerPlugin.value) {
      extension_url.value = selectedDangerPlugin.value.repo || ''
      dialog.value = true
      uploadTab.value = 'url'
    }
    dangerConfirmDialog.value = false
    selectedDangerPlugin.value = null
  }

  const cancelDangerInstall = () => {
    dangerConfirmDialog.value = false
    selectedDangerPlugin.value = null
  }

  const newExtension = async () => {
    if (extension_url.value === '' && upload_file.value === null) {
      toast(tm('messages.fillUrlOrFile'), 'error')
      return
    }

    if (extension_url.value !== '' && upload_file.value !== null) {
      toast(tm('messages.dontFillBoth'), 'error')
      return
    }

    loadingFlag.value = true
    setLoading(tm('status.loading'))

    if (upload_file.value !== null) {
      toast(tm('messages.installing'), 'primary')
      const formData = new FormData()
      formData.append('file', upload_file.value)
      try {
        const res = await axios.post<ApiResponse<InstallResult>>('/api/plugin/install-upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })

        if (res.data.status === 'error') {
          onLoadingResult(2, res.data.message, -1)
          return
        }

        upload_file.value = null
        onLoadingResult(1, res.data.message)
        dialog.value = false

        await afterInstall(res.data.data)
      } catch (err) {
        onLoadingResult(2, err, -1)
      } finally {
        loadingFlag.value = false
      }
    } else {
      toast(tm('messages.installingFromUrl') + ' ' + extension_url.value, 'primary')
      try {
        const res = await axios.post<ApiResponse<InstallResult>>('/api/plugin/install', {
          url: extension_url.value,
          proxy: localStorage.getItem('selectedGitHubProxy') || ''
        })

        toast(res.data.message, res.data.status === 'ok' ? 'success' : 'error')
        if (res.data.status === 'error') {
          onLoadingResult(2, res.data.message, -1)
          return
        }

        extension_url.value = ''
        onLoadingResult(1, res.data.message)
        dialog.value = false

        await afterInstall(res.data.data)
      } catch (err) {
        toast(tm('messages.installFailed') + ' ' + err, 'error')
        onLoadingResult(2, err, -1)
      } finally {
        loadingFlag.value = false
      }
    }
  }

  return {
    fileInput,

    extension_url,
    dialog,
    upload_file,
    uploadTab,

    dangerConfirmDialog,
    selectedDangerPlugin,

    handleInstallPlugin,
    confirmDangerInstall,
    cancelDangerInstall,

    newExtension
  }
}
