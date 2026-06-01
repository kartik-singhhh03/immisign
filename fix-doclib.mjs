import fs from 'fs';
const lines = fs.readFileSync('monolithic-backup-utf8.tsx', 'utf8').split('\n');
const funcLines = lines.slice(2074, 2623);

const content = `\"use client\"

import * as React from \"react\"
import Link from \"next/link\"
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
} from \"lucide-react\"
import { Button } from \"@/components/ui/button\"
import { Card, CardContent } from \"@/components/ui/card\"
import { Input } from \"@/components/ui/input\"
import { cn } from \"@/lib/utils\"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from \"@/components/ui/dialog\"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from \"@/components/ui/dropdown-menu\"
import { PageHeader } from \"@/components/layout/PageHeader\"
import { StatusPill } from \"@/components/saas/dashboard-pages\"

${funcLines.join('\n')}
`;

fs.writeFileSync('src/features/documents/components/DocumentLibraryPage.tsx', content);
console.log('Fixed DocumentLibraryPage.tsx');
