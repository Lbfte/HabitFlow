import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Layout, Flame, CheckSquare, FileText, Calendar, ArrowRight } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-6 py-4 flex items-center justify-between border-b border-gray-50 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-xl text-indigo">
          <div className="bg-indigo p-1.5 rounded-lg">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <span>HabitFlow</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" size="sm">Entrar</Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Começar Agora</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-6 py-24 md:py-32 max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo/5 border border-indigo/10 text-indigo text-sm font-medium animate-bounce">
            <Flame className="w-4 h-4" />
            Vença a resistência cerebral
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground">
            Pequenos Hábitos,<br />
            <span className="text-indigo">Grandes Resultados.</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            Uma plataforma minimalista baseada na ciência para transformar sua rotina através de micro-metas diárias.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full gap-2">
                Começar gratuitamente <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full">
                Ver demonstração
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Grid */}
        <section className="bg-white py-24 border-y border-gray-50">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon={Flame} 
              title="Micro-Hábitos" 
              description="Metas ridiculamente pequenas para vencer a procrastinação."
            />
            <FeatureCard 
              icon={CheckSquare} 
              title="Gestão de Tarefas" 
              description="Organize seu dia com checklists simples e eficazes."
            />
            <FeatureCard 
              icon={FileText} 
              title="Relatórios" 
              description="Escreva e compartilhe seus progressos em Markdown."
            />
            <FeatureCard 
              icon={Calendar} 
              title="Calendário" 
              description="Visualize sua jornada e planeje seu tempo com precisão."
            />
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-gray-50 text-center text-gray-400 text-sm">
        <p>© 2026 HabitFlow. Feito para quem valoriza o progresso constante.</p>
      </footer>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <div className="p-6 rounded-2xl border border-gray-100 hover:border-indigo/20 hover:shadow-xl hover:shadow-indigo/5 transition-all group">
      <div className="bg-indigo/5 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo group-hover:text-white transition-colors">
        <Icon className="w-6 h-6 text-indigo group-hover:text-white" />
      </div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  )
}
