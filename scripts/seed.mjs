import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

console.log("🌱 Seeding database...");

// 1. Admin padrão
const adminPasswordHash = bcrypt.hashSync("admin123", 10);
try {
  await connection.execute(
    "INSERT IGNORE INTO admin_users (name, username, passwordHash) VALUES (?, ?, ?)",
    ["Administrador", "admin", adminPasswordHash]
  );
  console.log("✅ Admin criado: admin / admin123");
} catch (e) {
  console.log("ℹ️  Admin já existe");
}

// 2. Fornecedores padrão
const supplierPasswordHash = bcrypt.hashSync("fornecedor123", 10);
try {
  await connection.execute(
    "INSERT IGNORE INTO suppliers (name, username, passwordHash, panel) VALUES (?, ?, ?, ?)",
    ["Fornecedor SP", "fornecedor_sp", supplierPasswordHash, "sp"]
  );
  console.log("✅ Fornecedor SP criado: fornecedor_sp / fornecedor123");
} catch (e) {
  console.log("ℹ️  Fornecedor SP já existe");
}

try {
  await connection.execute(
    "INSERT IGNORE INTO suppliers (name, username, passwordHash, panel) VALUES (?, ?, ?, ?)",
    ["Fornecedor Limeira", "fornecedor_limeira", supplierPasswordHash, "limeira"]
  );
  console.log("✅ Fornecedor Limeira criado: fornecedor_limeira / fornecedor123");
} catch (e) {
  console.log("ℹ️  Fornecedor Limeira já existe");
}

// 3. Status padrão (12 status reais do usuário com cores)
const defaultStatuses = [
  { name: "Finalizado", color: "#22c55e", bgColor: "rgba(34,197,94,0.15)", sortOrder: 1 },
  { name: "Em Separação", color: "#3b82f6", bgColor: "rgba(59,130,246,0.15)", sortOrder: 2 },
  { name: "Em trânsito", color: "#f59e0b", bgColor: "rgba(245,158,11,0.15)", sortOrder: 3 },
  { name: "Link Aberto", color: "#10b981", bgColor: "rgba(16,185,129,0.15)", sortOrder: 4 },
  { name: "Verificando Estoque", color: "#ec4899", bgColor: "rgba(236,72,153,0.15)", sortOrder: 5 },
  { name: "Cancelado", color: "#ef4444", bgColor: "rgba(239,68,68,0.15)", sortOrder: 6 },
  { name: "Fornecedor separando o pedido", color: "#f97316", bgColor: "rgba(249,115,22,0.15)", sortOrder: 7 },
  { name: "Em Breve", color: "#e5e7eb", bgColor: "rgba(229,231,235,0.15)", sortOrder: 8 },
  { name: "Fechado", color: "#6b7280", bgColor: "rgba(107,114,128,0.15)", sortOrder: 9 },
  { name: "Aguardando Pagamentos", color: "#eab308", bgColor: "rgba(234,179,8,0.15)", sortOrder: 10 },
  { name: "Liberado pra Envio", color: "#06b6d4", bgColor: "rgba(6,182,212,0.15)", sortOrder: 11 },
  { name: "Produção/Fabricação", color: "#a855f7", bgColor: "rgba(168,85,247,0.15)", sortOrder: 12 },
];

for (const status of defaultStatuses) {
  try {
    await connection.execute(
      "INSERT IGNORE INTO link_statuses (name, color, bgColor, sortOrder) VALUES (?, ?, ?, ?)",
      [status.name, status.color, status.bgColor, status.sortOrder]
    );
  } catch (e) {}
}
console.log("✅ 12 Status padrão criados");

// 4. Departamentos padrão (5 departamentos reais do usuário)
const defaultDepts = [
  { name: "Separação", sortOrder: 1 },
  { name: "Fornecedor", sortOrder: 2 },
  { name: "Grupo Zeglam", sortOrder: 3 },
  { name: "Setor de Envios", sortOrder: 4 },
  { name: "Financeiro", sortOrder: 5 },
];

for (const dept of defaultDepts) {
  try {
    await connection.execute(
      "INSERT IGNORE INTO link_departments (name, sortOrder) VALUES (?, ?)",
      [dept.name, dept.sortOrder]
    );
  } catch (e) {}
}
console.log("✅ 5 Departamentos padrão criados");

// 5. Column settings padrão
try {
  await connection.execute(
    "INSERT IGNORE INTO column_settings (id, encerramentoLink, conferenciaEstoque, romaneiosClientes, postadoFornecedor, dataInicioSeparacao, liberadoEnvio) VALUES (1, 1, 1, 1, 1, 1, 1)"
  );
  console.log("✅ Configurações de colunas criadas");
} catch (e) {
  console.log("ℹ️  Configurações de colunas já existem");
}

// 6. Links de exemplo
const exampleLinks = [
  { numero: 1, nome: "Link Exemplo 01 - Grupo Zeglam", status: "Link Aberto", departamento: "Grupo Zeglam" },
  { numero: 2, nome: "Link Exemplo 02 - Separação", status: "Em Separação", departamento: "Separação" },
  { numero: 3, nome: "Link Exemplo 03 - Setor de Envios", status: "Liberado pra Envio", departamento: "Setor de Envios" },
];

for (const link of exampleLinks) {
  try {
    await connection.execute(
      "INSERT IGNORE INTO links (numero, nome, status, departamento, seeded) VALUES (?, ?, ?, ?, 1)",
      [link.numero, link.nome, link.status, link.departamento]
    );
  } catch (e) {}
}
console.log("✅ Links de exemplo criados");

await connection.end();
console.log("\n🎉 Seed concluído com sucesso!");
console.log("\n📋 Credenciais de acesso:");
console.log("   Admin:             admin / admin123");
console.log("   Fornecedor SP:     fornecedor_sp / fornecedor123");
console.log("   Fornecedor Limeira: fornecedor_limeira / fornecedor123");
console.log("\n📊 Dados padrão carregados:");
console.log("   • 12 Status");
console.log("   • 5 Departamentos");
console.log("   • 3 Links de exemplo");
console.log("\n⚠️  IMPORTANTE: Altere as senhas após o primeiro acesso!");
