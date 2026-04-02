import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import {
  audienceCatalog,
  departmentCatalog,
  generationModeCatalog,
  recentReportStorageKey,
  styleCatalog,
  templateOptionCatalog,
} from '../config/workbench'
import { extractSourceText } from '../lib/file-extractor'
import { generateReport } from '../lib/openrouter-client'
import { demoDocument } from '../lib/mock'
import { renderTemplateHtml } from '../lib/templates'
import { copyTextToClipboard, loadRecentReports, storeRecentReport } from '../lib/ui-helpers'

const maxSourceChars = Number(import.meta.env.MAX_SOURCE_CHARS || 18000)

export function useWorkbenchController() {
  const [inputMode, setInputMode] = useState('file')
  const [selectedFile, setSelectedFile] = useState(null)
  const [manualText, setManualText] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState(null)
  const [generationMode, setGenerationMode] = useState('structured-template')
  const [stylePreference, setStylePreference] = useState('official')
  const [department, setDepartment] = useState('science-research-center')
  const [audience, setAudience] = useState('director')
  const [customRequirement] = useState('')
  const [sensitiveMode, setSensitiveMode] = useState(false)
  const [previewDevice, setPreviewDevice] = useState('desktop')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState({ step: 'idle', percent: 0 })
  const [errorMessage, setErrorMessage] = useState('')
  const [warnings, setWarnings] = useState([])
  const [modelUsed, setModelUsed] = useState('待生成')
  const [sourceType, setSourceType] = useState('manual')
  const [generatedAt, setGeneratedAt] = useState('')
  const [generatedHtml, setGeneratedHtml] = useState(null)
  const [extractedPreview, setExtractedPreview] = useState('')
  const [requestPayload, setRequestPayload] = useState(null)
  const [responsePayload, setResponsePayload] = useState(null)
  const [documentData, setDocumentData] = useState(demoDocument)
  const [logs, setLogs] = useState([])
  const [isReportReady, setIsReportReady] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [copiedReady, setCopiedReady] = useState(false)
  const [reportLink, setReportLink] = useState('')
  const [recentReports, setRecentReports] = useState(() => loadRecentReports(recentReportStorageKey))
  const [isFullscreen, setIsFullscreen] = useState(false)

  const previewStageRef = useRef(null)
  const templateBridgeListRef = useRef(null)

  const selectedTemplate = useMemo(
    () => templateOptionCatalog.find((item) => item.id === selectedTemplateId) ?? null,
    [selectedTemplateId],
  )
  const defaultTemplateMeta = templateOptionCatalog[0]?.templateMeta ?? null
  const currentStyle = styleCatalog.find((item) => item.id === stylePreference) ?? styleCatalog[0]

  const hasContent = inputMode === 'file' ? Boolean(selectedFile) : Boolean(manualText.trim())
  const canGenerate = Boolean(hasContent && (generationMode === 'llm-html' || selectedTemplate)) && !isGenerating
  const canResetReport = Boolean(isReportReady && !isGenerating)
  const canPrimaryAction = canGenerate || canResetReport
  const exportReady = Boolean(isReportReady && reportLink)
  const copyReady = Boolean(isReportReady && reportLink)

  const context = {
    department,
    audience,
    customRequirement: customRequirement.trim(),
    generationMode,
  }

  const previewState = isGenerating
    ? 'generating'
    : isReportReady
      ? 'done'
      : generationMode === 'structured-template' && selectedTemplate
        ? 'template'
        : 'idle'
  const showTemplateBridge = generationMode === 'structured-template' && !isReportReady
  const fullscreenReady = Boolean(isReportReady || previewState === 'template')

  const previewHtml = useMemo(() => {
    if (generationMode === 'llm-html') {
      if (!isReportReady) {
        return ''
      }
      return generatedHtml || ''
    }

    if (!selectedTemplate) {
      return ''
    }

    const stamp = generatedAt || new Date().toLocaleString('zh-CN')
    const templateData = isReportReady ? documentData : demoDocument
    return renderTemplateHtml(selectedTemplate.templateMeta.id, templateData, stamp, { runtimeMode: 'preview' })
  }, [documentData, generatedAt, generatedHtml, generationMode, isReportReady, selectedTemplate])

  const iframeKey = `${generationMode}-${selectedTemplate?.id || 'none'}-${generatedAt || 'preview'}`

  const pushLog = (entry) => {
    const serialized = JSON.stringify(entry.payload, null, 2)
    const output = `${entry.kind === 'business' ? '业务JSON' : entry.kind === 'error' ? '系统日志-错误' : '系统日志'} | 模块=${entry.module} | 事件=${entry.event} | 内容=${serialized}`
    if (entry.kind === 'error') {
      console.error(output)
    } else {
      console.info(output)
    }
    setLogs((prev) => [entry, ...prev].slice(0, 20))
  }

  const resetGeneratedOutput = () => {
    if (isGenerating) {
      return
    }

    setIsReportReady(false)
    setGeneratedAt('')
    setGeneratedHtml(null)
    setErrorMessage('')
    setWarnings([])
    setModelUsed('待生成')
    setSourceType('manual')
    setExtractedPreview('')
    setRequestPayload(null)
    setResponsePayload(null)
    setShowSuccessToast(false)
    setCopiedReady(false)
    setDocumentData(demoDocument)
  }

  const handleGenerate = async () => {
    if (generationMode === 'structured-template' && !selectedTemplate) {
      setErrorMessage('请先选择一个模板。')
      return
    }

    const templateMeta = selectedTemplate?.templateMeta ?? defaultTemplateMeta
    if (!templateMeta) {
      setErrorMessage('未找到可用模板配置。')
      return
    }

    if (!hasContent) {
      setErrorMessage('请先上传文件或输入正文。')
      return
    }

    setIsGenerating(true)
    setGenerationProgress({ step: 'extract', percent: 22 })
    setErrorMessage('')
    setWarnings([])
    setIsReportReady(false)
    setShowSuccessToast(false)

    pushLog({
      kind: 'system',
      module: '转换编排',
      event: '开始生成',
      payload: {
        inputMode,
        generationMode,
        templateId: selectedTemplate?.id ?? templateMeta.id,
        stylePreference,
        department,
        audience,
        sensitiveMode,
      },
      timestamp: new Date().toISOString(),
    })

    try {
      const extraction = await extractSourceText({
        file: inputMode === 'file' ? selectedFile : null,
        text: inputMode === 'text' ? manualText : '',
        maxChars: maxSourceChars,
        pushLog,
      })

      setGenerationProgress({ step: 'analyze', percent: generationMode === 'llm-html' ? 58 : 64 })

      const result = await generateReport({
        rawText: extraction.rawText,
        sensitiveMode,
        styleMeta: currentStyle,
        templateMeta,
        context,
        pushLog,
      })

      setGenerationProgress({ step: 'render', percent: 92 })

      const now = new Date().toLocaleString('zh-CN', { hour12: false })
      const mergedWarnings = [...extraction.warnings, ...result.warnings]
      const nextDocument = result.document || demoDocument

      setDocumentData(nextDocument)
      setWarnings(mergedWarnings)
      setModelUsed(result.modelUsed)
      setSourceType(extraction.sourceType)
      setGeneratedAt(now)
      setGeneratedHtml(result.generatedHtml ?? null)
      setExtractedPreview(extraction.extractedPreview)
      setRequestPayload(result.requestPayload)
      setResponsePayload(result.responsePayload)
      setIsReportReady(true)
      setShowSuccessToast(true)

      const nextRecentReports = storeRecentReport(recentReportStorageKey, {
        id: `${Date.now()}`,
        title: nextDocument.title || selectedTemplate?.name || '未命名报告',
        generatedAt: now,
      })
      setRecentReports(nextRecentReports)

      pushLog({
        kind: 'business',
        module: '转换编排',
        event: '输出',
        payload: {
          title: nextDocument.title,
          modelUsed: result.modelUsed,
          warningCount: mergedWarnings.length,
          sourceType: extraction.sourceType,
          generationMode,
          templateId: selectedTemplate?.id ?? templateMeta.id,
        },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '生成失败，请稍后重试。'
      setErrorMessage(message)
      pushLog({
        kind: 'error',
        module: '转换编排',
        event: '执行失败',
        payload: { message },
        timestamp: new Date().toISOString(),
      })
    } finally {
      setIsGenerating(false)
      setGenerationProgress({ step: 'idle', percent: 0 })
    }
  }

  const handleGenerateAction = async () => {
    if (isReportReady) {
      pushLog({
        kind: 'system',
        module: '转换编排',
        event: '清空当前报告',
        payload: {
          generationMode,
          templateId: selectedTemplate?.id ?? null,
        },
        timestamp: new Date().toISOString(),
      })
      resetGeneratedOutput()
      return
    }
    await handleGenerate()
  }

  const handleTemplateSelect = (templateId) => {
    if (!templateId) {
      return
    }
    if (selectedTemplate?.id === templateId && selectedTemplateId === templateId) {
      return
    }
    resetGeneratedOutput()
    setSelectedTemplateId(templateId)
  }

  const handleExport = () => {
    if (!previewHtml) {
      return
    }

    const exportHtml =
      generationMode === 'structured-template' && selectedTemplate
        ? renderTemplateHtml(selectedTemplate.templateMeta.id, documentData, generatedAt || new Date().toLocaleString('zh-CN'), {
            runtimeMode: 'full',
          })
        : previewHtml

    const blob = new Blob([exportHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${documentData.title || selectedTemplate?.name || 'reportflow'}.html`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyLink = async () => {
    if (!reportLink) {
      return
    }
    try {
      await copyTextToClipboard(reportLink)
      setCopiedReady(true)
    } catch (error) {
      console.error('复制报告链接失败', error)
    }
  }

  const handleFullscreen = async () => {
    if (!previewStageRef.current) {
      return
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        return
      }
      if (previewStageRef.current.requestFullscreen) {
        await previewStageRef.current.requestFullscreen()
      }
    } catch (error) {
      console.error('切换全屏失败', error)
    }
  }

  const handleShortcut = useEffectEvent((event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && canPrimaryAction) {
      event.preventDefault()
      handleGenerateAction()
    }
  })

  useEffect(() => {
    window.addEventListener('keydown', handleShortcut)
    return () => {
      window.removeEventListener('keydown', handleShortcut)
    }
  }, [handleShortcut])

  useEffect(() => {
    if (!showSuccessToast) {
      return undefined
    }
    const timer = window.setTimeout(() => {
      setShowSuccessToast(false)
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [showSuccessToast])

  useEffect(() => {
    if (!copiedReady) {
      return undefined
    }
    const timer = window.setTimeout(() => {
      setCopiedReady(false)
    }, 1600)
    return () => window.clearTimeout(timer)
  }, [copiedReady])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  useEffect(() => {
    if (!isReportReady || !previewHtml) {
      setReportLink('')
      return undefined
    }

    const blob = new Blob([previewHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    setReportLink(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [isReportReady, previewHtml])

  useEffect(() => {
    if (!showTemplateBridge || !selectedTemplate?.id || !templateBridgeListRef.current) {
      return
    }

    const target = templateBridgeListRef.current.querySelector(`[data-template-id="${selectedTemplate.id}"]`)
    if (!target) {
      return
    }

    target.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [selectedTemplate?.id, showTemplateBridge])

  return {
    audience,
    audienceCatalog,
    canGenerate,
    canPrimaryAction,
    copiedReady,
    copyReady,
    department,
    departmentCatalog,
    documentData,
    errorMessage,
    exportReady,
    fullscreenReady,
    generationMode,
    generationModeCatalog,
    generationProgress,
    handleCopyLink,
    handleExport,
    handleFullscreen,
    handleGenerateAction,
    handleTemplateSelect,
    iframeKey,
    inputMode,
    isGenerating,
    isReportReady,
    manualText,
    onAudienceChange: (value) => {
      resetGeneratedOutput()
      setAudience(value)
    },
    onDepartmentChange: (value) => {
      resetGeneratedOutput()
      setDepartment(value)
    },
    onFileRemove: () => {
      resetGeneratedOutput()
      setSelectedFile(null)
    },
    onFileSelect: (file) => {
      resetGeneratedOutput()
      setSelectedFile(file)
    },
    onGenerationModeChange: (value) => {
      resetGeneratedOutput()
      setGenerationMode(value)
    },
    onInputModeChange: (value) => {
      resetGeneratedOutput()
      setInputMode(value)
    },
    onManualTextChange: (value) => {
      resetGeneratedOutput()
      setManualText(value)
    },
    onSensitiveModeChange: () => {
      resetGeneratedOutput()
      setSensitiveMode((prev) => !prev)
    },
    onStyleChange: (value) => {
      resetGeneratedOutput()
      setStylePreference(value)
    },
    previewDevice,
    previewHtml,
    previewStageRef,
    previewState,
    recentReports,
    selectedFile,
    selectedTemplate,
    sensitiveMode,
    setPreviewDevice,
    showSuccessToast,
    showTemplateBridge,
    styleCatalog,
    stylePreference,
    templateBridgeListRef,
    templateOptionCatalog,
    warnings,
  }
}
