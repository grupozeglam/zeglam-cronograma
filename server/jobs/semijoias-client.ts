// @ts-ignore — cheerio types resolve at runtime via skipLibCheck
import * as cheerio from "cheerio";

const BASE_URL = "https://zeglam.semijoias.net/admin/services";
const HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  "X-Requested-With": "XMLHttpRequest",
  "Origin": "https://zeglam.semijoias.net",
  "Referer": "https://zeglam.semijoias.net/admin/",
};

export interface ExternalLink {
  nome: string;
  statusText: string;
  encerramento: string | null;
}

// Status externo (texto visível no HTML) → status local
const STATUS_MAP: Record<string, string> = {
  "Em preparação": "Em Breve",
  "Pronto e Aberto": "Link Aberto",
  "Fechado": "Fechado",
  "Em fabricação": "Produção/Fabricação",
  "Fornecedor separando o pedido": "Fornecedor separando o pedido",
  "Verificando Estoque": "Verificando Estoque",
  "Organizando Valores": "Verificando Estoque",
  "Aguardando Pagamentos": "Aguardando Pagamentos",
  "Em Trânsito": "Em trânsito",
  "Em Trânsito Internacional": "Em trânsito",
  "Em Separação": "Em Separação",
  "Envio Liberado": "Liberado pra Envio",
  "Envio Parcial Liberado": "Liberado pra Envio",
  "Fechado e Bloqueado": "Cancelado",
  "Finalizado": "Finalizado",
};

export function mapStatus(externalStatus: string): string {
  return STATUS_MAP[externalStatus.trim()] ?? externalStatus.trim();
}

function parseDateBR(dateStr: string): string | null {
  const m = dateStr.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

class SemijoiasClient {
  private sessionCookie: string | null = null;
  private cookieExpiresAt = 0;
  private email: string;
  private password: string;

  constructor(email: string, password: string) {
    this.email = email;
    this.password = password;
  }

  private async getJwt(source: string): Promise<string> {
    const headers: Record<string, string> = { ...HEADERS };
    if (this.sessionCookie) headers["Cookie"] = `cookies-ctl=${this.sessionCookie}`;

    const res = await fetch(`${BASE_URL}/http-jwt`, {
      method: "POST",
      headers,
      body: `Source=${encodeURIComponent(source)}`,
    });
    if (!res.ok) throw new Error(`http-jwt failed: ${res.status}`);
    return (await res.text()).trim();
  }

  async login(): Promise<void> {
    const jwt = await this.getJwt("login");

    const body = new URLSearchParams({
      email: this.email,
      password: this.password,
      JWT: jwt,
      Path: "login",
    });

    const res = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: HEADERS,
      body: body.toString(),
      redirect: "manual",
    });

    const setCookie = res.headers.get("set-cookie") ?? "";
    const match = setCookie.match(/cookies-ctl=([^;]+)/);
    if (!match) {
      const text = await res.text();
      throw new Error(`Login failed (${res.status}): ${text}`);
    }

    this.sessionCookie = decodeURIComponent(match[1]);
    this.cookieExpiresAt = Date.now() + 2.5 * 24 * 60 * 60 * 1000; // ~2.5 days safety margin
    console.log("[SYNC] Login no semijoias.net realizado com sucesso");
  }

  private async ensureAuth(): Promise<void> {
    if (!this.sessionCookie || Date.now() >= this.cookieExpiresAt) {
      await this.login();
    }
  }

  async fetchLinks(): Promise<ExternalLink[]> {
    await this.ensureAuth();

    const jwt = await this.getJwt("virtualcatalog/index");

    const body = new URLSearchParams({
      JWT: jwt,
      Path: "virtualcatalog/index",
    });

    const res = await fetch(`${BASE_URL}/view`, {
      method: "POST",
      headers: { ...HEADERS, Cookie: `cookies-ctl=${this.sessionCookie}` },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      if (text.includes("expirado") || res.status === 401) {
        this.sessionCookie = null;
        await this.ensureAuth();
        return this.fetchLinks();
      }
      throw new Error(`view failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const html = await res.text();
    return this.parseHtml(html);
  }

  private parseHtml(html: string): ExternalLink[] {
    const $ = cheerio.load(html);
    const results: ExternalLink[] = [];

    $("tr").each((_i: number, row: any) => {
      const cells = $(row).find("td");
      if (cells.length < 3) return;

      const firstCell = $(cells[0]).text().trim();
      // Skip header-like rows (e.g. "Minha Loja")
      if (!firstCell || firstCell.includes("Minha Loja")) return;

      // Cell 0: "NOME Status XX.XX%"
      // The name and status are mixed in the first cell text
      // Status appears as a badge span with known status text
      let nome = "";
      let statusText = "";

      // Try to extract status from known patterns in cell text
      const fullText = $(cells[0]).text().replace(/\s+/g, " ").trim();

      for (const extStatus of Object.keys(STATUS_MAP)) {
        const idx = fullText.indexOf(extStatus);
        if (idx > 0) {
          nome = fullText.slice(0, idx).trim();
          statusText = extStatus;
          break;
        }
      }

      // If no known status matched, try splitting by percentage pattern
      if (!nome) {
        const pctMatch = fullText.match(/^(.+?)\s+[\d.]+%/);
        if (pctMatch) {
          nome = pctMatch[1].trim();
        } else {
          nome = fullText.split(/\s{2,}/)[0]?.trim() ?? fullText;
        }
      }

      if (!nome) return;

      // Dates are in cells 1 (criado) and 2 (encerramento)
      const encerramentoRaw = $(cells[2]).text().trim();
      const encerramento = parseDateBR(encerramentoRaw);

      results.push({ nome, statusText, encerramento });
    });

    return results;
  }
}

let clientInstance: SemijoiasClient | null = null;

export function getSemijoiasClient(email: string, password: string): SemijoiasClient {
  if (!clientInstance) {
    clientInstance = new SemijoiasClient(email, password);
  }
  return clientInstance;
}
