"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Report } from "@/types/database"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { FileText, Plus, Globe, Lock, Loader2 } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { createReport } from "@/app/actions/reports"
import { useRouter } from "next/navigation"

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setReports(data)
    setLoading(false)
  }

  const handleCreateReport = async () => {
    setCreating(true)
    const result = await createReport("Novo Relatório")
    if (result.success && result.report) {
      router.push(`/reports/edit?id=${result.report.id}`)
    } else {
      setCreating(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 className="w-8 h-8 text-indigo animate-spin" />
      <p className="text-gray-500 animate-pulse">Carregando seus relatórios...</p>
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-gray-500">Documente sua jornada e compartilhe insights.</p>
        </div>
        <Button onClick={handleCreateReport} disabled={creating}>
          {creating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          Novo Relatório
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <div key={report.id} className="h-full">
            <Card className="hover:ring-2 hover:ring-indigo/20 transition-all group h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="bg-indigo/5 p-2 rounded-lg group-hover:bg-indigo group-hover:text-white transition-colors">
                    <FileText className="w-5 h-5 text-indigo group-hover:text-white" />
                  </div>
                  {report.is_public ? (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-green uppercase tracking-wider bg-green/5 px-2 py-1 rounded-full">
                      <Globe className="w-3 h-3" /> Público
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-2 py-1 rounded-full">
                      <Lock className="w-3 h-3" /> Privado
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <CardTitle className="group-hover:text-indigo transition-colors line-clamp-1">
                    {report.title || "Sem título"}
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  {format(new Date(report.created_at), "d 'de' MMMM, yyyy", { locale: ptBR })}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed flex-1">
                  {report.content || "Nenhum conteúdo ainda..."}
                </p>
                <div className="mt-6 flex gap-2">
                  <Link href={`/reports/edit?id=${report.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">Editar</Button>
                  </Link>
                  {report.is_public && (
                    <Link href={`/share/view?id=${report.id}`} target="_blank">
                      <Button variant="ghost" size="sm">
                        <Globe className="w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}

        {reports.length === 0 && (
          <div className="col-span-full text-center py-24 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
            <div className="bg-white w-20 h-20 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-gray-200" />
            </div>
            <h3 className="font-bold text-xl text-gray-900">Comece a escrever</h3>
            <p className="text-gray-500 mt-2 max-w-sm mx-auto">
              Relatórios são ótimos para refletir sobre seu progresso e manter um histórico da sua evolução.
            </p>
            <Button className="mt-8" onClick={handleCreateReport}>
              Criar Meu Primeiro Relatório
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
