const fs = require('fs');
let code = fs.readFileSync('src/features/documents/components/SendDocumentPage.tsx', 'utf8');

const startIdx = code.indexOf('const renderSignersStep');
const endIdx = code.indexOf('const renderEmailStep');
if (startIdx !== -1 && endIdx !== -1) {
  const cleanBlock = `const renderSignersStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Signing Execution Chain</div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={addSigner}
            className="h-9 rounded-xl border-slate-200 text-[#0D9F8C] font-bold text-xs hover:bg-[#F7FAF8]"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Recipient Signer
          </Button>
        </div>

        <div className="space-y-3">
          {signersList.map((signer, index) => (
            <div 
              key={signer.id}
              className="grid gap-3 bg-white border border-slate-200/50 rounded-xl p-4 md:grid-cols-[40px_1fr_1.2fr_1fr_40px] md:items-center relative"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 font-black text-xs">
                {index + 1}
              </div>

              <label className="grid gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Full Name
                <Input 
                  required
                  value={signer.name}
                  onChange={(e) => handleSignerChange(signer.id, "name", e.target.value)}
                  placeholder="e.g. Gurpreet Singh" 
                  className="h-10 rounded-lg text-xs font-semibold"
                />
              </label>

              <label className="grid gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Email Address
                <Input 
                  required
                  type="email"
                  value={signer.email}
                  onChange={(e) => handleSignerChange(signer.id, "email", e.target.value)}
                  placeholder="e.g. signer@email.com" 
                  className="h-10 rounded-lg text-xs font-semibold"
                />
              </label>

              <label className="grid gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Role Select
                <select 
                  value={signer.role}
                  onChange={(e) => handleSignerChange(signer.id, "role", e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]"
                >
                  <option value="RMA Agent (Principal)">RMA Agent (Principal)</option>
                  <option value="Primary Client (Signer)">Primary Client (Signer)</option>
                  <option value="Sponsor (Signer)">Sponsor (Signer)</option>
                  <option value="Witness (Declarant)">Witness (Declarant)</option>
                </select>
              </label>

              <div className="flex justify-end pt-5 md:pt-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeSigner(signer.id)}
                  disabled={signersList.length <= 1}
                  className="h-8 w-8 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(0)} className="rounded-xl border-slate-200 bg-white font-bold px-6">
          Back
        </Button>
        <Button 
          disabled={signersList.some(s => !s.name || !s.email)}
          onClick={() => setCurrentStep(2)} 
          className="rounded-xl bg-[#0D9F8C] font-bold px-6 shadow-md hover:bg-[#0A5B52] disabled:opacity-40"
        >
          Email Customise <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )

  `;
  code = code.substring(0, startIdx) + cleanBlock + code.substring(endIdx);
  fs.writeFileSync('src/features/documents/components/SendDocumentPage.tsx', code);
  console.log('Fixed renderSignersStep');
} else {
  console.log('Could not find start/end indices');
}
