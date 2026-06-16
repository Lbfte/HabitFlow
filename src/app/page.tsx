import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { CheckSquare, FileText, Calendar, ArrowRight, Flame } from "lucide-react"
import { Logo } from "@/components/Logo"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm shadow-slate-100/80">
        <div className="flex items-center gap-2.5 font-black text-xl text-indigo">
          <div className="bg-indigo/10 p-1.5 rounded-xl">
            <Logo className="w-5 h-5 text-indigo" />
          </div>
          <span className="tracking-tight">Synca</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-indigo font-semibold">Entrar</Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="font-bold px-5">Começar Agora</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-6 py-24 md:py-36 max-w-5xl mx-auto text-center space-y-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo/8 border border-indigo/15 text-indigo text-sm font-semibold">
            <Flame className="w-4 h-4" />
            Vença a resistência cerebral
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 leading-[1.05]">
              Pequenos Hábitos,
              <br />
              <span className="text-indigo">Grandes Resultados.</span>
            </h1>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Uma plataforma minimalista baseada na ciência para transformar sua rotina através de micro-metas diárias.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full gap-2 h-12 px-8 font-bold text-base shadow-lg shadow-indigo/25 hover:shadow-indigo/35 transition-shadow">
                Começar gratuitamente <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full h-12 px-8 font-semibold border-slate-200 text-slate-600 hover:border-indigo/30 hover:text-indigo transition-colors">
                Já tenho uma conta
              </Button>
            </Link>
          </div>

          {/* Social proof hint */}
          <p className="text-xs text-slate-400 font-medium">Sem cartão de crédito. Grátis para sempre.</p>
        </section>

        {/* Features Grid */}
        <section className="bg-slate-50/70 py-24 border-y border-slate-100">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14 space-y-3">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
                Tudo que você precisa, nada do que não precisa
              </h2>
              <p className="text-slate-500 max-w-xl mx-auto">Ferramentas simples e poderosas para construir a melhor versão de você.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FeatureCard
                icon={Flame}
                title="Micro-Hábitos"
                description="Metas ridiculamente pequenas para vencer a procrastinação e criar momentum real."
              />
              <FeatureCard
                icon={CheckSquare}
                title="Gestão de Tarefas"
                description="Organize seu dia com checklists simples e eficazes que realmente saem do papel."
              />
              <FeatureCard
                icon={FileText}
                title="Relatórios"
                description="Escreva e compartilhe seus progressos em Markdown com quem importa."
              />
              <FeatureCard
                icon={Calendar}
                title="Calendário"
                description="Visualize sua jornada e planeje seu tempo com precisão cirúrgica."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="py-10 border-t border-slate-100 text-center text-slate-400 text-sm bg-white">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Logo className="w-4 h-4 text-indigo/60" />
          <span className="font-semibold text-slate-500">Synca</span>
        </div>
        <p>© 2026 Synca. Feito para quem valoriza o progresso constante.</p>
      </footer>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo/20 transition-all group">
      <div className="bg-indigo/8 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo group-hover:text-white transition-colors">
        <Icon className="w-6 h-6 text-indigo group-hover:text-white" />
      </div>
      <h3 className="font-bold text-lg mb-2 text-slate-800">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
    </div>
  )
}
