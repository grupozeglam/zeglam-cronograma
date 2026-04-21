import fs from 'fs';
import path from 'path';

// Diretório de uploads no servidor
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

// Garantir que a pasta de uploads exista
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export async function storagePut(
    relKey: string,
    data: Buffer | Uint8Array | string,
    contentType = "application/octet-stream"
  ): Promise<{ key: string; url: string }> {
    try {
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const key = relKey.replace(/^\/+/, "");
        const filePath = path.join(UPLOADS_DIR, key);
        
        // Garantir que a subpasta exista
        const fileDir = path.dirname(filePath);
        if (!fs.existsSync(fileDir)) {
            fs.mkdirSync(fileDir, { recursive: true });
        }
        
        // Salvar o arquivo localmente
        fs.writeFileSync(filePath, buffer);
        
        // A URL será servida pelo servidor na rota /api/files/
        const url = `/api/files/${key}`;
        console.log(`Arquivo salvo localmente: ${filePath}`);
        
        return { key, url };
    } catch (error: any) {
        console.error("Erro no Storage:", error);
        throw new Error(`Falha ao salvar arquivo: ${error.message}`);
    }
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
    try {
        const key = relKey.replace(/^\/+/, "");
        const url = `/api/files/${key}`;
        return { key, url };
    } catch (error: any) {
        console.error("Erro ao obter Storage:", error);
        return { key: relKey, url: "" };
    }
}
