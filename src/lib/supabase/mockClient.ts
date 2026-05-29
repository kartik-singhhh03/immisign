// Mock client for Safe Development Mode
// Mimics Supabase JS client API for seamless fallback execution

const mockUser = {
  id: "u-owner",
  email: "owner@demoagency.com",
  name: "Rajwant Singh",
  avatar: "RS",
  role: "Owner",
  marn: "1794016",
  abn: "45 128 349 820"
};

const mockAgency = {
  id: "w-avc",
  name: "AVC Migration",
  slug: "avc-migration",
  initials: "AM",
  color: "#0D9F8C",
  address: "Level 14, 175 Pitt Street, Sydney NSW 2000",
  marn: "1794016",
  abn: "45 128 349 820",
  stripe_customer_id: "cus_mock_12345",
  logo_url: null,
  branding_settings: [
    {
      logo_url: null,
      primary_color: "#0D9F8C"
    }
  ]
};

const mockProfile = {
  id: "u-owner",
  name: "Rajwant Singh",
  email: "owner@demoagency.com",
  role: "owner",
  agency_id: "w-avc",
  agency: mockAgency
};

const mockAgreements = [
  {
    id: "AGR-1048",
    client_id: "c-1",
    creator_id: "u-owner",
    title: "Partner Visa - SC 820",
    status: "Signed",
    professional_fee: 3500,
    fee: "$3,500",
    matter: "Partner Visa - SC 820",
    client: { id: "c-1", name: "Harpreet Kaur", email: "harpreet@example.com" },
    creator: { id: "u-owner", name: "Rajwant Singh" },
    documents: [
      { id: "doc-1", file_name: "SC-820_Evidence_Index.pdf", storage_path: "w-avc/AGR-1048/SC-820_Evidence_Index.pdf", size: "12 KB", type: "PDF" }
    ],
    signers: [
      { id: "s-1", full_name: "Harpreet Kaur", email: "harpreet@example.com", signing_order: 1 }
    ]
  },
  {
    id: "AGR-1047",
    client_id: "c-2",
    creator_id: "u-owner",
    title: "Skilled Migration - SC 190",
    status: "Awaiting",
    professional_fee: 2200,
    fee: "$2,200",
    matter: "Skilled Migration - SC 190",
    client: { id: "c-2", name: "Gurpreet Singh", email: "gurpreet@example.com" },
    creator: { id: "u-owner", name: "Rajwant Singh" },
    documents: [],
    signers: []
  }
];

const mockClients = [
  { id: "c-1", name: "Harpreet Kaur", email: "harpreet@example.com" },
  { id: "c-2", name: "Gurpreet Singh", email: "gurpreet@example.com" }
];

const mockEmailJobs = [
  {
    id: "job-1",
    recipient: "harpreet@example.com",
    type: "agreement_sent",
    payload: { subject: "Agreement Sent", clientName: "Harpreet Kaur" },
    agency_id: "w-avc",
    status: "pending",
    agency: mockAgency
  }
];

function getMockSingleData(table: string) {
  switch (table) {
    case 'profiles':
      return mockProfile;
    case 'agencies':
      return mockAgency;
    case 'agreements':
      return mockAgreements[0];
    case 'clients':
      return mockClients[0];
    case 'email_jobs':
      return mockEmailJobs[0];
    default:
      return {};
  }
}

function getMockListData(table: string) {
  switch (table) {
    case 'profiles':
      return [mockProfile];
    case 'agencies':
      return [mockAgency];
    case 'agreements':
      return mockAgreements;
    case 'clients':
      return mockClients;
    case 'email_jobs':
      return mockEmailJobs;
    default:
      return [];
  }
}

class MockQueryBuilder {
  private table: string;
  constructor(table: string) {
    this.table = table;
  }
  select() { return this; }
  insert(data: any) { return this; }
  update(data: any) { return this; }
  upsert(data: any) { return this; }
  delete() { return this; }
  eq() { return this; }
  single() {
    return Promise.resolve({ data: getMockSingleData(this.table), error: null });
  }
  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return Promise.resolve({ data: getMockListData(this.table), error: null }).then(onfulfilled, onrejected);
  }
}

export const mockClient = {
  auth: {
    getUser: async () => ({ data: { user: mockUser }, error: null }),
    getSession: async () => ({ data: { session: { user: mockUser } }, error: null }),
    signOut: async () => ({ error: null }),
  },
  from: (table: string) => {
    return new MockQueryBuilder(table);
  },
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: any, options: any) => ({ data: { path }, error: null }),
      createSignedUrl: async (path: string, expires: number) => ({ data: { signedUrl: `/mock-files/${path}` }, error: null }),
    })
  }
};
