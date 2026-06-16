# 📂 ESTRUTURA DO PROJETO: Synca

> [!IMPORTANT]
> **REGRA DE OURO (AI & DEVELOPER PROTOCOL):**
> Este arquivo **DEVE** ser atualizado sempre que um novo arquivo for adicionado, removido ou quando houver uma alteração significativa em alguma funcionalidade de um arquivo existente. Sempre inicie ou termine a tarefa garantindo a integridade desta documentação.

---

## 🗺️ Mapa de Diretórios Geral

```text
Synca/
├── .github/workflows/          # Automações do GitHub (Deploy no GH Pages)
├── public/                     # Arquivos estáticos acessíveis diretamente
│   └── 404.html                # Tratamento de SPA para o GitHub Pages
├── src/                        # Código-fonte principal do app
│   ├── app/                    # Roteador App Router (Next.js 16+)
│   │   ├── (auth)/             # Rotas de Autenticação (Grupo Sem Prefixo)
│   │   ├── (dashboard)/        # Área logada / Dashboard (Grupo Sem Prefixo)
│   │   ├── actions/            # Server Actions / Chamadas de persistência (Supabase)
│   │   ├── auth/               # Callback de autenticação (atualmente vazio)
│   │   ├── share/              # Visualização de relatórios públicos compartilháveis
│   │   ├── globals.css         # Configurações globais do TailwindCSS v4
│   │   ├── layout.tsx          # Layout raiz do Next.js
│   │   └── page.tsx            # Landing Page do Synca
│   ├── components/             # Componentes reutilizáveis globais da aplicação
│   │   └── ui/                 # Componentes genéricos de UI/Design System
│   ├── hooks/                  # Hooks customizados do React (atualmente vazio)
│   ├── lib/                    # Configurações e utilitários de bibliotecas terceiras
│   ├── types/                  # Definições de Tipos (TypeScript)
│   └── utils/                  # Funções utilitárias (Supabase Client, etc.)
├── next.config.ts              # Configurações especiais do Next.js (Export estático)
├── tailwind.config.ts          # Integrado nativamente no globals.css via Tailwind CSS v4
├── tsconfig.json               # Configurações do TypeScript
└── package.json                # Dependências e scripts do projeto
```

---

## 🛠️ Arquivos de Configuração da Raiz

### 1. `next.config.ts`
* **Função:** Configuração de build e runtime do Next.js.
* **Detalhes:** 
  * Define `output: 'export'` para compilar o app em HTML/JS estático.
  * Define `basePath` e `assetPrefix` dinamicamente: se `process.env.NODE_ENV === 'production'`, usa `/Synca` (para rodar no GitHub Pages), caso contrário fica vazio (desenvolvimento local).
  * Desativa otimização nativa de imagens do Next.js (`images: { unoptimized: true }`) porque o GitHub Pages é uma hospedagem estática e não suporta otimização sob demanda.
  * Configura `trailingSlash: true` para garantir que rotas exportadas terminem com `/` e funcionem como diretórios estáticos.

### 2. `package.json`
* **Função:** Gerenciador de dependências e scripts.
* **Framework:** Next.js `16.2.5` | React `19.2.4`.
* **Bibliotecas Principais:**
  * `@supabase/ssr` (`^0.10.2`) e `@supabase/supabase-js` (`^2.105.3`) - Integração oficial com Supabase.
  * `@excalidraw/excalidraw` (`^0.18.1`) - Biblioteca base para quadros visuais infinitos.
  * `date-fns` (`^4.1.0`) - Manipulação e formatação de datas.
  * `canvas-confetti` (`^1.9.4`) - Efeito visual de confete ao completar tarefas/hábitos.
  * `lucide-react` (`^1.14.0`) - Biblioteca de ícones.
  * `tailwindcss` (`^4`) - Motor CSS utilitário de última geração.

### 3. `.env.local`
* **Função:** Configura chaves de API e URLs privadas locais.
* **Variáveis importantes:**
  * `NEXT_PUBLIC_SUPABASE_URL`: Endpoint da API do Supabase.
  * `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon Key legada no formato JWT (importante: não deve ser a nova publishable key, pois o `@supabase/ssr` exige a JWT anon).

---

## 📂 Pasta `public/`

### 1. `404.html`
* **Função:** Mecanismo de fallback de SPA para o GitHub Pages.
* **Detalhes:** Captura a URL não encontrada solicitada no servidor estático do GitHub Pages, transforma-a em um parâmetro de query string (`?p=/rota`) e redireciona de volta para a rota raiz (`index.html`) sem que o usuário veja erros, permitindo roteamento dinâmico pelo lado do cliente.

---

## 📂 Pasta `src/utils/`

### 1. `src/utils/supabase/client.ts`
* **Função:** Inicializador do cliente Supabase para o navegador.
* **Detalhes:** Usa `createBrowserClient` do `@supabase/ssr` injetando a URL do projeto e a chave anônima JWT para disponibilizar a autenticação e chamadas REST em componentes `"use client"`.

---

## 📂 Pasta `src/types/`

### 1. `src/types/database.ts`
* **Função:** Tipagem estática base das tabelas do Supabase.
* **Tipos definidos:**
  * `Habit`: Modelagem para hábitos.
  * `DailyTask`: Modelagem de tarefas focadas.
  * `Report`: Dados de relatórios em formato Markdown.
  * `CalendarEvent`: Modelo de evento/compromisso da agenda.
  * `Note`: Modelo para o mural de notas colantes (Sticky Notes / Post-Its).

---

## 📂 Pasta `src/lib/`

### 1. `src/lib/utils.ts`
* **Função:** Utilitário estético padrão para classes CSS.
* **Detalhes:** Exporta a função `cn(...inputs)` que combina de forma inteligente condicionais de CSS usando `clsx` e resolve conflitos de especificidade com `tailwind-merge`.

---

## 📂 Pasta `src/app/actions/` (Server/Client Actions)

Embora declaradas em diretório de "ações", no fluxo atual elas rodam no cliente instanciando o Supabase Client.

### 1. `habits.ts`
* **Função:** Gerenciamento lógico de micro-hábitos.
* **Funcionalidades:**
  * `completeHabit(habitId)`: Valida e incrementa o *streak* diário. Reseta o streak se a diferença em dias for maior que a frequência configurada. Salva o timestamp final da última conclusão.
  * `createHabit(...)` e `updateHabit(...)`: Inserção e edição flexível.

### 2. `events.ts`
* **Função:** CRUD de compromissos e agenda.
* **Funcionalidades:** `createEvent`, `updateEvent`, `deleteEvent` e `getEvents` (com filtros temporais usando `gte` e `lte`).

### 3. `reports.ts`
* **Função:** Escrita e compartilhamento de anotações e diários em Markdown.
* **Funcionalidades:** Criação, atualização de conteúdo, exclusão e busca de relatórios tanto de forma privada quanto pública (`getPublicReport`).

### 4. `report-links.ts`
* **Função:** Associações complexas entre itens no banco.
* **Funcionalidades:**
  * Vincula ou desvincula hábitos e tarefas a um relatório específico para construir relatórios contextuais.
  * `shareReportWithEmail(reportId, email)`: Cria registros na tabela `report_shares`.

---

## 📂 Pasta `src/components/`

### 📦 Componentes de UI (`src/components/ui/`)
* **`Button.tsx`**: Componente de botão customizado com variantes de cores (`primary`, `secondary`, `ghost`, `danger`) e tamanhos (`sm`, `md`, `lg`).
* **`Card.tsx`**: Subcomponentes para montagem de cards de conteúdo estruturado (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`).
* **`Input.tsx`**: Campo de entrada de texto padronizado.

### 🧩 Componentes Funcionais
* **`ThemeProvider.tsx`**: Fornece contexto de tema Claro/Escuro (Light/Dark). Salva a escolha do usuário no `localStorage`. Força o tema Light por padrão na inicialização caso nenhum tema esteja armazenado.
* **`Sidebar.tsx`**: Barra de navegação lateral para desktop e barra inferior compacta para dispositivos mobile. Oferece troca rápida de temas e botão de logout. Inclui uma gaveta flexível ("Mais") para dispositivos móveis contendo links adicionais de relatórios e calendário.
* **`StickyNotes.tsx`**: Mural visual interativo de notas colantes (Post-Its) renderizado no Dashboard. Permite criar notas, digitar texto com autosave dinâmico, arrastar/excluir e alternar paletas de cores individuais.
* **`CreateHabitModal.tsx`**: Modal de formulário para criação e edição de micro-hábitos, com seleção de frequência.
* **`CreateWhiteboardModal.tsx`**: Modal de vinculação para quadros visuais. Permite associar o quadro a um micro-hábito específico ou a uma tarefa diária.
* **`CreateEventModal.tsx`**: Modal completo para agendamento de eventos, com configuração de horários e adição de categorias customizadas e suas respectivas cores em tempo de execução.
* **`Whiteboard.tsx`**: Integração do Excalidraw. Compacta dinamicamente imagens coladas para o formato **WebP (70% de qualidade)** e faz o upload em lote para o bucket de Storage do Supabase, salvando apenas a URL final pública na nuvem e reduzindo o consumo de espaço no banco. Possui fallback automático para Modo Offline Local em IndexedDB caso a API falhe.

---

## 📂 Pasta `src/app/` (Rotas e Páginas)

### 🌍 Rota Raiz & Páginas Globais
* **`layout.tsx`**: Carrega as fontes "Geist Sans" e "Geist Mono", injeta o `ThemeProvider` no HTML e define os metadados globais da plataforma.
* **`page.tsx`**: A Landing Page institucional do Synca, com design premium, grid de funcionalidades e botões de chamada para ação (CTA).
* **`globals.css`**: Contém a injeção do Tailwind CSS v4, variáveis HSL do design system (paletas indigo, green, orange, background, surfaces de modo claro e escuro) e estilização de barra de rolagem.

### 🔐 Grupo de Rotas `(auth)` (Sem prefixo na URL)
* **`login/page.tsx`**: Formulário de login de usuários.
* **`register/page.tsx`**: Criação de novas contas. Envia confirmação de cadastro via email redirecionando de volta ao app usando um helper de detecção de domínio para não quebrar no GitHub Pages (`/Synca`).
* **`forgot-password/page.tsx`**: Formulário para iniciar fluxo de redefinição de senha, disparando o e-mail de recuperação do Supabase.
* **`reset-password/page.tsx`**: Formulário de entrada da nova senha do usuário após validar o token recebido no email de recuperação.

### 📊 Grupo de Rotas `(dashboard)` (Sem prefixo na URL - Exige Autenticação)
* **`layout.tsx`**: Layout base da área restrita. Verifica se o usuário possui sessão ativa via Supabase. Se não houver sessão, redireciona ao `/login`. Se autenticado, injeta a `Sidebar` e a área principal do painel.
* **`dashboard/page.tsx`**: Visão diária principal do app. Lista micro-hábitos e o "Foco do Dia" (checklists). Oferece recurso de privacidade rápida (ocultar/desfocar hábitos) persistindo o estado no `localStorage`.
* **`habits/page.tsx`**: Gerenciador de micro-hábitos. Permite visualização geral dos hábitos cadastrados, acompanhamento de dias acumulados e exclusão.
* **`tasks/page.tsx`**: Painel focado de afazeres diários com recursos de criação rápida, alteração em lote, edição em linha e visualização de metas de produtividade.
* **`whiteboards/page.tsx`**: Página inicial que lista todos os painéis visuais do usuário, evidenciando as conexões de hábitos e tarefas pendentes em cada quadro.
* **`whiteboards/board/page.tsx`**: Abre o quadro visual focado em tela cheia para anotações e colagem de imagens/estudos.
* **`reports/page.tsx`**: Área de visualização de relatórios Markdown gerados.
* **`reports/edit/page.tsx`**: Interface avançada de escrita em Markdown com pré-visualização em tempo real (Split View), controle de visibilidade pública/privada, códigos de acesso para proteção de leitura e ferramentas de linkagem rápida a tarefas e hábitos concluídos.

### 🔗 Rota Pública `share/`
* **`share/view/page.tsx`**: Rota pública livre de autenticação para exibir relatórios compartilhados. Se configurado um código de acesso (PIN), exibe uma barreira visual de senha (Input bloqueado) antes de renderizar as informações e estatísticas do relatório.

---

## 💾 Modelagem de Dados & Tabelas do Banco (Supabase)

Para o bom funcionamento do Synca, estas são as tabelas essenciais configuradas no Supabase:

1. **`habits`**: Armazena hábitos do usuário (`id`, `user_id`, `name`, `goal_description`, `streak_count`, `last_completed_at`, `frequency_interval`).
2. **`daily_tasks`**: Armazena checklists diários (`id`, `user_id`, `title`, `is_completed`, `due_date`, `priority`).
3. **`events`**: Eventos da agenda (`id`, `user_id`, `title`, `start_time`, `end_time`, `category`).
4. **`notes`**: Post-its / notas colantes (`id`, `user_id`, `content`, `color`).
5. **`reports`**: Textos em Markdown (`id`, `user_id`, `title`, `content`, `is_public`, `access_code`).
6. **`report_habits` & `report_tasks`**: Tabelas de junção de relacionamentos muitos-para-muitos.
7. **`habit_boards`**: Dados de layout JSON do Excalidraw (`id`, `user_id`, `name`, `content`, `habit_id`, `task_id`).

---

## 🔒 Bucket de Armazenamento (Supabase Storage)

* **Bucket `whiteboards`**: Deve estar configurado como **público** para permitir a geração de URLs válidas de imagens inseridas no Excalidraw. As imagens de cada usuário são isoladas sob o caminho `users/{user_id}/whiteboards/{board_id}/*`.
