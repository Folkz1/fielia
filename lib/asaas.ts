const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY!;

type BillingType = 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
type SubscriptionCycle =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMIANNUALLY'
  | 'YEARLY';

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
  billingType: Exclude<BillingType, 'UNDEFINED'>;
  value: number;
  nextDueDate: string;
  cycle: SubscriptionCycle;
  description?: string;
}

interface CreatePaymentParams {
  customer: string;
  billingType: Exclude<BillingType, 'UNDEFINED'>;
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
  callback?: {
    successUrl?: string;
    autoRedirect?: boolean;
  };
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

  async createPayment(params: CreatePaymentParams) {
    return this.makeRequest('/payments', 'POST', params);
  }

  async listPayments(query?: Record<string, string | number | boolean | undefined>) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query || {})) {
      if (value === undefined) continue;
      search.set(key, String(value));
    }

    const suffix = search.toString() ? `?${search.toString()}` : '';
    return this.makeRequest(`/payments${suffix}`);
  }

  async getPayment(paymentId: string) {
    return this.makeRequest(`/payments/${paymentId}`);
  }

  async getPaymentPixQrCode(paymentId: string) {
    return this.makeRequest(`/payments/${paymentId}/pixQrCode`);
  }

  async listSubscriptionPayments(subscriptionId: string) {
    return this.makeRequest(`/subscriptions/${subscriptionId}/payments`);
  }

  async createPaymentLink(params: {
    name: string;
    description?: string;
    billingType: BillingType;
    chargeType: 'DETACHED' | 'RECURRENT';
    value?: number;
    subscriptionCycle?: SubscriptionCycle;
  }) {
    return this.makeRequest('/paymentLinks', 'POST', params);
  }
}

export const asaasClient = new AsaasClient();
