# 🚀 Guia de Deploy no Railway

## Passo 1: Criar Conta Railway
1. Acesse `https://railway.app`
2. Clique em **Sign Up** → **GitHub** (recomendado)
3. Autorize o Railway

## Passo 2: Criar Novo Projeto
1. Clique em **New Project**
2. Escolha **Deploy from GitHub**
3. Selecione este repositório (ou faça upload do ZIP)

## Passo 3: Adicionar Banco de Dados
1. Clique em **Add Service** → **Database**
2. Escolha **PostgreSQL** ou **MySQL**
3. Railway vai criar automaticamente

## Passo 4: Configurar Variáveis de Ambiente
Railway vai detectar automaticamente a `DATABASE_URL` do banco.

Adicione manualmente:
```
JWT_SECRET=sua-chave-secreta-aqui
NODE_ENV=production
PORT=3000
VITE_APP_TITLE=Zeglam - Sistema de Cronograma
```

## Passo 5: Deploy
1. Railway detecta `package.json` automaticamente
2. Executa `pnpm install` e `pnpm build`
3. Inicia com `pnpm start`

## Passo 6: Acessar
- Railway gera um domínio automático: `https://seu-projeto.railway.app`
- Você pode vincular domínio personalizado depois

---

## 📊 Variáveis Importantes

| Variável | Valor | Obrigatório |
|----------|-------|------------|
| `DATABASE_URL` | Auto-gerada pelo Railway | ✅ Sim |
| `JWT_SECRET` | String aleatória segura | ✅ Sim |
| `NODE_ENV` | `production` | ✅ Sim |
| `PORT` | `3000` | ✅ Sim |
| `VITE_APP_TITLE` | Zeglam - Sistema de Cronograma | ❌ Não |

---

## 🔧 Troubleshooting

### Erro: "Database connection failed"
- Verifique se o banco foi criado
- Copie a `DATABASE_URL` corretamente
- Aguarde 2-3 minutos para o banco estar pronto

### Erro: "Build failed"
- Verifique se `pnpm` está instalado
- Veja os logs: **Deployments** → **Build Logs**

### Erro: "Port already in use"
- Railway usa porta dinâmica automaticamente
- Não defina porta fixa no código

---

## 📱 Acessos Padrão

| Tipo | Usuário | Senha |
|------|---------|-------|
| Admin | `admin` | `admin123` |
| Fornecedor SP | `fornecedor_sp` | `fornecedor123` |
| Fornecedor Limeira | `fornecedor_limeira` | `fornecedor123` |

---

## 💰 Custo
- **Primeiros $5/mês**: Grátis
- **Depois**: ~$7-15/mês (app + banco)

---

## 🎯 Próximos Passos
1. Teste a aplicação
2. Vincule domínio personalizado (Settings → Domains)
3. Configure backups automáticos (Settings → Database)

**Pronto! Seu sistema está no ar! 🎉**
