"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import dynamic from "next/dynamic"
import "@excalidraw/excalidraw/index.css"
import { createClient } from "@/utils/supabase/client"
import { useTheme } from "@/components/ThemeProvider"
import { Button } from "@/components/ui/Button"
import { Maximize2, Minimize2, ArrowLeft, Cloud, CloudLightning, Loader2, Save, CloudOff, AlertCircle } from "lucide-react"
import Link from "next/link"

interface WhiteboardProps {
  boardId: string
  boardName: string
}

// Importar Excalidraw de forma dinâmica (desativando SSR)
const Excalidraw = dynamic(
  async () => {
    const module = await import("@excalidraw/excalidraw")
    return module.Excalidraw
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] bg-surface rounded-2xl border border-border shadow-soft gap-4">
        <Loader2 className="w-8 h-8 text-indigo animate-spin" />
        <p className="text-muted animate-pulse font-medium">Carregando painel do Excalidraw...</p>
      </div>
    ),
  }
)

// Lógica de compressão de imagem para WebP com 70% de qualidade
const compressToWebp = (file: Blob, quality: number = 0.7): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Erro ao obter o contexto 2D do Canvas"))
        return
      }
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error("Falha ao comprimir imagem para WebP"))
          }
        },
        "image/webp",
        quality
      )
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl)
      reject(err)
    }
    img.src = objectUrl
  })
}

// Converte dataURL (base64) para Blob
const dataURLtoBlob = (dataurl: string): Blob => {
  const arr = dataurl.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

export default function Whiteboard({ boardId, boardName }: WhiteboardProps) {
  const { theme } = useTheme()
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isLocalMode, setIsLocalMode] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const supabase = createClient()
  const isLoadedRef = useRef(false)

  // 1. Carregar o estado inicial do banco de dados (Supabase)
  const loadInitialState = useCallback(async (api: any) => {
    if (!api) return
    try {
      setLoading(true)
      isLoadedRef.current = false

      const { data, error } = await supabase
        .from("habit_boards")
        .select("content")
        .eq("id", boardId)
        .single()

      if (error) {
        if (error.code === "PGRST205") {
          setIsLocalMode(true)
          console.warn("Tabela 'habit_boards' não encontrada no banco. Ativando Modo Local (IndexedDB).")
        } else if (error.code !== "PGRST116") {
          throw error
        }
      }

      if (data?.content) {
        try {
          const boardState = typeof data.content === "string" ? JSON.parse(data.content) : data.content
          
          if (boardState.elements) {
            api.updateScene({
              elements: boardState.elements,
              appState: {
                ...boardState.appState,
                theme: theme, // Sincroniza com o tema atual
              },
            })
          }
          if (boardState.files) {
            api.addFiles(Object.values(boardState.files))
          }
        } catch (snapshotErr) {
          console.error("Erro ao carregar dados do Excalidraw:", snapshotErr)
        }
      }

      setSaveStatus("idle")
      setHasUnsavedChanges(false)
    } catch (err) {
      console.error("Erro ao carregar estado do quadro:", err)
      setSaveStatus("error")
    } finally {
      setLoading(false)
      setTimeout(() => {
        isLoadedRef.current = true
      }, 500)
    }
  }, [boardId, supabase, theme])

  // Inicializa quando o ExcalidrawAPI estiver pronto
  useEffect(() => {
    if (excalidrawAPI) {
      loadInitialState(excalidrawAPI)
    }
  }, [excalidrawAPI, loadInitialState])

  // 2. Ouvinte para marcar alterações locais pendentes
  const handlePointerUpdate = () => {
    if (!isLoadedRef.current) return
    setHasUnsavedChanges(true)
  }

  // 3. Lógica de compressão e upload de arquivos em lote e salvamento na nuvem
  const saveToCloud = async () => {
    if (!excalidrawAPI) return
    try {
      setSaveStatus("saving")
      
      const elements = excalidrawAPI.getSceneElements()
      const appState = excalidrawAPI.getAppState()
      const files = excalidrawAPI.getFiles()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não autenticado")

      // Filtrar arquivos base64 para compactar e enviar ao Storage
      const processedFiles = { ...files }
      let hasNewUploads = false

      for (const fileId in processedFiles) {
        const file = processedFiles[fileId]
        
        // Verifica se a URL do arquivo é local (base64)
        if (file.dataURL && file.dataURL.startsWith("data:")) {
          hasNewUploads = true
          
          // 1. Converter base64 para Blob
          const originalBlob = dataURLtoBlob(file.dataURL)
          
          // 2. Comprimir para WebP (70% de qualidade)
          const compressedBlob = await compressToWebp(originalBlob, 0.7)
          
          // 3. Gerar caminho exclusivo
          const uniqueId = Math.random().toString(36).substring(2, 15)
          const filePath = `users/${user.id}/whiteboards/${boardId}/${uniqueId}.webp`
          
          // 4. Upload para o Supabase Storage bucket 'whiteboards'
          const { error: uploadError } = await supabase.storage
            .from("whiteboards")
            .upload(filePath, compressedBlob, {
              contentType: "image/webp",
              upsert: true,
            })

          if (uploadError) throw uploadError

          // 5. Obter URL pública
          const { data: { publicUrl } } = supabase.storage
            .from("whiteboards")
            .getPublicUrl(filePath)

          // 6. Atualizar a URL no objeto de arquivos
          processedFiles[fileId] = {
            ...file,
            dataURL: publicUrl,
          }
        }
      }

      // Se houver uploads de imagens, atualizamos o Excalidraw local
      if (hasNewUploads) {
        excalidrawAPI.addFiles(Object.values(processedFiles))
      }

      // Salva a cena completa com as URLs da nuvem
      const { error } = await supabase
        .from("habit_boards")
        .update({
          content: {
            elements,
            appState: {
              theme: appState.theme,
              viewBackgroundColor: appState.viewBackgroundColor,
              gridSize: appState.gridSize,
            },
            files: processedFiles,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", boardId)

      if (error) {
        if (error.code === "PGRST205") {
          setIsLocalMode(true)
          setHasUnsavedChanges(false)
          setSaveStatus("idle")
          return
        }
        throw error
      }

      setHasUnsavedChanges(false)
      setSaveStatus("saved")
      
      setTimeout(() => {
        setSaveStatus("idle")
      }, 2000)
    } catch (err) {
      console.error("Erro ao salvar no Supabase:", err)
      setSaveStatus("error")
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  return (
    <div
      className={`flex flex-col bg-surface rounded-3xl overflow-hidden border border-border shadow-soft transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none w-screen h-screen"
          : "h-[650px] w-full"
      }`}
    >
      {/* Header do Quadro de Referência */}
      <header className="flex flex-col md:flex-row md:items-center justify-between px-4 py-4 md:px-6 md:py-4 border-b border-border bg-surface shrink-0 gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          {!isFullscreen && (
            <Link href="/whiteboards" className="shrink-0">
              <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl hover:bg-muted/5 p-0 flex items-center justify-center">
                <ArrowLeft className="w-5 h-5 text-muted" />
              </Button>
            </Link>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-[13px] md:text-base font-bold tracking-tight text-foreground flex flex-col md:flex-row md:items-start md:gap-x-2 leading-tight">
              <span className="text-muted text-[9px] font-semibold uppercase tracking-wider block shrink-0">Quadro Visual</span>
              <span className="text-indigo truncate block max-w-full mt-0.5 md:mt-0">{boardName}</span>
            </h2>
            <p className="text-[9px] md:text-xs text-muted font-semibold mt-0.5 leading-tight truncate">
              Painel para imagens, marcações e etc
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto shrink-0">
          {/* Indicador de Status Geral */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 rounded-xl bg-muted/5 text-xs font-semibold text-muted shrink-0" title={hasUnsavedChanges ? "Alterações não sincronizadas" : "Sincronizado"}>
            {isLocalMode ? (
              <>
                <CloudOff className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span className="hidden md:inline text-amber-600 dark:text-amber-500 font-bold">Modo Local (Offline)</span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-orange animate-bounce" />
                <span className="hidden md:inline text-orange">Alterações não sincronizadas</span>
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5 text-green" />
                <span className="hidden md:inline text-green/80">Sincronizado na Nuvem</span>
              </>
            )}
          </div>

          {/* Botão Salvar na Nuvem (Apenas se não for modo local) */}
          {!isLocalMode && (
            <Button
              variant={hasUnsavedChanges ? "primary" : "secondary"}
              size="sm"
              onClick={saveToCloud}
              disabled={saveStatus === "saving" || !excalidrawAPI}
              className="h-9 px-3 rounded-xl flex items-center gap-2 font-bold transition-all uppercase tracking-wider text-[10px] flex-1 md:flex-initial justify-center"
            >
              {saveStatus === "saving" ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Salvar na Nuvem</span>
                  <span className="inline sm:hidden">Salvar</span>
                </>
              )}
            </Button>
          )}

          {/* Botão de Tela Cheia */}
          <Button
            variant="secondary"
            size="sm"
            onClick={toggleFullscreen}
            className="h-9 px-3 rounded-xl flex items-center gap-2 font-bold transition-all uppercase tracking-wider text-[10px] flex-1 md:flex-initial justify-center shrink-0"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4" />
                <span>Sair</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                <span className="hidden sm:inline">Tela Cheia</span>
                <span className="inline sm:hidden">Cheia</span>
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Editor Excalidraw */}
      <div className="flex-1 relative bg-background/50 h-full min-h-[500px]">
        {loading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo animate-spin" />
            <p className="text-sm font-semibold text-muted animate-pulse">
              Carregando seu painel Excalidraw...
            </p>
          </div>
        )}
        <Excalidraw
          theme={theme}
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          onChange={handlePointerUpdate}
        />
      </div>
    </div>
  )
}
