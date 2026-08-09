# ECU Option Generator - Web

Migracao web do gerador de codigos de autenticacao ECU (antigo app VB6 em
`../ECUOptGenerator.vbp`). Gera codigos no formato `XXXX-XXXX` a partir de
Modelo + Número de Série + Feature, usando o mesmo algoritmo (CRC16 +
checksum + KeeLoq de 528 rounds) do app original - ver `lib/keeloq.ts` e os
testes de regressao em `lib/keeloq.test.ts`, que comparam a saida com o
`Encrypter.exe` legado.

## Stack

- Next.js 16 (App Router, TypeScript)
- Prisma + PostgreSQL
- Autenticacao por sessao JWT em cookie httpOnly (implementacao propria, sem
  NextAuth)
- Envio de e-mail via SMTP (nodemailer)

## Requisitos

- Node.js **20.19+** ou 22.12+ (o Next 16 e o Prisma mais recente exigem essa
  versao; este projeto foi desenvolvido/testado com Prisma 5.x para rodar
  tambem em Node 20.10, mas o ideal e atualizar o Node)
- Um banco Postgres (local, Neon ou Supabase)

## Configuracao local

1. Copie `.env.example` para `.env` e preencha:
   - `DATABASE_URL`: string de conexao Postgres
   - `JWT_SECRET`: string aleatoria longa
   - `KEELOQ_KEY_HI` / `KEELOQ_KEY_LO`: chave mestra KeeLoq (segredo de
     licenciamento - solicitar ao responsavel, **nunca commitar o valor
     real**)
   - `SMTP_*`: credenciais do e-mail corporativo `@protune.com.br` usado para
     enviar os codigos de confirmacao de primeiro acesso

2. Instale as dependencias e gere o client do Prisma:

   ```bash
   npm install
   npx prisma generate
   ```

3. Crie as tabelas e rode o seed inicial (cria o admin `ismael@protune.com.br`
   com a senha `Suporte#123`, os 15 modelos e as 17 features originais):

   ```bash
   npx prisma migrate dev --name init
   npm run db:seed
   ```

4. Suba o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

## Testes

```bash
npm test
```

Os testes em `lib/keeloq.test.ts` validam a porta do algoritmo contra:
- O vetor de teste padrao do CRC-16/XMODEM (`"123456789"` -> `0x31C3`)
- Saidas reais geradas rodando o `Encrypter.exe` legado (`../Output/Encrypter.exe`)
- Um caso de ponta a ponta (modelo + serial + feature -> codigo `XXXX-XXXX`)

Qualquer alteracao em `lib/keeloq.ts` deve manter esses testes passando, ou
os codigos gerados deixam de ser compativeis com ECUs ja no campo.

## Deploy

1. Provisionar um Postgres gratuito (Neon ou Supabase) e configurar
   `DATABASE_URL` no ambiente de producao.
2. Deploy do projeto na Vercel (free tier), configurando as mesmas variaveis
   de ambiente do `.env.example`.
3. Rodar `npx prisma migrate deploy` e `npm run db:seed` contra o banco de
   producao.

## Estrutura

- `lib/keeloq.ts` - algoritmo de geracao de codigo (CRC16, checksum, KeeLoq)
- `lib/auth.ts` - sessao (JWT em cookie), hashing de senha/codigo, guards de
  autorizacao
- `lib/email.ts` - envio do codigo de verificacao por SMTP
- `lib/audit.ts` - gravacao de log de auditoria
- `proxy.ts` - protecao de rotas `/generate` e `/admin/*` (equivalente ao
  antigo `middleware.ts`, renomeado no Next.js 16)
- `app/(auth)/*` - login, cadastro, confirmacao de codigo, definicao de senha
- `app/(dashboard)/generate` - tela de geracao de codigo (equivalente ao
  `Main.frm` do app VB6)
- `app/(dashboard)/admin/*` - gestao de usuarios, modelos, features e
  auditoria (somente administradores)
- `prisma/seed.ts` - admin inicial + modelos/features originais
