'use client';

import * as React from 'react';
import {
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Role, canCreate, canDelete, canEdit } from '@/features/auth/types/roles';
import { Button } from '@/components/ui/button';
import { ImmiMateInput, ImmiMateTextarea } from '@/components/ui/immimate-form';
import { PageHeader } from '@/components/layout/PageHeader';
import { ImmiMateTable } from '@/components/ui/immimate-table';
import { ProfessionalEmptyState } from '@/components/ui/professional-empty-state';
import { TableSkeleton } from '@/components/ui/skeletons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  content: { html?: string } | null;
  created_at: string;
  updated_at: string;
};

export function TemplatesPage() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role || 'Read-only staff') as Role;
  const canWrite = canCreate(role, 'templates');
  const canModify = canEdit(role, 'templates');
  const canRemove = canDelete(role, 'templates');

  const [templates, setTemplates] = React.useState<TemplateRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const pageSize = 10;
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TemplateRow | null>(null);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [html, setHtml] = React.useState('<h1>{{client_name}}</h1><p>{{fee_amount}}</p>');
  const [previewHtml, setPreviewHtml] = React.useState('');
  const [previewTemplate, setPreviewTemplate] = React.useState<TemplateRow | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const loadTemplates = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        sort: 'updated_at',
        direction: 'desc',
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetch(`/api/templates?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load templates');
      setTemplates(data.data || data.templates || []);
      setTotalCount(data.count ?? (data.data || []).length);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  React.useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const openNew = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setHtml('<h1>{{client_name}}</h1><p>{{fee_amount}}</p>');
    setEditorOpen(true);
  };

  const openEdit = (t: TemplateRow) => {
    setEditing(t);
    setName(t.name);
    setDescription(t.description || '');
    setHtml(t.content?.html || '<p></p>');
    setEditorOpen(true);
  };

  const saveTemplate = async () => {
    const payload = {
      name,
      description,
      content: { html },
    };

    const res = editing
      ? await fetch(`/api/templates/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Save failed');
    setEditorOpen(false);
    await loadTemplates();
  };

  const duplicateTemplate = async (t: TemplateRow) => {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${t.name} (Copy)`,
        description: t.description,
        content: t.content,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Duplicate failed');
      return;
    }
    await loadTemplates();
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Delete failed');
      return;
    }
    await loadTemplates();
  };

  const columns = [
    {
      key: 'name',
      header: 'Template',
      render: (t: TemplateRow) => (
        <div>
          <div className="font-semibold text-[#111111]">{t.name}</div>
          <div className="mt-0.5 text-xs text-[#5C5C5C] truncate max-w-md">
            {t.description || 'No description'}
          </div>
        </div>
      ),
    },
    {
      key: 'updated_at',
      header: 'Updated',
      className: 'text-[#5C5C5C] text-xs',
      render: (t: TemplateRow) =>
        new Date(t.updated_at).toLocaleDateString('en-AU', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Templates"
        title="Agreement templates"
        description="Stored in your agency workspace. Changes persist across sessions."
        action={
          canWrite ? (
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" /> New template
            </Button>
          ) : undefined
        }
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <ImmiMateInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search templates…"
        className="max-w-sm"
      />

      {loading ? (
        <TableSkeleton rows={4} cols={2} />
      ) : templates.length === 0 ? (
        <ProfessionalEmptyState
          title="No templates yet"
          description={canWrite ? 'Create your first agreement template to standardise client engagements.' : 'No templates are available in this workspace.'}
          action={
            canWrite ? (
              <Button onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" /> New template
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ImmiMateTable
          columns={columns}
          data={templates}
          rowKey={(t) => t.id}
          page={page}
          pageSize={pageSize}
          total={totalCount}
          onPageChange={setPage}
          rowActions={(t) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setPreviewTemplate(t);
                    setPreviewHtml(t.content?.html || '');
                    setPreviewOpen(true);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" /> Preview
                </DropdownMenuItem>
                {canModify && (
                  <DropdownMenuItem onClick={() => openEdit(t)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                )}
                {canWrite && (
                  <DropdownMenuItem onClick={() => duplicateTemplate(t)}>
                    <Copy className="mr-2 h-4 w-4" /> Duplicate
                  </DropdownMenuItem>
                )}
                {canRemove && (
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => deleteTemplate(t.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl rounded-xl border-[#E7E7E7] bg-white">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit template' : 'New template'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <label className="grid gap-2 text-xs font-semibold text-[#5C5C5C]">
              Name
              <ImmiMateInput value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="grid gap-2 text-xs font-semibold text-[#5C5C5C]">
              Description
              <ImmiMateInput value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <label className="grid gap-2 text-xs font-semibold text-[#5C5C5C]">
              HTML content
              <ImmiMateTextarea
                className="min-h-[200px] font-mono text-xs"
                value={html}
                onChange={(e) => setHtml(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
              <Button onClick={() => void saveTemplate().catch((e) => alert(e.message))}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl rounded-xl border-[#E7E7E7] bg-white">
          <DialogHeader>
            <DialogTitle>
              {previewTemplate?.name || 'Preview'}
            </DialogTitle>
          </DialogHeader>
          <div
            className="prose prose-sm max-w-none rounded-xl border border-[#E7E7E7] bg-white p-6"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
