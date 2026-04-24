import { useMemo, useRef, useState } from 'react'
import {
  departmentCatalog,
  styleCatalog,
} from '../config/workbench'
import {
  posterAspectRatioCatalog,
  posterImageSizeCatalog,
  posterSceneCatalog,
  posterStyleCatalog,
  recentPosterStorageKey,
} from '../config/poster'
import { loadRecentReports, storeRecentReport } from '../lib/ui-helpers'

const maxSourceChars = Number(import.meta.env.MAX_SOURCE_CHARS || 18000)
let extractSourceTextLoader = null
let generatePosterLoader = null

async function loadExtractSourceText() {
  if (!extractSourceTextLoader) {
    extractSourceTextLoader = import('../lib/file-extractor').then((module) => module.extractSourceText)
  }
  return extractSourceTextLoader
}

async function loadGeneratePoster() {
  if (!generatePosterLoader) {
    generatePosterLoader = import('../lib/poster').then((module) => module.generatePoster)
  }
  return generatePosterLoader
}

function mergeUniqueFiles(currentFiles, nextFiles) {
  const merged = Array.isArray(currentFiles) ? [...currentFiles] : []
  const nextList = Array.isArray(nextFiles) ? nextFiles : []
  const fingerprintSet = new Set(merged.map((file) => `${file.name}::${file.size}::${file.lastModified}`))

  for (const file of nextList) {
    const fingerprint = `${file.name}::${file.size}::${file.lastModified}`
    if (fingerprintSet.has(fingerprint)) {
      continue
    }
    merged.push(file)
    fingerprintSet.add(fingerprint)
  }

  return merged
}

function downloadFile(url, filename) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.click()
}

export function usePosterWorkbenchController() {
  const [inputMode, setInputMode] = useState('file')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [manualText, setManualText] = useState('')
  const [posterSceneId, setPosterSceneId] = useState('external-achievement')
  const [posterStyleId, setPosterStyleId] = useState('academy-premium')
  const [department, setDepartment] = useState('science-research-center')
  const [stylePreference, setStylePreference] = useState('official')
  const [aspectRatio, setAspectRatio] = useState('4:5')
  const [imageSize, setImageSize] = useState('1K')
  const [sensitiveMode, setSensitiveMode] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState({ step: 'idle', percent: 0 })
  const [errorMessage, setErrorMessage] = useState('')
  const [warnings, setWarnings] = useState([])
  const [posterData, setPosterData] = useState({
    title: '未生成海报',
    subtitle: '上传文档后可生成研究院宣传海报',
    brief: null,
    imageDataUrl: '',
    modelUsed: '待生成',
    promptSummary: '',
    extractedPreview: '',
  })
  const [recentPosters, setRecentPosters] = useState(() => loadRecentReports(recentPosterStorageKey))

  const logsRef = useRef([])

  const posterScene = useMemo(
    () => posterSceneCatalog.find((item) => item.id === posterSceneId) ?? posterSceneCatalog[0],
    [posterSceneId],
  )
  const posterStyle = useMemo(
    () => posterStyleCatalog.find((item) => item.id === posterStyleId) ?? posterStyleCatalog[0],
    [posterStyleId],
  )
  const departmentMeta = useMemo(
    () => departmentCatalog.find((item) => item.id === department) ?? departmentCatalog[0],
    [department],
  )

  const hasContent = inputMode === 'file' ? selectedFiles.length > 0 : Boolean(manualText.trim())
  const isPosterReady = Boolean(posterData.imageDataUrl)
  const canGenerate = hasContent && !isGenerating
  const canReset = isPosterReady && !isGenerating
  const canPrimaryAction = canGenerate || canReset
  const downloadReady = Boolean(isPosterReady && !isGenerating)

  const pushLog = (entry) => {
    const serialized = JSON.stringify(entry.payload, null, 2)
    const output = `${entry.kind === 'business' ? '业务JSON' : entry.kind === 'error' ? '系统日志-错误' : '系统日志'} | 模块=${entry.module} | 事件=${entry.event} | 内容=${serialized}`
    if (entry.kind === 'error') {
      console.error(output)
    } else {
      console.info(output)
    }
    logsRef.current = [entry, ...logsRef.current].slice(0, 20)
  }

  const resetPosterOutput = () => {
    if (isGenerating) {
      return
    }
    setErrorMessage('')
    setWarnings([])
    setPosterData({
      title: '未生成海报',
      subtitle: '上传文档后可生成研究院宣传海报',
      brief: null,
      imageDataUrl: '',
      modelUsed: '待生成',
      promptSummary: '',
      extractedPreview: '',
    })
  }

  const handleGenerate = async () => {
    if (isPosterReady) {
      pushLog({
        kind: 'system',
        module: '海报编排',
        event: '清空海报结果',
        payload: { posterScene: posterScene.id, posterStyle: posterStyle.id },
        timestamp: new Date().toISOString(),
      })
      resetPosterOutput()
      return
    }

    if (!hasContent) {
      setErrorMessage('请先上传文件或输入正文。')
      return
    }

    setIsGenerating(true)
    setGenerationProgress({ step: 'extract', percent: 18 })
    setErrorMessage('')
    setWarnings([])

    try {
      const [extractSourceText, generatePoster] = await Promise.all([loadExtractSourceText(), loadGeneratePoster()])
      const extraction = await extractSourceText({
        files: inputMode === 'file' ? selectedFiles : [],
        text: inputMode === 'text' ? manualText : '',
        maxChars: maxSourceChars,
        pushLog,
      })

      setGenerationProgress({ step: 'analyze', percent: 56 })

      const result = await generatePoster({
        rawText: extraction.rawText,
        posterScene,
        posterStyle,
        departmentName: departmentMeta.name,
        stylePreference,
        aspectRatio,
        imageSize,
        sensitiveMode,
        pushLog,
      })

      setGenerationProgress({ step: 'render', percent: 92 })

      setPosterData({
        ...result,
        extractedPreview: extraction.extractedPreview,
      })
      setWarnings([...extraction.warnings, ...result.warnings])

      const nextRecentPosters = storeRecentReport(recentPosterStorageKey, {
        id: `${Date.now()}`,
        title: result.title || '未命名海报',
        generatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      })
      setRecentPosters(nextRecentPosters)
    } catch (error) {
      const message = error instanceof Error ? error.message : '海报生成失败，请稍后重试。'
      setErrorMessage(message)
      pushLog({
        kind: 'error',
        module: '海报编排',
        event: '执行失败',
        payload: { message },
        timestamp: new Date().toISOString(),
      })
    } finally {
      setIsGenerating(false)
      setGenerationProgress({ step: 'idle', percent: 0 })
    }
  }

  const handleDownload = () => {
    if (!posterData.imageDataUrl) {
      return
    }
    const fileBase = (posterData.title || 'docs2brief-poster').replace(/[\\/:*?"<>|]/g, '-').slice(0, 60)
    const extension = posterData.imageDataUrl.startsWith('data:image/svg+xml') ? 'svg' : posterData.imageDataUrl.startsWith('data:image/png') ? 'png' : 'jpg'

    pushLog({
      kind: 'system',
      module: '海报编排',
      event: '下载海报',
      payload: { title: posterData.title, extension },
      timestamp: new Date().toISOString(),
    })

    downloadFile(posterData.imageDataUrl, `${fileBase}.${extension}`)
  }

  return {
    aspectRatio,
    aspectRatioCatalog: posterAspectRatioCatalog,
    canPrimaryAction,
    department,
    departmentCatalog,
    downloadReady,
    errorMessage,
    generationProgress,
    handleDownload,
    handleGenerateAction: handleGenerate,
    imageSize,
    imageSizeCatalog: posterImageSizeCatalog,
    inputMode,
    isGenerating,
    isPosterReady,
    manualText,
    onAspectRatioChange: (value) => {
      resetPosterOutput()
      setAspectRatio(value)
    },
    onDepartmentChange: (value) => {
      resetPosterOutput()
      setDepartment(value)
    },
    onFileRemove: (targetIndex) => {
      resetPosterOutput()
      setSelectedFiles((prev) => {
        if (!Array.isArray(prev) || prev.length === 0) {
          return []
        }
        if (typeof targetIndex !== 'number') {
          return []
        }
        return prev.filter((_, index) => index !== targetIndex)
      })
    },
    onFileSelect: (files) => {
      resetPosterOutput()
      setSelectedFiles((prev) => mergeUniqueFiles(prev, Array.isArray(files) ? files : []))
    },
    onImageSizeChange: (value) => {
      resetPosterOutput()
      setImageSize(value)
    },
    onInputModeChange: (value) => {
      resetPosterOutput()
      setInputMode(value)
    },
    onManualTextChange: (value) => {
      resetPosterOutput()
      setManualText(value)
    },
    onPosterSceneChange: (value) => {
      resetPosterOutput()
      setPosterSceneId(value)
    },
    onPosterStyleChange: (value) => {
      resetPosterOutput()
      setPosterStyleId(value)
    },
    onSensitiveModeChange: () => {
      resetPosterOutput()
      setSensitiveMode((prev) => !prev)
    },
    onStyleChange: (value) => {
      resetPosterOutput()
      setStylePreference(value)
    },
    posterData,
    posterScene,
    posterSceneCatalog,
    posterStyle,
    posterStyleCatalog,
    recentPosters,
    selectedFiles,
    sensitiveMode,
    styleCatalog,
    stylePreference,
    warnings,
  }
}
