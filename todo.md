# Zeglam - Sistema de Cronograma - TODO

## Banco de Dados
- [x] Schema completo com todas as tabelas (links, admin_users, suppliers, shipments, etc.)
- [x] Executar migrations SQL no banco
- [x] Seed inicial com admin padrão e dados de exemplo

## Backend
- [x] server/db.ts com todos os helpers de query
- [x] server/routers.ts com tRPC + REST endpoints
- [x] server/_core/index.ts com todas as rotas REST
- [x] server/shipmentRouter.ts para fretes
- [x] server/jobs/auto-close-links.ts
- [x] server/jobs/archiveShipments.ts
- [x] server/jobs/prazo-alert.ts
- [x] server/storage.ts para S3

## Frontend - Páginas
- [x] PublicView (/) - Cronograma público
- [x] AdminView (/admin) - Painel admin
- [x] SupplierLogin (/loginfornecedores) - Login fornecedores
- [x] SupplierDashboard (/painelfornecedor) - Painel fornecedor
- [x] ShipmentSubmit (/envioscomprovantes) - Envio comprovantes
- [x] ShipmentsAdmin (/gerenciamentofreteadmin) - Admin fretes
- [x] AdminUsers (/admin/users) - Gestão usuários
- [x] ImportLinksAI (/admin/importar-links) - Importar links

## Frontend - Componentes
- [x] ThemeContext
- [x] ErrorBoundary
- [x] Todos os componentes UI (shadcn)

## Estilos
- [x] index.css com tema dark/gold Zeglam
- [x] Fontes e variáveis CSS

## Testes
- [x] Vitest para auth admin (1 test passing)

## Deploy
- [x] Checkpoint final
- [ ] Publicar (aguardando usuário clicar Publish)

## Correções
- [x] Auto-close corrigido: APENAS "Link Aberto" fecha automaticamente. "Liberado pra Envio" NUNCA fecha, independente da data (clientes em processo de envio ativo)
- [x] Ordenação na página pública: "Link Aberto" no topo, demais status no meio, "Liberado pra Envio" por último
