import fs from 'fs';

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  for (const rep of replacements) {
    if (content.includes(rep.from)) {
      content = content.replace(rep.from, rep.to);
      modified = true;
    }
  }
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

// 1. Wire AgreementsPage
replaceInFile('src/features/agreements/components/AgreementsPage.tsx', [
  { 
    from: 'const mockAgreementsList = [',
    to: 'const mockAgreementsList = useDemoStore(state => state.agreementsList);\n  const __oldMock = [' 
  },
  {
    from: 'import { useApprovalStore } from "@/store/approvalStore"',
    to: 'import { useApprovalStore } from "@/store/approvalStore"\nimport { useDemoStore } from "@/store/demoStore"'
  }
]);

// 2. Wire NewAgreementPage
replaceInFile('src/features/agreements/components/NewAgreementPage.tsx', [
  {
    from: 'import { useApprovalStore } from "@/store/approvalStore"',
    to: 'import { useApprovalStore } from "@/store/approvalStore"\nimport { useDemoStore } from "@/store/demoStore"'
  },
  {
    from: 'const [dispatched, setDispatched] = React.useState(false)',
    to: 'const [dispatched, setDispatched] = React.useState(false)\n  const addAgreement = useDemoStore(state => state.addAgreement)\n\n  const handleDispatch = () => {\n    addAgreement({\n      id: `AGR-${Math.floor(1000 + Math.random() * 9000)}`,\n      client: formData.clientName,\n      email: formData.clientEmail,\n      matter: formData.visaSubclass.split(" - ")[0],\n      fee: `$${parseFloat(formData.professionalFee || "0").toLocaleString()}`,\n      status: "Sent",\n      date: new Date().toLocaleDateString(\'en-GB\', { day: \'2-digit\', month: \'short\', year: \'numeric\' }),\n      scope: formData.scopeOfWork,\n      law: formData.governingLaw\n    })\n    setDispatched(true)\n  }'
  },
  {
    from: '<Button onClick={() => setDispatched(true)} className="rounded-xl bg-[#0D9F8C]',
    to: '<Button onClick={handleDispatch} className="rounded-xl bg-[#0D9F8C]'
  }
]);

// 3. Wire DocumentLibraryPage
replaceInFile('src/features/documents/components/DocumentLibraryPage.tsx', [
  {
    from: 'import { useAuthStore } from "@/store/authStore"',
    to: 'import { useAuthStore } from "@/store/authStore"\nimport { useDemoStore } from "@/store/demoStore"'
  },
  {
    from: 'const [documentsList, setDocumentsList] = React.useState<DocumentItem[]>([',
    to: 'const documentsList = useDemoStore(state => state.documentsList)\n  const addDocument = useDemoStore(state => state.addDocument)\n  const deleteDocumentStore = useDemoStore(state => state.deleteDocument)\n  const __oldDocs = ['
  },
  {
    from: 'setDocumentsList((prevDocs) => [newDoc, ...prevDocs])',
    to: 'addDocument(newDoc)'
  },
  {
    from: 'setDocumentsList(prev => prev.filter(doc => doc.id !== id))',
    to: 'deleteDocumentStore(id)'
  }
]);

console.log('Wiring complete');
