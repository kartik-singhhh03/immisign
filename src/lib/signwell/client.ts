import { signwellConfig, validateSignwellConfig } from './config';
import { SignWellDocumentRequest, SignWellDocumentResponse } from './types';
import {
  needsSignwellSendCall,
  normalizeSignwellDocument,
  signwellDispatchConfirmed,
} from './status';
import { AppError } from '../utils/errors';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeResponse(raw: SignWellDocumentResponse): SignWellDocumentResponse {
  return normalizeSignwellDocument(raw) as SignWellDocumentResponse;
}

export class SignWellClient {
  constructor() {
    validateSignwellConfig();
  }

  private async fetchWithRetry<T>(endpoint: string, options: RequestInit, retries = 3): Promise<T> {
    const url = `${signwellConfig.baseUrl}${endpoint}`;

    let lastError: any;
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': signwellConfig.apiKey,
            ...options.headers,
          },
        });

        if (!response.ok) {
          const text = await response.text();
          if (response.status === 429 && i < retries - 1) {
            const waitTime = Math.pow(2, i) * 1000;
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }
          throw new Error(`SignWell API Error (${response.status}): ${text}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return (await response.json()) as T;
        }
        return {} as T;
      } catch (error: any) {
        lastError = error;
        if (i < retries - 1) {
          const waitTime = Math.pow(2, i) * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }
    throw new AppError(
      `SignWell API requests failed after ${retries} retries: ${lastError.message}`,
      'INTERNAL_ERROR',
    );
  }

  async createDocument(data: SignWellDocumentRequest): Promise<SignWellDocumentResponse> {
    const raw = await this.fetchWithRetry<SignWellDocumentResponse>('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return normalizeResponse(raw);
  }

  async getDocument(documentId: string): Promise<SignWellDocumentResponse> {
    const raw = await this.fetchWithRetry<SignWellDocumentResponse>(`/documents/${documentId}`, {
      method: 'GET',
    });
    return normalizeResponse(raw);
  }

  /**
   * POST /documents/{id}/send when status is Draft, Created, or Sending.
   * Polls briefly — SignWell may return Draft in the POST body while status becomes Sent async.
   */
  async sendDocument(
    documentId: string,
    sendBody?: { subject?: string; message?: string },
  ): Promise<SignWellDocumentResponse> {
    let doc = await this.getDocument(documentId);

    if (signwellDispatchConfirmed(doc)) {
      return doc;
    }

    if (!needsSignwellSendCall(doc.status)) {
      return doc;
    }

    const body = JSON.stringify({
      subject: sendBody?.subject || 'Signature required',
      message: sendBody?.message || 'Please review and sign the attached document.',
    });

    try {
      const sentRaw = await this.fetchWithRetry<SignWellDocumentResponse>(
        `/documents/${documentId}/send`,
        { method: 'POST', body },
      );
      doc = normalizeResponse(sentRaw);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("isn't draft") || msg.includes('is not draft')) {
        doc = await this.getDocument(documentId);
      } else {
        throw error;
      }
    }

    for (let attempt = 0; attempt < 6 && !signwellDispatchConfirmed(doc); attempt++) {
      await sleep(attempt === 0 ? 500 : 1500);
      doc = await this.getDocument(documentId);
    }

    return doc;
  }

  async cancelDocument(documentId: string): Promise<void> {
    return this.fetchWithRetry<void>(`/documents/${documentId}`, {
      method: 'DELETE',
    });
  }

  async downloadCompletedPdf(documentId: string): Promise<ArrayBuffer> {
    const url = `${signwellConfig.baseUrl}/documents/${documentId}/completed_pdf`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Api-Key': signwellConfig.apiKey,
      },
    });

    if (!response.ok) {
      throw new AppError(`Failed to download SignWell PDF: ${response.statusText}`, 'INTERNAL_ERROR');
    }

    return response.arrayBuffer();
  }
}

let clientInstance: SignWellClient | null = null;

export function getSignwellClient(): SignWellClient {
  if (!clientInstance) clientInstance = new SignWellClient();
  return clientInstance;
}

/** Lazy singleton — avoids throwing during Next.js build when env is absent at import time. */
export const signwellClient: SignWellClient = new Proxy({} as SignWellClient, {
  get(_target, prop: string | symbol) {
    const client = getSignwellClient();
    const value = client[prop as keyof SignWellClient];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
