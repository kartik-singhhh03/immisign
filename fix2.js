const fs = require('fs');
let code = fs.readFileSync('src/features/documents/components/SendDocumentPage.tsx', 'utf8');

const triggerIdx = code.indexOf('const triggerDispatch = async () => {');
const emailIdx = code.indexOf('const renderEmailStep = () => (');

if (triggerIdx !== -1 && emailIdx !== -1) {
  const newBlock = `
  const renderUploadStep = () => (
    <div className="space-y-6">
      <div 
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const f = e.dataTransfer.files[0];
            setUploadedFile({
              name: f.name,
              size: (f.size / 1024 / 1024).toFixed(2) + " MB",
              type: f.name.endsWith('.pdf') ? 'PDF' : 'DOC',
              pages: 1,
              file: f
            });
          }
        }}
        className={cn(
          "flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center p-8 transition-all duration-300",
          dragging 
            ? "border-[#0D9F8C] bg-[#effcf7]/50" 
            : uploadedFile 
              ? "border-[#0D9F8C]/60 bg-emerald-50/10" 
              : "border-slate-200 bg-[#F7FAF8]/40 hover:bg-[#F7FAF8]"
        )}
      >
        {uploadedFile ? (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-b from-[#effcf7] to-[#ffffff] text-[#0D9F8C] border border-emerald-100 shadow-sm">
              <FileCheck2 className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#081B2E]">{uploadedFile.name}</h3>
              <p className="text-xs text-slate-400 font-bold mt-1.5">{uploadedFile.size} • {uploadedFile.pages} Pages • {uploadedFile.type} Document</p>
            </div>
            <div className="flex justify-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setUploadedFile(null)} 
                className="h-9 rounded-xl border-slate-200 text-slate-500 font-bold text-xs"
              >
                Change Document
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx"
            />
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-[#0D9F8C] border border-emerald-100 animate-pulse">
              <UploadCloud className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-[#081B2E]">Drop PDF here</h2>
              <p className="mt-1 text-xs text-slate-400 font-semibold max-w-sm mx-auto leading-relaxed">
                Drag and drop your legal briefs, personal declaration packets, or visa templates up to 10MB here.
              </p>
            </div>
            <div>
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                className="rounded-xl bg-[#0D9F8C] font-bold shadow-md hover:bg-[#0A5B52]"
              >
                Choose File
              </Button>
            </div>
          </div>
        )}
      </div>

      {!uploadedFile && (
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Simulate Office Template Selection</div>
          <div className="grid gap-3 sm:grid-cols-3">
            {mockUploadOptions.map((opt) => (
              <button
                key={opt.name}
                onClick={() => setUploadedFile(opt)}
                className="group border border-slate-200/60 rounded-xl bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm hover:border-[#0D9F8C]/50"
              >
                <div className="text-xs font-bold text-[#081b36] group-hover:text-[#0D9F8C] transition-colors truncate">{opt.name}</div>
                <div className="text-[10px] text-slate-400 font-bold mt-1.5">{opt.size} • {opt.pages} pages</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button 
          disabled={!uploadedFile}
          onClick={() => setCurrentStep(1)} 
          className="rounded-xl bg-[#0D9F8C] font-bold px-6 shadow-md hover:bg-[#0A5B52] disabled:opacity-40 disabled:hover:bg-[#0D9F8C]"
        >
          Assign Signers <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )

  const renderSignersStep = () => (
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

  let currentBraces = 0;
  let inBlock = false;
  let endTriggerIdx = -1;
  for (let i = triggerIdx; i < emailIdx; i++) {
    if (code[i] === '{') {
      inBlock = true;
      currentBraces++;
    } else if (code[i] === '}') {
      currentBraces--;
      if (inBlock && currentBraces === 0) {
        endTriggerIdx = i + 1;
        break;
      }
    }
  }

  if (endTriggerIdx !== -1) {
    code = code.substring(0, endTriggerIdx) + '\n\n' + newBlock + '\n\n' + code.substring(emailIdx);
    fs.writeFileSync('src/features/documents/components/SendDocumentPage.tsx', code);
    console.log('Fixed file perfectly!');
  } else {
    console.log('Could not parse end of triggerDispatch');
  }
} else {
  console.log('Could not find triggerIdx or emailIdx');
}
