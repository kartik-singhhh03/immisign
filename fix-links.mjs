import fs from 'fs';

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Add useAuthStore import if missing
  if (!content.includes('useAuthStore')) {
    content = content.replace('import * as React from "react"', 'import * as React from "react"\nimport { useAuthStore } from "@/store/authStore"');
    modified = true;
  }

  for (const rep of replacements) {
    if (content.includes(rep.from)) {
      content = content.replace(rep.from, rep.to);
      modified = true;
    }
  }

  // Inject currentSlug into the main component function if useAuthStore is present but not used
  const componentRegex = /export function ([A-Za-z0-9]+)\(\) {/;
  if (modified && content.match(componentRegex)) {
    if (!content.includes('const currentSlug')) {
      content = content.replace(componentRegex, (match) => {
        return `${match}\n  const currentSlug = useAuthStore(s => s.activeWorkspace?.slug || "avc-migration")`;
      });
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

replaceInFile('src/features/documents/components/SendDocumentPage.tsx', [
  { from: '<Link href="/documents/library">', to: '<Link href={`/workspace/${currentSlug}/documents/library`}>' }
]);

replaceInFile('src/features/documents/components/DocumentLibraryPage.tsx', [
  { from: '<Link href="/agreements/new">', to: '<Link href={`/workspace/${currentSlug}/agreements/new`}>' },
  { from: '<Link href="/documents/send">', to: '<Link href={`/workspace/${currentSlug}/documents/send`}>' }
]);

replaceInFile('src/features/agreements/components/NewAgreementPage.tsx', [
  { from: '<Link href="/agreements">', to: '<Link href={`/workspace/${currentSlug}/agreements`}>' }
]);

replaceInFile('src/features/agreements/components/AgreementsPage.tsx', [
  { from: '<Link href="/agreements/new">', to: '<Link href={`/workspace/${currentSlug}/agreements/new`}>' }
]);

console.log('Done fixing links');
