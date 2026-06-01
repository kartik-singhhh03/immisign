/** @deprecated Use src/features/auth/store instead */
import { isSafeDevMode } from "@/lib/config";

// Feature flags for safe dev mode
export const featureFlags = {
  useMockAuth: isSafeDevMode,
  useMockBilling: !process.env.STRIPE_SECRET_KEY,
  useMockAgreements: !process.env.SIGNWELL_API_KEY,
  useMockUpload: isSafeDevMode, // tied to supabase
  useMockEmail: !process.env.RESEND_API_KEY,
};

// Mock Auth Provider
export const MockAuthProvider = {
  login: async (email: string) => {
    console.log(`[Mock Auth] Logged in as ${email}`);
    return { user: { id: "mock-user-1", email, role: "Owner" } };
  },
  logout: async () => {
    console.log("[Mock Auth] Logged out");
    return true;
  },
  getUser: async () => {
    return { user: { id: "mock-user-1", email: "demo@example.com", role: "Owner" } };
  }
};

// Mock Billing Provider
export const MockBillingProvider = {
  createCustomer: async (email: string) => {
    console.log(`[Mock Billing] Created customer ${email}`);
    return { id: "cus_mock123" };
  },
  createSubscription: async (customerId: string) => {
    console.log(`[Mock Billing] Created subscription for ${customerId}`);
    return { id: "sub_mock123", status: "active" };
  },
  getInvoices: async () => {
    return [
      { id: "inv_1", amount: 2900, status: "paid", date: new Date().toISOString() }
    ];
  }
};

// Mock Agreements Provider
export const MockAgreementsProvider = {
  createAgreement: async (data: any) => {
    console.log("[Mock Agreements] Created agreement", data);
    return { id: "agr_mock123", documentUrl: "https://mock.document.url" };
  },
  sendForSignature: async (agreementId: string) => {
    console.log(`[Mock Agreements] Sent ${agreementId} for signature`);
    return { status: "sent" };
  },
  getAgreementStatus: async (agreementId: string) => {
    return { status: "awaiting_signature" };
  }
};

// Mock Upload Provider
export const MockUploadProvider = {
  uploadFile: async (file: File, path: string) => {
    console.log(`[Mock Upload] Uploaded ${file.name} to ${path}`);
    return { url: `https://mock.storage.url/${path}/${file.name}` };
  },
  deleteFile: async (path: string) => {
    console.log(`[Mock Upload] Deleted file at ${path}`);
    return true;
  }
};

// Mock Email Provider
export const MockEmailProvider = {
  sendEmail: async (to: string, subject: string, body: string) => {
    console.log(`[Mock Email] Sent to ${to}: ${subject}`);
    return { id: "msg_mock123", status: "delivered" };
  }
};

