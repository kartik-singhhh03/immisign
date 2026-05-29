const fs = require('fs');
let content = fs.readFileSync('src/components/layout/dashboard-shell.tsx', 'utf8');
const headerStart = content.indexOf('<header className="sticky top-0 z-30');
let contentAfter = content.substring(headerStart);
const headerEnd = contentAfter.indexOf('</header>') + '</header>'.length;

const newHeader = `        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md">
          <div className="flex flex-1 items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-10 w-10 rounded-xl text-slate-500 hover:bg-slate-100"
              onClick={toggleMobileMenu}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="relative hidden w-full max-w-xl md:flex">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <button
                onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
                className="flex h-11 w-full items-center justify-between rounded-2xl border border-slate-200/50 bg-white/80 pl-11 pr-4 text-sm font-semibold text-slate-400 shadow-[0_8px_20px_rgba(8,27,46,0.02)] transition-colors hover:border-emerald-200/50 hover:bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0D9F8C]"
              >
                <span>Search agreements, clients, documents...</span>
                <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 font-mono text-[10px] font-medium text-slate-500 sm:inline-block">
                  ⌘K
                </kbd>
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <CommandPalette />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 rounded-xl border-slate-200 bg-white p-2 shadow-lg" align="end">
                <DropdownMenuLabel className="p-2">
                  <div className="text-sm font-semibold text-slate-900">Notifications</div>
                  <div className="mt-0.5 text-xs font-medium text-slate-500">Practice activity alerts</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-100" />
                {[
                  'Harpreet Kaur signed an agreement',
                  'Payment received for INV-1048',
                  'Partner Visa template updated',
                ].map((item) => (
                  <DropdownMenuItem key={item} className="rounded-lg p-2.5 cursor-pointer hover:bg-slate-50">
                    <span className="mr-3 h-1.5 w-1.5 rounded-full bg-[#0D9F8C]" />
                    <span className="text-sm font-medium text-slate-700">{item}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block"></span>
            
            <div className="hidden flex-col items-end sm:flex text-right">
              <span className="text-sm font-semibold text-slate-800">{user?.name || 'Jane Doe'}</span>
              <span className="text-[10px] font-medium text-slate-500 mt-0.5">{currentRole} Access</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full px-0 hover:bg-transparent ml-1">
                  <div 
                    className="flex h-full w-full items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ring-2 ring-white"
                    style={{ backgroundColor: currentWorkspace?.color || '#0D9F8C' }}
                  >
                    {user?.avatar || 'JD'}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-xl border-slate-200 bg-white p-2 shadow-lg" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none text-slate-900">{user?.name || 'Jane Doe'}</p>
                    <p className="text-xs font-medium text-slate-500 leading-none mt-1">
                      {user?.email || 'jane@migrationpractice.com'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem 
                  onClick={() => router.push(\`/workspace/\${currentSlug}/settings\`)}
                  className="rounded-lg cursor-pointer font-medium text-slate-700 hover:bg-slate-50 p-2 transition-colors"
                >
                  <UserIcon className="mr-2 h-4 w-4 text-slate-400" />
                  Profile Configuration
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => router.push(\`/workspace/\${currentSlug}/settings/team\`)}
                  className="rounded-lg cursor-pointer font-medium text-slate-700 hover:bg-slate-50 p-2 transition-colors"
                >
                  <Users className="mr-2 h-4 w-4 text-slate-400" />
                  Team Setup
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem 
                  onClick={handleLogoutClick}
                  className="rounded-lg cursor-pointer font-medium text-red-600 hover:bg-red-50 p-2 transition-colors"
                >
                  <LogOut className="mr-2 h-4 w-4 text-red-500" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>`;
content = content.substring(0, headerStart) + newHeader + contentAfter.substring(headerEnd);
fs.writeFileSync('src/components/layout/dashboard-shell.tsx', content);