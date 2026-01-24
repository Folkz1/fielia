const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY!;

interface CreateCustomerParams {
  name: string;
  cpfCnpj: string;
  email: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
}

interface CreateSubscriptionParams {
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
  value: number;
  nextDueDate: string;
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  description?: string;
}

export class AsaasClient {
  private baseURL: string;
  private apiKey: string;

  constructor() {
    this.baseURL = ASAAS_API_URL;
    this.apiKey = ASAAS_API_KEY;
  }

  private async makeRequest(endpoint: string, method: string = 'GET', body?: any) {
    const url = `${this.baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'access_token': this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Asaas API Error: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  async createCustomer(params: CreateCustomerParams) {
    return this.makeRequest('/customers', 'POST', params);
  }

  async getCustomer(customerId: string) {
    return this.makeRequest(`/customers/${customerId}`);
  }

  async createSubscription(params: CreateSubscriptionParams) {
    return this.makeRequest('/subscriptions', 'POST', params);
  }

  async getSubscription(subscriptionId: string) {
    return this.makeRequest(`/subscriptions/${subscriptionId}`);
  }

  async cancelSubscription(subscriptionId: string) {
    return this.makeRequest(`/subscriptions/${subscriptionId}`, 'DELETE');
  }

  async listPayments(customerId?: string) {
    const query = customerId ? `?customer=${customerId}` : '';
    return this.makeRequest(`/payments${query}`);
  }

  async getPayment(paymentId: string) {
    return this.makeRequest(`/payments/${paymentId}`);
  }

  async createPaymentLink(params: {
    name: string;
    description?: string;
    billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
    chargeType: 'DETACHED' | 'RECURRENT';
    value?: number;
    subscriptionCycle?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  }) {
    return this.makeRequest('/paymentLinks', 'POST', params);
  }
}

export const asaasClient = new AsaasClient();
