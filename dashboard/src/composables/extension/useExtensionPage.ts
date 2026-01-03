import { onMounted, ref, watch } from 'vue'

import { useModuleI18n } from '@/i18n/composables'
import { useCommonStore } from '@/stores/common'

import type { ExtensionActiveTab } from '@/types/extension'

import { useCommandConflicts } from './useCommandConflicts'
import { useInstalledPlugins } from './useInstalledPlugins'
import { useLoadingDialog } from './useLoadingDialog'
import { usePluginInstall } from './usePluginInstall'
import { usePluginMarket } from './usePluginMarket'
import { usePluginSources } from './usePluginSources'
import { useSnackToast } from './useSnackToast'
import { normalizeMessage, toReadmeUrl } from './utils'

type InstallResult = { name: string; repo?: string | null }

export function useExtensionPage() {
  const commonStore = useCommonStore()
  const { tm } = useModuleI18n('features/extension')

  const activeTab = ref<ExtensionActiveTab>('installed')

  const marketLoading = ref(false)

  const marketFetchedKey = ref<string | null>(null)
  const marketProcessedKey = ref<string | null>(null)

  const { snack_message, snack_show, snack_success, toast } = useSnackToast()
  const { loadingDialog, resetLoadingDialog, onLoadingDialogResult } = useLoadingDialog(tm)

  const { conflictDialog, checkAndPromptConflicts, handleConflictConfirm } = useCommandConflicts({
    onGoToManage: () => {
      activeTab.value = 'components'
    }
  })

  const viewReadme = (plugin: { name: string; repo?: string | null }) => {
    const url = toReadmeUrl(plugin.repo ?? null)
    if (!url) return
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const setLoading = (title: string) => {
    loadingDialog.title = title
    loadingDialog.statusCode = 0
    loadingDialog.result = ''
    loadingDialog.show = true
  }

  const installed = useInstalledPlugins({
    tm,
    toast,
    loadingDialog,
    onLoadingDialogResult,
    afterPluginOn: checkAndPromptConflicts
  })

  const sources = usePluginSources({
    tm,
    toast,
    onSelectedChange: () => {
      marketFetchedKey.value = null
      marketProcessedKey.value = null

      if (activeTab.value === 'market') {
        void refreshPluginMarket()
      } else {
        void fetchMarketData(false)
      }
    }
  })

  const market = usePluginMarket({
    tm,
    toast,
    selectedSource: sources.selectedSource,
    getInstalledPlugins: () => (Array.isArray(installed.extension_data?.data) ? installed.extension_data.data : [])
  })

  const checkUpdate = () => {
    installed.checkUpdate(market.pluginMarketData.value)
  }

  const getSourceKey = (sourceUrl: string | null) => sourceUrl ?? '__default__'

  const fetchMarketData = async (force = false) => {
    const key = getSourceKey(sources.selectedSource.value)
    if (!force && marketFetchedKey.value === key) return

    try {
      marketLoading.value = true
      const data = await commonStore.getPluginCollections(force, sources.selectedSource.value)
      market.pluginMarketData.value = data
      marketFetchedKey.value = key

      // Keep installed page update indicators working without doing heavy market indexing.
      checkUpdate()
    } catch (err) {
      toast(tm('messages.getMarketDataFailed') + ' ' + err, 'error')
    } finally {
      marketLoading.value = false
    }
  }

  const processMarketDataIfNeeded = () => {
    const key = getSourceKey(sources.selectedSource.value)
    if (marketProcessedKey.value === key) return

    market.trimExtensionName()
    market.checkAlreadyInstalled()
    marketProcessedKey.value = key
  }

  const refreshPluginMarket = async () => {
    await market.loadPluginMarket(true, true)
    const key = getSourceKey(sources.selectedSource.value)
    marketFetchedKey.value = key
    marketProcessedKey.value = key
    checkUpdate()
  }

  const afterInstall = async (result: InstallResult) => {
    await installed.getExtensions()
    if (marketFetchedKey.value) {
      market.checkAlreadyInstalled()
      checkUpdate()
    }
    viewReadme({ name: result.name, repo: result.repo ?? null })
    await checkAndPromptConflicts()
  }

  const install = usePluginInstall({
    tm,
    toast,
    loadingFlag: installed.loading_,
    setLoading,
    onLoadingResult: onLoadingDialogResult,
    afterInstall
  })

  onMounted(() => {
    void installed.getExtensions()

    void (async () => {
      await sources.loadCustomSources()
      await fetchMarketData(false)
    })()

    let urlParams: URLSearchParams
    if (window.location.hash) {
      const hashQuery = window.location.hash.split('?')[1] || ''
      urlParams = new URLSearchParams(hashQuery)
    } else {
      urlParams = new URLSearchParams(window.location.search)
    }
    const plugin_name = urlParams.get('open_config')
    if (plugin_name) {
      void installed.openExtensionConfig(plugin_name)
    }
  })

  watch(activeTab, tab => {
    if (tab !== 'market') return

    void (async () => {
      await fetchMarketData(false)
      processMarketDataIfNeeded()
    })()
  })

  return {
    tm,

    marketLoading,

    conflictDialog,
    checkAndPromptConflicts,
    handleConflictConfirm,

    fileInput: install.fileInput,
    activeTab,

    extension_data: installed.extension_data,
    showReserved: installed.showReserved,
    snack_message,
    snack_show,
    snack_success,
    configDialog: installed.configDialog,
    extension_config: installed.extension_config,
    pluginMarketData: market.pluginMarketData,
    loadingDialog,
    showPluginInfoDialog: installed.showPluginInfoDialog,
    selectedPlugin: installed.selectedPlugin,
    curr_namespace: installed.curr_namespace,
    updatingAll: installed.updatingAll,

    isListView: installed.isListView,
    pluginSearch: installed.pluginSearch,
    loading_: installed.loading_,

    currentPage: market.currentPage,
    displayItemsPerPage: market.displayItemsPerPage,

    dangerConfirmDialog: install.dangerConfirmDialog,
    selectedDangerPlugin: install.selectedDangerPlugin,

    showUninstallDialog: installed.showUninstallDialog,
    pluginToUninstall: installed.pluginToUninstall,

    forceUpdateDialog: installed.forceUpdateDialog,

    showSourceDialog: sources.showSourceDialog,
    sourceName: sources.sourceName,
    sourceUrl: sources.sourceUrl,
    customSources: sources.customSources,
    selectedSource: sources.selectedSource,
    showRemoveSourceDialog: sources.showRemoveSourceDialog,
    sourceToRemove: sources.sourceToRemove,
    editingSource: sources.editingSource,
    originalSourceUrl: sources.originalSourceUrl,

    extension_url: install.extension_url,
    dialog: install.dialog,
    upload_file: install.upload_file,
    uploadTab: install.uploadTab,
    showPluginFullName: market.showPluginFullName,
    marketSearch: market.marketSearch,
    debouncedMarketSearch: market.debouncedMarketSearch,
    refreshingMarket: market.refreshingMarket,
    sortBy: market.sortBy,
    sortOrder: market.sortOrder,

    sortOptions: market.sortOptions,

    plugin_handler_info_headers: installed.plugin_handler_info_headers,
    pluginHeaders: installed.pluginHeaders,

    filteredExtensions: installed.filteredExtensions,
    filteredPlugins: installed.filteredPlugins,
    filteredMarketPlugins: market.filteredMarketPlugins,
    sortedPlugins: market.sortedPlugins,
    totalPages: market.totalPages,
    paginatedPlugins: market.paginatedPlugins,
    updatableExtensions: installed.updatableExtensions,

    toggleShowReserved: installed.toggleShowReserved,

    normalizeMessage,
    toast,

    resetLoadingDialog,
    onLoadingDialogResult,

    getExtensions: installed.getExtensions,
    checkUpdate,

    uninstallExtension: installed.uninstallExtension,
    handleUninstall: installed.handleUninstall,
    handleUninstallConfirm: installed.handleUninstallConfirm,

    updateExtension: installed.updateExtension,
    updateAllExtensions: installed.updateAllExtensions,

    confirmForceUpdate: installed.confirmForceUpdate,
    cancelForceUpdate: installed.cancelForceUpdate,

    pluginOn: installed.pluginOn,
    pluginOff: installed.pluginOff,

    openExtensionConfig: installed.openExtensionConfig,
    updateConfig: installed.updateConfig,

    showPluginInfo: installed.showPluginInfo,
    reloadPlugin: installed.reloadPlugin,

    toReadmeUrl,
    viewReadme,

    handleInstallPlugin: install.handleInstallPlugin,
    confirmDangerInstall: install.confirmDangerInstall,
    cancelDangerInstall: install.cancelDangerInstall,

    loadCustomSources: sources.loadCustomSources,
    saveCustomSources: sources.saveCustomSources,
    addCustomSource: sources.addCustomSource,
    selectPluginSource: sources.selectPluginSource,
    selectedSourceObj: sources.selectedSourceObj,
    editCustomSource: sources.editCustomSource,
    removeCustomSource: sources.removeCustomSource,
    confirmRemoveSource: sources.confirmRemoveSource,
    saveCustomSource: sources.saveCustomSource,

    trimExtensionName: market.trimExtensionName,
    checkAlreadyInstalled: market.checkAlreadyInstalled,
    refreshPluginMarket,

    newExtension: install.newExtension,

    marketCustomFilter: market.marketCustomFilter
  }
}
