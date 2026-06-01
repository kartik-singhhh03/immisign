import * as fs from "fs";
import * as path from "path";

const routes = [
  {
    name: "dashboard",
    component: "DashboardHomePage",
    importPath: "@/features/dashboard/components/DashboardHomePage"
  },
  {
    name: "agreements",
    component: "AgreementsPage",
    importPath: "@/features/agreements/components/AgreementsPage"
  },
  {
    name: "approvals",
    component: "ApplicationApprovalsHomePage",
    importPath: "@/components/saas/application-approvals/pages"
  },
  {
    name: "documents",
    component: "DocumentLibraryPage",
    importPath: "@/features/documents/components/DocumentLibraryPage"
  },
  {
    name: "settings",
    component: "SettingsPage",
    importPath: "@/features/settings/components/SettingsPage"
  },
  {
    name: "billing",
    component: "BillingPage",
    importPath: "@/features/billing/components/BillingPage"
  }
];

const basePath = path.join(process.cwd(), "src/app/workspace/[agency]");

routes.forEach(route => {
  const dir = path.join(basePath, route.name);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const pageContent = 'import { ' + route.component + ' } from "' + route.importPath + '"\n\n' +
    'export default function ' + route.component + 'Route() {\n' +
    '  return <' + route.component + ' />\n' +
    '}\n';

  const loadingContent = 'export default function Loading() {\n' +
    '  return (\n' +
    '    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">\n' +
    '      <span className="h-8 w-8 animate-spin rounded-full border-4 border-[#0D9F8C] border-t-transparent" />\n' +
    '      <p className="text-sm font-bold text-slate-500">Loading ' + route.name + '...</p>\n' +
    '    </div>\n' +
    '  )\n' +
    '}\n';

  const errorContent = '"use client"\n\n' +
    'import { useEffect } from "react"\n\n' +
    'export default function Error({\n' +
    '  error,\n' +
    '  reset,\n' +
    '}: {\n' +
    '  error: Error & { digest?: string }\n' +
    '  reset: () => void\n' +
    '}) {\n' +
    '  useEffect(() => {\n' +
    '    console.error(error)\n' +
    '  }, [error])\n\n' +
    '  return (\n' +
    '    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">\n' +
    '      <h2 className="text-xl font-bold text-slate-900">Something went wrong in ' + route.name + '!</h2>\n' +
    '      <button\n' +
    '        className="rounded-md bg-[#0D9F8C] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0A8070]"\n' +
    '        onClick={() => reset()}\n' +
    '      >\n' +
    '        Try again\n' +
    '      </button>\n' +
    '    </div>\n' +
    '  )\n' +
    '}\n';

  fs.writeFileSync(path.join(dir, "page.tsx"), pageContent);
  fs.writeFileSync(path.join(dir, "loading.tsx"), loadingContent);
  fs.writeFileSync(path.join(dir, "error.tsx"), errorContent);
  
  console.log("Created route: " + route.name);
});
