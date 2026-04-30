const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL!;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY!;
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME!;

interface SendTextMessageParams {
  number: string;
  text: string;
  delay?: number;
}

interface SendMediaMessageParams {
  number: string;
  mediaUrl: string;
  caption?: string;
}

interface SendStickerParams {
  number: string;
  sticker: string; // base64 encoded WebP image
}

function normalizeRecipient(value: string) {
  const recipient = String(value || '').trim();
  if (recipient.includes('@')) return recipient;

  const digits = recipient.replace(/\D/g, '');
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith('55')) {
    return `55${digits}`;
  }

  return digits || recipient;
}

export class EvolutionAPIClient {
  private baseURL: string;
  private apiKey: string;
  private instance: string;

  constructor() {
    this.baseURL = EVOLUTION_API_URL;
    this.apiKey = EVOLUTION_API_KEY;
    this.instance = INSTANCE_NAME;
  }

  private async makeRequest(endpoint: string, method: string = 'GET', body?: any) {
    const url = `${this.baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Evolution API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async sendTextMessage({ number, text, delay = 0 }: SendTextMessageParams) {
    return this.makeRequest(`/message/sendText/${this.instance}`, 'POST', {
      number: normalizeRecipient(number),
      text,
      delay,
    });
  }

  async sendMediaMessage({ number, mediaUrl, caption }: SendMediaMessageParams) {
    return this.makeRequest(`/message/sendMedia/${this.instance}`, 'POST', {
      number: normalizeRecipient(number),
      mediaUrl,
      caption,
    });
  }

  async sendSticker({ number, sticker }: SendStickerParams) {
    return this.makeRequest(`/message/sendSticker/${this.instance}`, 'POST', {
      number: normalizeRecipient(number),
      sticker,
    });
  }

  async sendListMessage({ number, title, text, footer, buttonText, sections }: {
    number: string;
    title: string;
    text: string;
    footer?: string;
    buttonText: string;
    sections: {
      title: string;
      rows: {
        rowId?: string;
        id?: string;
        title: string;
        description?: string;
      }[];
    }[];
  }) {
    const normalizedSections = sections.map((section) => ({
      ...section,
      rows: section.rows.map((row) => ({
        ...row,
        rowId: row.rowId ?? row.id ?? row.title,
      })),
    }));

    return this.makeRequest(`/message/sendList/${this.instance}`, 'POST', {
      number: normalizeRecipient(number),
      title,
      description: text,
      footerText: footer,
      buttonText,
      sections: normalizedSections,
    });
  }

  async getInstanceStatus() {
    return this.makeRequest(`/instance/connectionState/${this.instance}`);
  }

  async getQRCode() {
    return this.makeRequest(`/instance/connect/${this.instance}`);
  }

  async logout() {
    return this.makeRequest(`/instance/logout/${this.instance}`, 'DELETE');
  }
}

export const evolutionAPI = new EvolutionAPIClient();
