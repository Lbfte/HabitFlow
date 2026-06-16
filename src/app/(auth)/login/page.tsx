"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card"
import { Logo } from "@/components/Logo"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-white to-indigo/5">
      <div className="w-full max-w-md space-y-8">
        {/* Logo centralizada acima do card */}
        <div className="flex flex-col items-center gap-3">
          <div className="bg-indigo/10 p-4 rounded-3xl shadow-sm">
            <Logo className="w-10 h-10 text-indigo" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight text-slate-800">Synca</h1>
            <p className="text-sm text-slate-500 mt-0.5">Seus hábitos, sua evolução.</p>
          </div>
        </div>

        <Card className="w-full border border-slate-100 shadow-xl shadow-slate-200/60 bg-white/90 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center pb-2">
            <CardTitle className="text-xl font-bold tracking-tight text-slate-800">Bem-vindo de volta</CardTitle>
            <CardDescription className="text-slate-500">
              Entre na sua conta para gerenciar seus fluxos
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 leading-none" htmlFor="email">
                  E-mail
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-slate-200 focus:border-indigo/50 bg-slate-50/50"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700 leading-none" htmlFor="password">
                    Senha
                  </label>
                  <Link href="/forgot-password" className="text-xs text-indigo hover:underline font-medium">
                    Esqueci minha senha
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-slate-200 focus:border-indigo/50 bg-slate-50/50"
                />
              </div>
              {error && (
                <div className="text-sm text-red-500 font-medium bg-red-50 px-3 py-2 rounded-xl border border-red-100">
                  {error}
                </div>
              )}
              <Button className="w-full h-11 text-sm font-bold" type="submit" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-2">
            <div className="text-sm text-center text-slate-500">
              Não tem uma conta?{" "}
              <Link href="/register" className="text-indigo font-semibold hover:underline">
                Cadastre-se grátis
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
