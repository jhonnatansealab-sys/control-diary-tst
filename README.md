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
2. Aplique as migracoes de `supabase/migrations`.
3. Publique a funcao `supabase/functions/diary-api` sem verificacao JWT.
4. Copie `.env.example` para `.env.local`.
5. Preencha a URL e a chave publica do projeto.

Enquanto as variaveis do Supabase nao estiverem configuradas, o MVP funciona
em modo demonstracao usando `localStorage`.

Na configuracao de producao, as tabelas usam RLS sem acesso direto pelo
navegador. A Edge Function valida os logins e as sessoes antes de acessar os
registros, configuracoes e selfies.

## Acessos de demonstracao

- Administrador: `admin` / `Muniz@2026`
- Supervisor: `Coordenador` / `Martins@2026`
- Financeiro: `Financeiro` / `Sea@2026@`

O colaborador seleciona o proprio nome e registra uma selfie antes de acessar.
