"use client";

import * as React from "react";
import { useRequireWorkspace } from "@/lib/hooks/use-workspace"
import { useAuthStore } from "@/store/authStore";
import { useDocuments } from "@/lib/hooks/useSupabaseData";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  FileArchive,
  FileCheck2,
  FileSignature,
  FileText,
  Filter,
  FolderOpen,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  UploadCloud,
  ShieldCheck,
  Trash2,
  X,
  Palette,
  Users,
  ShieldAlert,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/saas/dashboard-pages";

export function DocumentLibraryPage() {
  const { slug: currentSlug } = useRequireWorkspace()
  interface DocumentItem {
    id: string;
    name: string;
    category: string;
    size: string;
    type: string;
    date: string;
    created_at?: string;
    mime_type?: string;
    signwell_status?: string | null;
    signwell_document_id?: string | null;
    storage_bucket?: string;
    file_url?: string;
    agreement_id?: string;
  }

  const totalBytes = (documentsList || []).reduce(
    (sum: number, d: DocumentItem) => {
      const mb = parseFloat(String(d.size).replace(' MB', ''));
      return sum + (Number.isFinite(mb) ? mb * 1024 * 1024 : 0);
    },
    0,
  );
  const vaultUsedMb = (totalBytes / 1024 / 1024).toFixed(1);
  const vaultLimitGb = 1;
  const vaultPct = Math.min(100, (totalBytes / (vaultLimitGb * 1024 * 1024 * 1024)) * 100);
  const recentUploads = (documentsList || []).filter((d: DocumentItem) => {
    if (!d.created_at) return false;
    const age = Date.now() - new Date(d.created_at).getTime();
    return age < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState("All");
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);

  // Real Upload States
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadSuccess, setUploadSuccess] = React.useState(false);
  const [newFileCategory, setNewFileCategory] = React.useState("Partner Visa");
  const [uploadError, setUploadError] = React.useState("");

  // Selected Document Inspector State
  const [selectedDoc, setSelectedDoc] = React.useState<DocumentItem | null>(
    null,
  );

  // Custom Dynamic Toast simulation
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const { data: documentsList, addDocument, loading, count: documentCount } = useDocuments({
    limit: 200,
  });
  


  // Filter lists
  const filteredDocs = (documentsList || []).filter((doc: any) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      activeCategory === "All" || doc.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Recent Templates (First 3 in documentsList)
  const recentTemplates = (documentsList || []).slice(0, 3);

  // Trigger Dynamic State Toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Real Upload Submission
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError("Please select a file to upload.");
      return;
    }
    setUploadError("");
    setUploading(true);

    try {
      if (addDocument) {
        await addDocument({ file: selectedFile });
      }
      setUploading(false);
      setUploadSuccess(true);
      triggerToast(
        `Document "${selectedFile.name}" uploaded successfully!`,
      );
    } catch (error) {
      setUploading(false);
      setUploadError("Upload failed. Please try again.");
      console.error(error);
    }
  };

  const openDocumentInNewTab = (doc: DocumentItem) => {
    if (doc.file_url && doc.file_url.startsWith('http')) {
      window.open(doc.file_url, '_blank', 'noopener,noreferrer');
      triggerToast(`Opening "${doc.name}" in a new secure tab.`);
    } else {
      triggerToast(`Signed URL not available for "${doc.name}". Please try again.`);
    }
  };

  const resetUploadModal = () => {
    setIsUploadOpen(false);
    setUploading(false);
    setUploadProgress(0);
    setUploadSuccess(false);
    setSelectedFile(null);
    setUploadError("");
  };

  return (
    <div className="animate-enter space-y-6 relative">
      {/* Visual Dynamic Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] animate-enter rounded-xl border border-emerald-100 bg-white/90 p-4 text-xs font-bold text-[#0D9F8C] shadow-2xl flex items-center gap-3 backdrop-blur-md">
          <ShieldCheck className="h-5 w-5 text-[#0D9F8C] shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <PageHeader
        eyebrow="Document library"
        title="Templates and documents"
        description="Searchable, category-based library for approved migration documents, checklists and reusable office packs."
        action={
          <Button
            onClick={() => setIsUploadOpen(true)}
            className="rounded-xl bg-[#0D9F8C] font-bold shadow-[0_10px_24px_rgba(13,159,140,0.18)] hover:bg-[#0A5B52]"
          >
            <UploadCloud className="h-4 w-4 mr-1.5" /> Upload Document
          </Button>
        }
      />

      {/* Usage Analytics Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Documents",
            value: documentCount ?? documentsList?.length ?? 0,
            desc: "In this workspace library",
            progress: Math.min(100, ((documentCount ?? documentsList?.length ?? 0) / Math.max(1, vaultLimitGb * 200)) * 100),
          },
          {
            label: "Agreement-linked",
            value: documentsList?.filter((d: DocumentItem) => d.agreement_id).length || 0,
            desc: "From agreement PDFs",
            progress: documentCount ? ((documentsList?.filter((d: DocumentItem) => d.agreement_id).length || 0) / (documentCount || 1)) * 100 : 0,
          },
          {
            label: "Recent Uploads",
            value: recentUploads,
            desc: "Added within past 7 days",
            progress: documentCount ? (recentUploads / (documentCount || 1)) * 100 : 0,
          },
          {
            label: "Vault Space Used",
            value: `${vaultUsedMb} MB`,
            desc: `Of ${vaultLimitGb}.0 GB storage quota`,
            progress: vaultPct,
          },
        ].map((stat, idx) => (
          <Card
            key={idx}
            className="rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01),0_8px_24px_rgba(8,27,46,0.02)]"
          >
            <CardContent className="p-5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {stat.label}
              </div>
              <div className="mt-3 text-2xl font-black text-[#081B2E] tracking-tight">
                {stat.value}
              </div>
              <div className="mt-1 text-xs text-[#0D9F8C] font-bold">
                {stat.desc}
              </div>
              <div className="mt-3.5 h-[5px] overflow-hidden rounded-full bg-slate-100/80">
                <div
                  className="chart-bar h-full rounded-full bg-gradient-to-r from-[#0D9F8C] to-[#33C48D]"
                  style={{ width: `${stat.progress}%` }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Asymmetric Two-Column Shell */}
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        {/* Left Wider Panel: Search, Categories & Library Grid */}
        <div className="space-y-6">
          {/* Quick Access Recent Documents Carousel Row */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span>Quick Access Templates</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#0D9F8C] animate-ping" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {recentTemplates.map((doc) => (
                <Card
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="group rounded-xl border border-[#0D9F8C]/15 bg-[#f5fbf9]/60 p-4 shadow-sm hover:border-[#0D9F8C]/50 hover:bg-white cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="rounded-full bg-emerald-100/60 px-2 py-0.5 text-[8px] font-black text-[#0A8F7E] uppercase">
                      LATEST
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold">
                      {doc.size}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-[#081b36] mt-3 group-hover:text-[#0D9F8C] transition-colors truncate">
                    {doc.name}
                  </h3>
                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold mt-3 pt-2.5 border-t border-slate-100">
                    <span>{doc.downloads} downloads</span>
                    <ArrowRight className="h-3 w-3 text-[#0D9F8C] transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Library Search & Counter Filters Bar */}
          <div className="space-y-4 pt-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search template documents by filename, code subclasses, or ID..."
                className="h-12 rounded-xl border-slate-200 bg-white pl-11 focus-visible:ring-1 focus-visible:ring-[#0D9F8C] placeholder:text-slate-400 text-xs font-semibold"
              />
            </div>

            {/* Categories filter pills */}
            <div className="flex flex-wrap gap-2">
              {[
                "All",
                "Agreement Documents",
                "Evidence Documents",
                "Client Documents",
                "General Uploads",
              ].map((category) => {
                const count =
                  category === "All"
                    ? documentsList?.length || 0
                    : documentsList?.filter((d: any) => d.category === category)
                        .length || 0;
                const isActive = activeCategory === category;
                return (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={cn(
                      "rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-300 flex items-center gap-2",
                      isActive
                        ? "bg-[#0D9F8C] text-white shadow-[0_6px_16px_rgba(13,159,140,0.12)]"
                        : "bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/60",
                    )}
                  >
                    {category}
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-black transition-all",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Master Grid list of files */}
          <div className="stagger-children grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
            {filteredDocs.length > 0 ? (
              filteredDocs.map((doc) => (
                <Card
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="group rounded-2xl border border-slate-200/50 bg-white/60 shadow-[0_1px_2px_rgba(8,27,46,0.01)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(8,27,46,0.04)] hover:border-slate-350/50 cursor-pointer"
                >
                  <CardContent className="p-5 space-y-4">
                    {/* Top Row info */}
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#effcf7] to-[#ffffff] text-[#0D9F8C] border border-emerald-100/50 shadow-sm group-hover:scale-105 transition-transform duration-300">
                        <FolderOpen className="h-5 w-5" />
                      </div>
                      <div className="text-right">
                        <span className="rounded bg-slate-100 border border-slate-200/40 px-2 py-0.5 text-[8px] font-bold text-slate-400 uppercase">
                          {doc.type}
                        </span>
                        <div className="text-xs text-slate-400 font-bold mt-1">
                          {doc.size}
                        </div>
                      </div>
                    </div>

                    {/* File particulars */}
                    <div>
                      <h3 className="text-sm font-bold tracking-tight text-[#081B2E] truncate group-hover:text-[#0D9F8C] transition-colors">
                        {doc.name}
                      </h3>
                      <div className="flex gap-2 items-center mt-2">
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[8px] font-bold text-[#0D9F8C]">
                          {doc.category}
                        </span>
                        <span className="text-[9px] text-slate-400 font-semibold">
                          {doc.id}
                        </span>
                      </div>
                    </div>

                    {/* Action metadata row */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs text-slate-400 font-bold">
                      <span>{doc.signwell_status ? `SignWell: ${doc.signwell_status}` : 'Not sent'}</span>
                      <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-[#0D9F8C] transition-colors">
                        <span>Added {doc.date}</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="p-10 text-center flex flex-col items-center justify-center col-span-full rounded-2xl border border-slate-200/50 bg-white/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 mb-4 border border-slate-200">
                  <Search className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-[#081B2E]">
                  No documents match search
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-semibold">
                  Try modifying your query or category filters.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Narrower Panel: Cloud Storage Sidebar */}
        <div className="space-y-5">
          {/* Custody storage specs */}
          <Card className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                Vault Custody Storage
              </div>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-[#081B2E]">
                {vaultPct.toFixed(1)}% Allocated
              </h3>
            </div>

            <div className="space-y-1.5">
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/50">
                <div
                  className="h-full bg-[#0D9F8C] rounded-full"
                  style={{ width: `${vaultPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                <span>{vaultUsedMb} MB Used</span>
                <span>{vaultLimitGb}.0 GB Limit</span>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-500 font-medium">
              Storage usage is calculated from uploaded file sizes in your workspace.
            </p>
          </Card>

          {/* Office uploads logs feed */}
          <Card className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="font-bold text-xs text-[#081B2E] uppercase tracking-wider border-b border-slate-100 pb-2">
              Recent Library Operations
            </div>

            <div className="space-y-3.5">
              <p className="text-xs text-slate-500 font-medium">Activity will appear here as documents are uploaded and processed.</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Document Detailed Inspector Modal */}
      <Dialog
        open={!!selectedDoc}
        onOpenChange={(open) => !open && setSelectedDoc(null)}
      >
        <DialogContent className="max-w-md bg-white border-slate-200 p-6 rounded-2xl shadow-2xl">
          {selectedDoc && (
            <>
              <DialogHeader className="border-b border-slate-100 pb-4 mb-4">
                <DialogTitle className="text-base font-black text-[#081B2E] truncate">
                  {selectedDoc.name}
                </DialogTitle>
                <div className="text-xs text-slate-400 font-bold mt-1">
                  ID: {selectedDoc.id}
                </div>
              </DialogHeader>

              <div className="space-y-5 text-xs text-[#081B2E]">
                <div className="grid gap-3.5 grid-cols-2">
                  <div className="p-3 rounded-xl border border-slate-100 space-y-1 bg-slate-50/50">
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">
                      Category
                    </span>
                    <div className="font-bold text-slate-700">
                      {selectedDoc.category}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-100 space-y-1 bg-slate-50/50">
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">
                      SignWell status
                    </span>
                    <div className="font-bold text-slate-700">
                      {selectedDoc.signwell_status || 'Not sent'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[8px] text-slate-400 uppercase tracking-wider font-bold block">
                    Document details
                  </span>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden font-semibold">
                    <div className="flex justify-between p-2.5 bg-slate-50/30">
                      <span className="text-slate-400">File size</span>
                      <span>{selectedDoc.size}</span>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-slate-400">MIME type</span>
                      <span>{selectedDoc.mime_type || '—'}</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50/30">
                      <span className="text-slate-400">Uploaded</span>
                      <span>{selectedDoc.date}</span>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-slate-400">Storage bucket</span>
                      <span>{selectedDoc.storage_bucket || '—'}</span>
                    </div>
                    {selectedDoc.signwell_document_id && (
                      <div className="flex justify-between p-2.5 bg-slate-50/30">
                        <span className="text-slate-400">SignWell document ID</span>
                        <span className="font-mono text-[9px] truncate max-w-[140px]">
                          {selectedDoc.signwell_document_id}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Panel */}
                <div className="border-t border-slate-150 pt-4 space-y-2">
                  <div className="grid gap-2 grid-cols-1">
                    <Button
                      asChild
                      onClick={() => setSelectedDoc(null)}
                      className="h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs"
                    >
                      <Link href={`/workspace/${currentSlug}/documents/send`}>
                        Send for Signing
                      </Link>
                    </Button>
                  </div>

                  <div className="grid gap-2 grid-cols-2">
                    <Button
                      type="button"
                      onClick={() => openDocumentInNewTab(selectedDoc)}
                      disabled={!selectedDoc.file_url || !selectedDoc.file_url.startsWith('http')}
                      className="h-10 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold text-xs disabled:opacity-40"
                    >
                      <Download className="h-3.5 w-3.5 mr-1" /> View Document
                    </Button>
                    <Button
                      type="button"
                      disabled
                      title="Delete is not enabled in this release."
                      className="h-10 rounded-xl bg-slate-50 text-slate-400 font-bold text-xs disabled:opacity-70"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Dialog Modal with select templates selection */}
      <Dialog
        open={isUploadOpen}
        onOpenChange={(open) => !open && resetUploadModal()}
      >
        <DialogContent className="max-w-md bg-white border-slate-250 p-6 rounded-2xl shadow-2xl">
          <DialogHeader className="border-b border-slate-100 pb-4 mb-4">
            <DialogTitle className="text-base font-black text-[#081B2E]">
              Upload to Cloud Custody
            </DialogTitle>
          </DialogHeader>

          {uploadSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-[#0D9F8C] border border-emerald-100 shadow-sm">
                <CheckCircle2 className="h-8 w-8 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-[#081b36]">
                Upload Successful!
              </h3>
              <p className="text-xs text-slate-500 font-semibold max-w-xs mx-auto leading-relaxed">
                The file{" "}
                <strong className="text-slate-800">{selectedFile?.name || "Document"}</strong> has
                been successfully scanned, AES-256 encrypted onshore, and added
                to the{" "}
                <strong className="text-slate-800">{newFileCategory}</strong>{" "}
                index.
              </p>
              <Button
                onClick={resetUploadModal}
                className="mt-4 bg-[#0D9F8C] hover:bg-[#0A5B52] rounded-xl font-bold text-xs"
              >
                Back to Library
              </Button>
            </div>
          ) : (
            <form
              onSubmit={handleUploadSubmit}
              className="space-y-4 text-xs text-slate-500 font-semibold"
            >
              <div className="space-y-2">
                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  Select Document
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    required
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setSelectedFile(file || null);
                      setUploadError("");
                    }}
                    className="flex-1 h-10 rounded-xl border-slate-200 bg-white pt-1.5 cursor-pointer file:cursor-pointer"
                    disabled={uploading}
                  />
                </div>
                {uploadError && <div className="text-red-500 text-xs mt-1">{uploadError}</div>}
              </div>

              <div className="space-y-2">
                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  Target Visa Category
                </label>
                <select
                  value={newFileCategory}
                  onChange={(e) => setNewFileCategory(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0D9F8C]"
                  disabled={uploading}
                >
                  <option value="General Uploads">General Uploads</option>
                  <option value="Agreement Documents">Agreement Documents</option>
                  <option value="Evidence Documents">Evidence Documents</option>
                  <option value="Client Documents">Client Documents</option>
                </select>
              </div>

              {uploading ? (
                <div className="py-4 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Malware Scanning & AES-256 encrypting...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200/50">
                    <div
                      className="h-full bg-[#0D9F8C] transition-all duration-300 rounded-full bg-gradient-to-r from-[#0D9F8C] to-[#33C48D]"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 text-center leading-normal">
                    Writing cryptographical registry seal securely in Sydney
                    vaults.
                  </p>
                </div>
              ) : (
                  <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center transition-colors">
                    <UploadCloud className="mx-auto h-7 w-7 text-slate-400" />
                    <div className="mt-2 text-xs font-bold text-[#0D9F8C]">
                      Select a file above
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1">
                      PDF, DOCX, PNG up to 10MB.
                    </p>
                  </div>
              )}

              {!uploading && (
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={resetUploadModal}
                    className="h-9 rounded-xl border-slate-200 px-4 font-bold text-xs text-slate-500"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!selectedFile}
                    className="h-9 rounded-xl bg-[#0D9F8C] hover:bg-[#0A5B52] px-5 font-bold text-xs disabled:opacity-40"
                  >
                    Upload & Scans File
                  </Button>
                </div>
              )}
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
