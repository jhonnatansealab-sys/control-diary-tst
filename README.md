# Controle de Diarias TST

MVP web para registro e acompanhamento das diarias dos Tecnicos de Seguranca
do Trabalho.

## Rodando localmente

```bash
npm install
npm run dev
```

## Verificacoes

```bash
npm run lint
npm run build
```

## Supabase

1. Crie um projeto no Supabase.
2. Execute `supabase/schema.sql` no SQL Editor.
3. Copie `.env.example` para `.env.local`.
4. Preencha a URL e a chave anonima do projeto.

Enquanto as variaveis do Supabase nao estiverem configuradas, o MVP funciona
em modo demonstracao usando `localStorage`.

## Acessos de demonstracao

- Administrador: `admin` / `Muniz@2026`
- Supervisor: `Coordenador` / `Martins@2026`
- Financeiro: `Financeiro` / `Sea@2026@`

O colaborador seleciona o proprio nome e registra uma selfie antes de acessar.
