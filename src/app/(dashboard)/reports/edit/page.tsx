"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { getReport, updateReport, deleteReport } from "@/app/actions/reports"
import { Report } from "@/types/database"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card } from "@/components/ui/Card"
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  Globe, 
  Lock, 
  Eye, 
  Edit3, 
  Loader2, 
  Check, 
  Copy,
  ExternalLink
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import Link from "next/link"

function EditorContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const router = useRouter()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (id) fetchReport()
  }, [id])

  const fetchReport = async () => {
    const data = await getReport(id as string)
    if (data) {
      setReport(data)
    } else {
      router.push('/reports')
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!report) return
    setSaving(true)
    await updateReport(report.id, {
      title: report.title || "",
      content: report.content || "",
      is_public: report.is_public
    })
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir este relatório?")) return
    await deleteReport(id as string)
    router.push('/reports')
  }

  const togglePublic = async () => {
    if (!report) return
    const newStatus = !report.is_public
    setReport({ ...report, is_public: newStatus })
    await updateReport(report.id, { is_public: newStatus })
  }

  const copyShareLink = () => {
    const url = `${window.location.origin}/share/view?id=${id}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 className="w-8 h-8 text-indigo animate-spin" />
      <p className="text-gray-500">Abrindo editor...</p>
    </div>
  )

  if (!report) return null

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md py-4 z-10 border-b border-gray-50 mb-8">
        <div className="flex items-center gap-4">
          <Link href="/reports">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setMode('edit')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'edit' ? 'bg-white shadow-sm text-indigo' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Edit3 className="w-3.5 h-3.5" /> Escrever
            </button>
            <button 
              onClick={() => setMode('preview')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'preview' ? 'bg-white shadow-sm text-indigo' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Eye className="w-3.5 h-3.5" /> Visualizar
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar
          </Button>
        </div>
      </header>

      <div className="space-y-8">
        <Input 
          className="text-4xl font-bold border-none bg-transparent px-0 focus-visible:ring-0 placeholder:text-gray-200 h-auto py-2"
          placeholder="Título do relatório..."
          value={report.title || ""}
          onChange={(e) => setReport({ ...report, title: e.target.value })}
        />

        <div className="flex items-center gap-4">
          <button 
            onClick={togglePublic}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${report.is_public ? 'bg-green/5 border-green/20 text-green' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
          >
            {report.is_public ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            {report.is_public ? 'Público' : 'Privado'}
          </button>

          {report.is_public && (
            <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
              <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-indigo" onClick={copyShareLink}>
                {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copied ? 'Copiado!' : 'Copiar Link'}
              </Button>
              <Link href={`/share/view?id=${id}`} target="_blank">
                <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-gray-500">
                  <ExternalLink className="w-3.5 h-3.5 mr-1" /> Ver Público
                </Button>
              </Link>
            </div>
          )}
        </div>

        {mode === 'edit' ? (
          <textarea 
            className="w-full min-h-[500px] bg-transparent border-none focus:ring-0 resize-none text-lg leading-relaxed placeholder:text-gray-200 outline-none"
            placeholder="Comece a escrever sua jornada... (Suporta Markdown)"
            value={report.content || ""}
            onChange={(e) => setReport({ ...report, content: e.target.value })}
          />
        ) : (
          <Card className="p-8 border-none shadow-sm bg-white min-h-[500px]">
            <article className="prose prose-indigo max-w-none">
              <ReactMarkdown>{report.content || "*Nenhum conteúdo para visualizar.*"}</ReactMarkdown>
            </article>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function ReportEditorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo" /></div>}>
      <EditorContent />
    </Suspense>
  )
}
