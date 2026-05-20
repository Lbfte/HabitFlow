"use client"

import { useState, useEffect, useRef } from "react"
import { Tldraw, Editor, getSnapshot, loadSnapshot, TLAssetStore } from "tldraw"
import "tldraw/tldraw.css"
import { createClient } from "@/utils/supabase/client"
import { useTheme } from "@/components/ThemeProvider"
import { Button } from "@/components/ui/Button"
import { Maximize2, Minimize2, ArrowLeft, Cloud, CloudLightning, Loader2, Save } from "lucide-react"
import Link from "next/link"

interface WhiteboardProps {
  habitId: string
  habitName: string
}

// Lógica de compressão de imagem para WebP com 70% de qualidade
const compressToWebp = (file: File, quality: number = 0.7): Promise<Blob> => {
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

export default function Whiteboard({ habitId, habitName }: WhiteboardProps) {
  const { theme } = useTheme()
  const [editor, setEditor] = useState<Editor | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 1. Configurar o Custom Asset Store para fazer upload para o Supabase Storage
  const assetStore: TLAssetStore = {
    async upload(asset, file) {
      try {
        setSaveStatus("saving")
        
        let fileToUpload: Blob = file
        let fileExtension = file.name.split('.').pop() || 'bin'
        let mimeType = file.type

        // Comprime apenas se for imagem
        if (file.type.startsWith("image/")) {
          fileToUpload = await compressToWebp(file, 0.7)
          fileExtension = "webp"
          mimeType = "image/webp"
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Usuário não autenticado")

        const uniqueId = Math.random().toString(36).substring(2, 15)
        const filePath = `users/${user.id}/habits/${habitId}/${uniqueId}.${fileExtension}`

        // Upload da imagem (comprimida) para o bucket 'whiteboards'
        const { error: uploadError } = await supabase.storage
          .from("whiteboards")
          .upload(filePath, fileToUpload, {
            contentType: mimeType,
            upsert: true,
          })

        if (uploadError) throw uploadError

        // Obter URL pública
        const { data: { publicUrl } } = supabase.storage
          .from("whiteboards")
          .getPublicUrl(filePath)

        setSaveStatus("saved")
        return { src: publicUrl }
      } catch (err) {
        console.error("Erro no upload do asset:", err)
        setSaveStatus("error")
        throw err
      }
    },
    resolve(asset) {
      return asset.props.src
    },
  }

  // 2. Carregar o estado inicial do banco de dados (Supabase)
  useEffect(() => {
    if (!editor) return

    const loadInitialState = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("habit_boards")
          .select("content")
          .eq("habit_id", habitId)
          .single()

        if (error && error.code !== "PGRST116") {
          // PGRST116 significa que o registro não foi encontrado, o que é esperado no primeiro carregamento
          throw error
        }

        if (data?.content) {
          const doc = typeof data.content === "string" ? JSON.parse(data.content) : data.content
          loadSnapshot(editor.store, { document: doc })
        }
        setSaveStatus("saved")
      } catch (err) {
        console.error("Erro ao carregar estado do quadro:", err)
        setSaveStatus("error")
      } finally {
        setLoading(false)
      }
    }

    loadInitialState()
  }, [editor, habitId])

  // 3. Ouvinte para salvar o estado do quadro automaticamente (Debounce)
  useEffect(() => {
    if (!editor || loading) return

    const unsubscribe = editor.store.listen(
      (entry) => {
        // Limpar timer anterior
        if (autosaveTimerRef.current) {
          clearTimeout(autosaveTimerRef.current)
        }

        setSaveStatus("saving")

        // Debounce de 2 segundos para evitar excesso de requisições
        autosaveTimerRef.current = setTimeout(async () => {
          try {
            const snapshot = getSnapshot(editor.store)
            const doc = snapshot.document

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { error } = await supabase
              .from("habit_boards")
              .upsert(
                {
                  habit_id: habitId,
                  user_id: user.id,
                  content: doc,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "habit_id" }
              )

            if (error) throw error
            setSaveStatus("saved")
          } catch (err) {
            console.error("Erro no salvamento automático:", err)
            setSaveStatus("error")
          }
        }, 2000)
      },
      { scope: "document" }
    )

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
      }
      unsubscribe()
    }
  }, [editor, habitId, loading])

  // 4. Tratamento do modo tela cheia nativo do navegador (opcional/complementar)
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
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-4">
          {!isFullscreen && (
            <Link href="/habits">
              <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl hover:bg-muted/5 p-0 flex items-center justify-center">
                <ArrowLeft className="w-5 h-5 text-muted" />
              </Button>
            </Link>
          )}
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              Quadro Visual: <span className="text-indigo">{habitName}</span>
            </h2>
            <p className="text-xs text-muted font-medium">
              Caderno infinito para imagens, estudos e marcações
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Indicador de Salvamento */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/5 text-xs font-semibold text-muted">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="w-3.5 h-3.5 text-indigo animate-spin" />
                <span>Salvando...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <Cloud className="w-3.5 h-3.5 text-green" />
                <span className="text-green/80">Salvo no Supabase</span>
              </>
            )}
            {saveStatus === "error" && (
              <>
                <CloudLightning className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                <span className="text-red-500">Erro ao salvar</span>
              </>
            )}
            {saveStatus === "idle" && (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Sem alterações</span>
              </>
            )}
          </div>

          {/* Botão de Tela Cheia */}
          <Button
            variant="secondary"
            size="sm"
            onClick={toggleFullscreen}
            className="h-9 px-3 rounded-xl flex items-center gap-2 font-bold transition-all uppercase tracking-wider text-[10px]"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4" />
                <span>Sair</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                <span>Tela Cheia</span>
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Editor Tldraw */}
      <div className="flex-1 relative bg-background/50">
        {loading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo animate-spin" />
            <p className="text-sm font-semibold text-muted animate-pulse">
              Carregando seu quadro infinito...
            </p>
          </div>
        )}
        <Tldraw
          colorScheme={theme}
          onMount={(editorInstance) => setEditor(editorInstance)}
          assets={assetStore}
          persistenceKey={`habit-board-${habitId}`}
        />
      </div>
    </div>
  )
}
