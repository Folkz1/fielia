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
      number,
      text,
      delay,
    });
  }

  async sendMediaMessage({ number, mediaUrl, caption }: SendMediaMessageParams) {
    return this.makeRequest(`/message/sendMedia/${this.instance}`, 'POST', {
      number,
      mediaUrl,
      caption,
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
        id: string;
        title: string;
        description?: string;
      }[];
    }[];
  }) {
    return this.makeRequest(`/message/sendList/${this.instance}`, 'POST', {
      number,
      title,
      description: text,
      footerText: footer,
      buttonText,
      sections,
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
