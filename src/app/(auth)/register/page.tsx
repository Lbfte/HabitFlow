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

    const pathParts = window.location.pathname.split('/')
    const basePath = window.location.hostname.includes('github.io') && pathParts[1] ? `/${pathParts[1]}` : ''
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${basePath}/login`,
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
      <div className="flex min-h-screen items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md border border-border shadow-xl shadow-indigo/5 bg-surface text-center">
          <CardHeader>
            <div className="flex justify-center mb-3">
              <div className="bg-green/10 p-4 rounded-3xl">
                <Logo className="w-10 h-10 text-green" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-green">Conta criada!</CardTitle>
            <CardDescription className="pt-2 text-muted">
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
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-8">
        {/* Logo centralizada acima do card */}
        <div className="flex flex-col items-center gap-3">
          <div className="bg-indigo/10 p-4 rounded-3xl shadow-sm">
            <Logo className="w-10 h-10 text-indigo" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Synca</h1>
          </div>
        </div>

        <Card className="w-full border border-border shadow-xl shadow-indigo/5 bg-surface backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center pb-2">
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">Crie sua conta</CardTitle>
            <CardDescription className="text-muted">
              Comece a transformar pequenos hábitos em grandes resultados
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80 leading-none" htmlFor="email">
                  E-mail
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-background/50 border-border focus:border-indigo"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80 leading-none" htmlFor="password">
                  Senha
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-background/50 border-border focus:border-indigo"
                />
              </div>
              {error && (
                <div className="text-sm text-red-500 font-medium bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20">
                  {error}
                </div>
              )}
              <Button className="w-full h-11 text-sm font-bold" type="submit" disabled={loading}>
                {loading ? "Criando..." : "Criar Conta"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-2">
            <div className="text-sm text-center text-muted">
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
