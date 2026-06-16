"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card"
import { Logo } from "@/components/Logo"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Include the basePath (/Synca) for GitHub Pages deployment
        emailRedirectTo: `${window.location.origin}${window.location.hostname.includes('github.io') ? '/Synca' : ''}/login`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-white to-indigo/5">
        <Card className="w-full max-w-md border border-slate-100 shadow-xl shadow-slate-200/60 bg-white/90 text-center">
          <CardHeader>
            <div className="flex justify-center mb-3">
              <div className="bg-green/10 p-4 rounded-3xl">
                <Logo className="w-10 h-10 text-green" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-green">Conta criada!</CardTitle>
            <CardDescription className="pt-2 text-slate-500">
              Verifique seu e-mail para confirmar o cadastro e começar sua jornada no Synca.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Link href="/login">
              <Button variant="primary">Ir para Login</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
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
          </div>
        </div>

        <Card className="w-full border border-slate-100 shadow-xl shadow-slate-200/60 bg-white/90 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center pb-2">
            <CardTitle className="text-xl font-bold tracking-tight text-slate-800">Crie sua conta</CardTitle>
            <CardDescription className="text-slate-500">
              Comece a transformar pequenos hábitos em grandes resultados
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleRegister} className="space-y-4">
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
                <label className="text-sm font-semibold text-slate-700 leading-none" htmlFor="password">
                  Senha
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
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
                {loading ? "Criando..." : "Criar Conta"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-2">
            <div className="text-sm text-center text-slate-500">
              Já tem uma conta?{" "}
              <Link href="/login" className="text-indigo font-semibold hover:underline">
                Entrar
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
