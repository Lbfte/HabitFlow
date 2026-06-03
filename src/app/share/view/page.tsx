"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { getPublicReport } from "@/app/actions/reports"
import { getReportConnections } from "@/app/actions/report-links"
import ReactMarkdown from "react-markdown"
import { Flame, Calendar, User, Loader2, CheckCircle2, Link as LinkIcon, Lock } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { cn } from "@/lib/utils"

function ShareContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [report, setReport] = useState<any>(null)
  const [connections, setConnections] = useState<{ habits: any[], tasks: any[] }>({ habits: [], tasks: [] })
  const [loading, setLoading] = useState(true)
  const [isLocked, setIsLocked] = useState(false)
  const [pin, setPin] = useState("")
  const [error, setError] = useState(false)
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => {
    async function load() {
      if (id) {
        const data = await getPublicReport(id as string)
        if (data) {
          setReport(data)
          if (data.access_code && data.access_code.trim() !== "") {
            setIsLocked(true)
          } else {
            const conn = await getReportConnections(id as string)
            setConnections(conn)
            setUnlocked(true)
          }
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

  const handleUnlock = async () => {
    if (pin === report.access_code) {
      setIsLocked(false)
      setUnlocked(true)
      const conn = await getReportConnections(id as string)
      setConnections(conn)
    } else {
      setError(true)
      setPin("")
      setTimeout(() => setError(false), 2000)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 text-indigo animate-spin" />
    </div>
  )

  if (!report) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6 bg-background">
        <div className="bg-muted/10 p-6 rounded-3xl">
          <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">Relatório não encontrado</h1>
          <p className="text-muted font-medium mt-2">Este relatório pode não existir ou não estar marcado como público.</p>
        </div>
        <Link href="/">
          <Button size="lg">Voltar para o Início</Button>
        </Link>
      </div>
    )
  }

  if (isLocked && !unlocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-10 border-none shadow-2xl text-center space-y-8 animate-in zoom-in-95 duration-300 bg-surface ring-1 ring-border">
          <div className="w-24 h-24 bg-indigo/10 rounded-[2.5rem] flex items-center justify-center mx-auto text-indigo">
            <Lock className="w-12 h-12" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter">Protegido</h1>
            <p className="text-muted font-medium">Este relatório requer um código de acesso.</p>
          </div>
          <div className="space-y-6">
            <Input 
              type="password" 
              placeholder="CÓDIGO DE ACESSO" 
              className={cn(
                "text-center text-3xl font-black h-20 tracking-[0.5em] rounded-2xl", 
                error && "border-red-500 animate-shake"
              )}
              value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              autoFocus
            />
            {error && <p className="text-red-500 text-xs font-black uppercase tracking-widest">Código incorreto</p>}
            <Button className="w-full h-14 text-lg font-black uppercase tracking-widest rounded-2xl" onClick={handleUnlock}>
              Acessar Agora
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background selection:bg-indigo/20 selection:text-indigo pb-24 animate-in fade-in duration-1000">
      <header className="px-6 py-4 flex items-center justify-between border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 font-black text-xl text-indigo uppercase tracking-tighter">
          <div className="bg-indigo p-1.5 rounded-lg shadow-lg shadow-indigo/20">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <span>HabitFlow</span>
        </Link>
        <Link href="/register">
          <Button size="sm" className="rounded-full">Começar Grátis</Button>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <article className="space-y-16">
          <div className="space-y-8">
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-foreground leading-[1.1]">
              {report.title || "Relatório sem título"}
            </h1>
            
            <div className="flex flex-wrap items-center gap-8 text-xs font-black uppercase tracking-widest text-muted">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo/10 flex items-center justify-center text-indigo">
                  <User className="w-4 h-4" />
                </div>
                <span>Usuário HabitFlow</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-muted/10 flex items-center justify-center text-muted">
                  <Calendar className="w-4 h-4" />
                </div>
                <span>{format(new Date(report.created_at), "d 'de' MMMM, yyyy", { locale: ptBR })}</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-border w-full opacity-50" />

          <div 
            className="prose prose-lg prose-indigo dark:prose-invert max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:leading-relaxed prose-p:font-medium text-sm"
            style={{ fontFamily: 'var(--font-fira-code), monospace', color: 'color-mix(in srgb, var(--foreground) 95%, transparent)' }}
          >
            <ReactMarkdown>{report.content || "*Este relatório não possui conteúdo.*"}</ReactMarkdown>
          </div>

          {(connections.habits.length > 0 || connections.tasks.length > 0) && (
            <div className="mt-24 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="flex items-center gap-3 text-indigo">
                <LinkIcon className="w-6 h-6" />
                <h3 className="font-black text-xl uppercase tracking-widest">Dados Vinculados</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {connections.habits.map(habit => (
                  <Card key={habit.id} className="p-6 border-none shadow-xl bg-surface ring-1 ring-border">
                    <div className="flex items-center gap-4">
                      <div className="bg-orange/10 p-3 rounded-2xl text-orange">
                        <Flame className="w-6 h-6 fill-current" />
                      </div>
                      <div>
                        <p className="font-black text-foreground text-sm uppercase tracking-tight">{habit.name}</p>
                        <p className="text-[10px] text-muted uppercase font-black tracking-widest mt-1">
                          Sequência: {habit.streak_count} dias
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}

                {connections.tasks.map(task => (
                  <Card key={task.id} className="p-6 border-none shadow-xl bg-surface ring-1 ring-border">
                    <div className="flex items-center gap-4">
                      <div className="bg-green/10 p-3 rounded-2xl text-green">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-black text-foreground text-sm uppercase tracking-tight">{task.title}</p>
                        <p className="text-[10px] text-muted uppercase font-black tracking-widest mt-1">
                          {task.is_completed ? "Concluída" : "Pendente"}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>
    </div>
  )
}

export default function PublicReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-indigo" /></div>}>
      <ShareContent />
    </Suspense>
  )
}
