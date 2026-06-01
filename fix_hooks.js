const fs = require("fs");
let content = fs.readFileSync("src/lib/hooks/useSupabaseData.ts", "utf8");

const helper = `
async function getRealAgencyId(supabase, fallback) {
  if (!fallback || !fallback.startsWith('w-')) return fallback;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fallback;
  const { data } = await supabase.from('users').select('agency_id').eq('id', user.id).single();
  return data?.agency_id || fallback;
}
`;

content = content.replace(
  "export function useDashboardMetrics() {",
  helper + "\nexport function useDashboardMetrics() {",
);

content = content.replace(
  /repo\.getMetrics\(activeWorkspace\.id\)/g,
  "repo.getMetrics(await getRealAgencyId(supabase, activeWorkspace.id))",
);
content = content.replace(
  /repo\.getRecentActivity\(activeWorkspace\.id\)/g,
  "repo.getRecentActivity(await getRealAgencyId(supabase, activeWorkspace.id))",
);

content = content.replace(
  /const clients = await repo\.list\(activeWorkspace\.id\);/g,
  "const actId = await getRealAgencyId(supabase, activeWorkspace.id);\n      const clients = await repo.list(actId);",
);
content = content.replace(
  /const newClient = await repo\.create\(\{ \.\.\.clientData, agency_id: activeWorkspace\.id \}\);/g,
  "const actId = await getRealAgencyId(supabase, activeWorkspace.id);\n    const newClient = await repo.create({ ...clientData, agency_id: actId });",
);
content = content.replace(
  /agency_id: activeWorkspace\.id/g,
  "agency_id: await getRealAgencyId(supabase, activeWorkspace.id)",
);

content = content.replace(
  /const agreements = await repo\.list\(activeWorkspace\.id\);/g,
  "const actId = await getRealAgencyId(supabase, activeWorkspace.id);\n      const agreements = await repo.list(actId);",
);
content = content.replace(
  /const newAgreement = await repo\.create\(\{ \.\.\.agreementData, agency_id: activeWorkspace\.id \}\);/g,
  "const actId = await getRealAgencyId(supabase, activeWorkspace.id);\n    const newAgreement = await repo.create({ ...agreementData, agency_id: actId });",
);

content = content.replace(
  /const approvals = await repo\.list\(activeWorkspace\.id\);/g,
  "const actId = await getRealAgencyId(supabase, activeWorkspace.id);\n      const approvals = await repo.list(actId);",
);

content = content.replace(
  /const docs = await repo\.list\(activeWorkspace\.id\);/g,
  "const actId = await getRealAgencyId(supabase, activeWorkspace.id);\n      const docs = await repo.list(actId);",
);

fs.writeFileSync("src/lib/hooks/useSupabaseData.ts", content);
console.log("done");
