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
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TemplateRow | null>(null);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [html, setHtml] = React.useState('<h1>{{client_name}}</h1><p>{{fee_amount}}</p>');
  const [previewHtml, setPreviewHtml] = React.useState('');
  const [previewTemplate, setPreviewTemplate] = React.useState<TemplateRow | null>(null);

  const loadTemplates = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load templates');
      setTemplates(data.templates || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

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

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-[#0D9F8C]">
            Templates
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#081B2E]">
            Agreement templates
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Stored in your agency workspace on Supabase. Changes persist across sessions.
          </p>
        </div>
        {canWrite && (
          <Button
            onClick={openNew}
            className="h-11 rounded-xl bg-[#0D9F8C] font-bold hover:bg-[#0A5B52]"
          >
            <Plus className="mr-2 h-4 w-4" /> New template
          </Button>
        )}
      </div>

      {error && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm font-semibold text-red-700">{error}</CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-[#0D9F8C] border-t-transparent" />
        </div>
      ) : templates.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="p-10 text-center text-sm text-slate-500">
            No templates yet.{canWrite ? ' Create your first template.' : ''}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {templates.map((t) => (
            <Card key={t.id} className="rounded-2xl border-slate-200/60">
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                  <div className="font-bold text-[#081B2E]">{t.name}</div>
                  <div className="mt-1 truncate text-xs text-slate-500">
                    {t.description || 'No description'}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-xl">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setPreviewHtml(t.content?.html || '<p>Empty</p>');
                        setPreviewTemplate(t);
                        setPreviewOpen(true);
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" /> Preview
                    </DropdownMenuItem>
                    {canWrite && (
                      <DropdownMenuItem onClick={() => void duplicateTemplate(t)}>
                        <Copy className="mr-2 h-4 w-4" /> Duplicate
                      </DropdownMenuItem>
                    )}
                    {canModify && (
                      <DropdownMenuItem onClick={() => openEdit(t)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                    )}
                    {canRemove && (
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => void deleteTemplate(t.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit template' : 'New template'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <Input
              placeholder="Template name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Textarea
              className="min-h-[200px] font-mono text-xs"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-[#0D9F8C]"
                onClick={() => void saveTemplate().catch((e) => alert(e.message))}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{previewTemplate?.name || 'Preview'}</DialogTitle>
            {previewTemplate?.description && (
              <p className="text-sm text-slate-500 font-medium">{previewTemplate.description}</p>
            )}
          </DialogHeader>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Template Content</h3>
            <div
              className="prose max-w-none rounded-xl border border-slate-200 bg-slate-50/50 p-6 text-sm"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
