import { signwellConfig, validateSignwellConfig } from './config';
import { SignWellDocumentRequest, SignWellDocumentResponse } from './types';
import { needsSignwellSendCall, signwellDispatchConfirmed } from './status';
import { AppError } from '../utils/errors';

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
    return this.fetchWithRetry<SignWellDocumentResponse>('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getDocument(documentId: string): Promise<SignWellDocumentResponse> {
    return this.fetchWithRetry<SignWellDocumentResponse>(`/documents/${documentId}`, {
      method: 'GET',
    });
  }

  /**
   * POST /documents/{id}/send when status is Draft, Created, or Sending.
   * Previously skipped send for "Created" (non-Draft), leaving documents unsent.
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
      doc = await this.fetchWithRetry<SignWellDocumentResponse>(`/documents/${documentId}/send`, {
        method: 'POST',
        body,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("isn't draft") || msg.includes('is not draft')) {
        doc = await this.getDocument(documentId);
      } else {
        throw error;
      }
    }

    if (!signwellDispatchConfirmed(doc)) {
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

export const signwellClient = new SignWellClient();
