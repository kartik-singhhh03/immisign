import { Project } from "ts-morph";
import * as fs from "fs";
import * as path from "path";

const project = new Project();
const sourceFile = project.addSourceFileAtPath("src/components/saas/dashboard-pages.tsx");

const exportDecls = sourceFile.getExportedDeclarations();

const featureMap = {
  DashboardHomePage: "dashboard/components/DashboardHomePage.tsx",
  PlaceholderDashboardPage: "dashboard/components/PlaceholderDashboardPage.tsx",
  
  AgreementsPage: "agreements/components/AgreementsPage.tsx",
  NewAgreementPage: "agreements/components/NewAgreementPage.tsx",
  AgreementDetailPage: "agreements/components/AgreementDetailPage.tsx",
  
  SendDocumentPage: "documents/components/SendDocumentPage.tsx",
  DocumentLibraryPage: "documents/components/DocumentLibraryPage.tsx",
  
  ClientsPage: "clients/components/ClientsPage.tsx",
  ClientDetailPage: "clients/components/ClientDetailPage.tsx",
  
  AnalyticsPage: "analytics/components/AnalyticsPage.tsx",
  ReportsPage: "reports/components/ReportsPage.tsx",
  
  SettingsPage: "settings/components/SettingsPage.tsx",
  BillingPage: "billing/components/BillingPage.tsx",
  TemplatesPage: "templates/components/TemplatesPage.tsx",
};

const importsText = sourceFile.getImportDeclarations().map(imp => imp.getText()).join("\n");
const nonExported = sourceFile.getFunctions().filter(f => !f.isExported()).map(f => f.getText()).join("\n\n");
const interfaces = sourceFile.getInterfaces().map(i => i.getText()).join("\n\n");
const typeAliases = sourceFile.getTypeAliases().map(t => t.getText()).join("\n\n");

// Any top level consts that are not exported
const varDecls = sourceFile.getVariableStatements().filter(v => !v.isExported()).map(v => v.getText()).join("\n\n");

async function run() {
  for (const [name, declarations] of exportDecls.entries()) {
    if (featureMap[name]) {
      const featurePath = `src/features/${featureMap[name]}`;
      const dir = path.dirname(featurePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      
      const compText = declarations[0].getText();
      
      const fileContent = `
"use client"
${importsText}

${interfaces}

${typeAliases}

${varDecls}

${nonExported}

${compText}
`;
      
      fs.writeFileSync(featurePath, fileContent);
      console.log("Created " + featurePath);
    } else {
      console.log("Skipping " + name);
    }
  }
}

run().catch(console.error);
