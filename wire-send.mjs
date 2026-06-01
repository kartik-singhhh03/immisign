import fs from 'fs';

const filePath = 'src/features/documents/components/SendDocumentPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('import { useDemoStore }')) {
  content = content.replace('import { useApprovalStore } from "@/store/approvalStore"', 'import { useApprovalStore } from "@/store/approvalStore"\nimport { useDemoStore } from "@/store/demoStore"');
}

if (!content.includes('addDocument = useDemoStore')) {
  content = content.replace('const [sendLogs, setSendLogs] = React.useState<string[]>([])', 'const [sendLogs, setSendLogs] = React.useState<string[]>([])\n  const addDocument = useDemoStore(state => state.addDocument)\n\n  React.useEffect(() => {\n    if (sendSuccess && uploadedFile) {\n      addDocument({\n        id: `DOC-${Math.floor(1000 + Math.random() * 9000)}`,\n        name: uploadedFile.name,\n        category: "Dispatched",\n        size: uploadedFile.size,\n        type: uploadedFile.type,\n        date: new Date().toLocaleDateString(\'en-GB\', { day: \'2-digit\', month: \'short\', year: \'numeric\' }),\n        downloads: 0\n      })\n    }\n  }, [sendSuccess])');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('SendDocumentPage wired!');
