import fs from 'fs';

function addBadge(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const demoBadgeStr = `<div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 shadow-sm"><ShieldAlert className="h-4 w-4" /> Demo Data Mode</div>`;

  // Find PageHeader and inject action prop if it doesn't exist
  if (content.includes('<PageHeader')) {
    // Some have action already, let's just replace the description and append the badge to it, or insert the action prop.
    content = content.replace(
      /<PageHeader([\s\S]*?)\/>/,
      (match) => {
        if (match.includes('action=')) {
          // Already has action, skip or inject inside
          return match;
        } else {
          // No action prop, add it
          return match.replace('/>', ` action={${demoBadgeStr}} />`);
        }
      }
    );
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Added badge to ${filePath}`);
}

addBadge('src/features/analytics/components/AnalyticsPage.tsx');
addBadge('src/features/reports/components/ReportsPage.tsx');
addBadge('src/features/billing/components/BillingPage.tsx');
