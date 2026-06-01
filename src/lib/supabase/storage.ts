import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Storage Architecture Design
 * 
 * Bucket Name: 'documents'
 * 
 * Directory Structure:
 * /<agency-id>/documents/<document-id>/<document-name>
 * /<agency-id>/agreements/<agreement-id>/<document-name>
 * /<agency-id>/templates/<template-id>/<template-name>
 * /<agency-id>/signed/<agreement-id>/<signer-id>-<document-name>
 * /<agency-id>/approvals/<approval-id>/<document-name>
 * 
 * Strict RLS enforces that users can only access the `<agency-id>` root folder that matches their public.get_tenant()
 */

export const StorageHelpers = {
  getDocumentPath: (agencyId: string, documentId: string, fileName: string) => {
    return `${agencyId}/documents/${documentId}/${fileName}`;
  },
  getAgreementPath: (agencyId: string, agreementId: string, fileName: string) => {
    return `${agencyId}/agreements/${agreementId}/${fileName}`;
  },
  getTemplatePath: (agencyId: string, templateId: string, fileName: string) => {
    return `${agencyId}/templates/${templateId}/${fileName}`;
  },
  getSignedDocumentPath: (agencyId: string, agreementId: string, signerId: string, fileName: string) => {
    return `${agencyId}/signed/${agreementId}/${signerId}-${fileName}`;
  },
  getApprovalDocumentPath: (agencyId: string, approvalId: string, fileName: string) => {
    return `${agencyId}/approvals/${approvalId}/${fileName}`;
  }
};

export class StorageService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Uploads a file to the documents bucket.
   * Path should be generated via StorageHelpers to maintain multi-tenant structure.
   */
  async uploadFile(bucket: string, path: string, file: File): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Storage Upload Error:', error);
      throw error;
    }

    return data.path; // Return the path for DB storage, not signed URL
  }

  /**
   * Dynamically generates a short-lived signed URL for a file.
   */
  async getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Signed URL Error:', error);
      throw error;
    }

    return data.signedUrl;
  }
}
