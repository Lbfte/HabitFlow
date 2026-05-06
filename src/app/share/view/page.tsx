"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { getPublicReport } from "@/app/actions/reports"
import ReactMarkdown from "react-markdown"
import { Flame, Calendar, User, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"
import { Button } from "@/components/ui/Button"

function ShareContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (id) {
        const data = await getPublicReport(id as string)
        setReport(data)
      }
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 text-indigo animate-spin" />
    </div>
  )

  if (!report) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Relatório não encontrado</h1>
        <p className="text-gray-500">Este relatório pode não existir ou não estar marcado como público.</p>
        <Link href="/">
          <Button>Voltar para o Início</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] selection:bg-indigo/10 selection:text-indigo">
      <header className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-indigo">
          <div className="bg-indigo p-1.5 rounded-lg">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <span>HabitFlow</span>
        </Link>
        <Link href="/register">
          <Button size="sm">Criar meu HabitFlow</Button>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <article className="space-y-12">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
              {report.title || "Relatório sem título"}
            </h1>
            
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 font-medium">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo/10 flex items-center justify-center text-indigo">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span>Usuário HabitFlow</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>{format(new Date(report.created_at), "d 'de' MMMM, yyyy", { locale: ptBR })}</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100 w-full" />

          <div className="prose prose-lg prose-indigo max-w-none prose-headings:font-bold prose-p:leading-relaxed prose-p:text-gray-700">
            <ReactMarkdown>{report.content || "*Este relatório não possui conteúdo.*"}</ReactMarkdown>
          </div>
        </article>

        <footer className="mt-24 pt-12 border-t border-gray-100 text-center">
          <div className="bg-indigo/5 rounded-3xl p-8 md:p-12 space-y-6">
            <h3 className="text-2xl font-bold text-indigo">Inspirado por este progresso?</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              O HabitFlow ajuda você a construir micro-hábitos e documentar sua jornada rumo ao sucesso.
            </p>
            <Link href="/register">
              <Button size="lg" className="px-8 shadow-lg shadow-indigo/20">
                Começar Minha Jornada Agora
              </Button>
            </Link>
          </div>
        </footer>
      </main>
    </div>
  )
}

export default function PublicReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo" /></div>}>
      <ShareContent />
    </Suspense>
  )
}
