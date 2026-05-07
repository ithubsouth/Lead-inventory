import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Eye, Download, Trash2, FileText, Loader2 } from 'lucide-react';

const MAX_SIZE = 3 * 1024 * 1024;
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

type AssetDoc = {
  id: string;
  device_id: string;
  serial_number?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  deviceId: string;
  serialNumber: string;
}

export const AssetDocumentsDialog: React.FC<Props> = ({ open, onOpenChange, deviceId, serialNumber }) => {
  const { toast } = useToast();
  const [docs, setDocs] = useState<AssetDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [month, setMonth] = useState<string>('all');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('asset_documents')
      .select('*')
      .eq('device_id', deviceId)
      .order('uploaded_at', { ascending: false });
    if (error) toast({ title: 'Failed to load documents', description: error.message, variant: 'destructive' });
    setDocs((data as AssetDoc[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); /* eslint-disable-next-line */ }, [open, deviceId]);

  const months = useMemo(() => {
    const set = new Set<string>();
    docs.forEach(d => {
      const dt = new Date(d.uploaded_at);
      set.add(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(set).sort().reverse();
  }, [docs]);

  const filtered = useMemo(() => {
    if (month === 'all') return docs;
    return docs.filter(d => {
      const dt = new Date(d.uploaded_at);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}` === month;
    });
  }, [docs, month]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uploader = user?.email || 'system';
      for (const file of files) {
        if (!ALLOWED.includes(file.type)) {
          toast({ title: 'Unsupported file', description: `${file.name} is not PDF/JPG/PNG/WEBP`, variant: 'destructive' });
          continue;
        }
        if (file.size > MAX_SIZE) {
          toast({ title: 'File too large', description: `${file.name} exceeds 3MB`, variant: 'destructive' });
          continue;
        }
        const path = `${deviceId}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`;
        const { error: upErr } = await supabase.storage.from('asset-documents').upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (upErr) { toast({ title: 'Upload failed', description: upErr.message, variant: 'destructive' }); continue; }
        const { error: insErr } = await supabase.from('asset_documents').insert({
          device_id: deviceId,
          serial_number: serialNumber,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: uploader,
        });
        if (insErr) toast({ title: 'Save failed', description: insErr.message, variant: 'destructive' });
      }
      await load();
      toast({ title: 'Upload complete' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const sign = async (path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage.from('asset-documents').createSignedUrl(path, 60);
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return null; }
    return data.signedUrl;
  };

  const view = async (d: AssetDoc) => {
    const url = await sign(d.file_path);
    if (url) window.open(url, '_blank', 'noopener');
  };

  const download = async (d: AssetDoc) => {
    const url = await sign(d.file_path);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.download = d.file_name; document.body.appendChild(a); a.click(); a.remove();
  };

  const remove = async (d: AssetDoc) => {
    if (!confirm(`Delete ${d.file_name}?`)) return;
    const { error: sErr } = await supabase.storage.from('asset-documents').remove([d.file_path]);
    if (sErr) { toast({ title: 'Delete failed', description: sErr.message, variant: 'destructive' }); return; }
    const { error: dErr } = await supabase.from('asset_documents').delete().eq('id', d.id);
    if (dErr) { toast({ title: 'Delete failed', description: dErr.message, variant: 'destructive' }); return; }
    await load();
  };

  const fmtSize = (b: number) => b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(2)} MB`;
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-GB');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Documents — <span className="text-primary">{serialNumber}</span></DialogTitle>
          <p className="text-xs text-muted-foreground">Upload PDF or image files (max 3MB each). No limit on number of uploads.</p>
        </DialogHeader>

        <label className="block cursor-pointer rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors p-6 text-center">
          <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleUpload} disabled={uploading} />
          <div className="flex flex-col items-center gap-2">
            {uploading ? <Loader2 className="w-6 h-6 text-primary animate-spin" /> : <Upload className="w-6 h-6 text-primary" />}
            <div className="font-medium text-sm">{uploading ? 'Uploading…' : 'Click to upload files'}</div>
            <div className="text-xs text-muted-foreground">PDF, JPG, PNG, WEBP — Max 3MB each</div>
          </div>
        </label>

        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm font-medium">View Month</span>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {months.map(m => {
                const [y, mo] = m.split('-');
                const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
                return <SelectItem key={m} value={m}>{label}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="max-h-72 overflow-y-auto divide-y border rounded-lg">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground"><Loader2 className="inline w-4 h-4 animate-spin mr-2" />Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No documents</div>
          ) : filtered.map(d => (
            <div key={d.id} className="flex items-center gap-3 p-3 hover:bg-muted/50">
              <FileText className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{d.file_name}</div>
                <div className="text-xs text-muted-foreground">{fmtSize(d.file_size)} · {fmtDate(d.uploaded_at)}{d.uploaded_by ? ` · ${d.uploaded_by}` : ''}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => view(d)} title="View"><Eye className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => download(d)} title="Download"><Download className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(d)} title="Delete" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssetDocumentsDialog;
