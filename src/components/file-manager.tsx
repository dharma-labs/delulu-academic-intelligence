'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useStore } from '@/lib/store';
import {
  putFileBlob,
  getFileBlob,
  deleteFileBlob,
  classifyFile,
  formatBytes,
} from '@/lib/file-store';
import type { UserFile, UserFolder } from '@/lib/types';
import {
  Folder,
  FolderOpen,
  FileText,
  File as FileIcon,
  ImageIcon,
  Video,
  Music,
  Plus,
  Upload,
  Download,
  Trash2,
  Pencil,
  FolderInput,
  ChevronRight,
  ChevronLeft,
  Search,
  MoreVertical,
  X,
} from 'lucide-react';

type NameDialogState =
  | { mode: 'new-folder' }
  | { mode: 'rename-folder'; id: string; current: string }
  | { mode: 'rename-file'; id: string; current: string }
  | null;

type MoveDialogState =
  | { kind: 'file'; id: string }
  | { kind: 'folder'; id: string }
  | null;

export function FileManager() {
  const {
    fileFolders,
    userFiles,
    addFolder,
    renameFolder,
    deleteFolder,
    moveFolder,
    addFile,
    renameFile,
    deleteFile,
    moveFile,
    subjects,
  } = useStore();

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [nameDialog, setNameDialog] = useState<NameDialogState>(null);
  const [nameValue, setNameValue] = useState('');
  const [moveDialog, setMoveDialog] = useState<MoveDialogState>(null);
  const [preview, setPreview] = useState<{ file: UserFile; url: string } | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Breadcrumb path
  const breadcrumb = useMemo(() => {
    const path: { id: string | null; name: string }[] = [];
    let cur = currentFolderId;
    while (cur) {
      const folder = fileFolders.find((f) => f.id === cur);
      if (!folder) break;
      path.unshift({ id: folder.id, name: folder.name });
      cur = folder.parentId;
    }
    path.unshift({ id: null, name: 'My Files' });
    return path;
  }, [currentFolderId, fileFolders]);

  // Items in current folder
  const foldersHere = useMemo(
    () => fileFolders.filter((f) => f.parentId === currentFolderId),
    [fileFolders, currentFolderId]
  );
  const filesHere = useMemo(
    () => userFiles.filter((f) => f.folderId === currentFolderId),
    [userFiles, currentFolderId]
  );

  // Search across everything
  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return {
      folders: fileFolders.filter((f) => f.name.toLowerCase().includes(q)),
      files: userFiles.filter((f) => f.name.toLowerCase().includes(q)),
    };
  }, [search, fileFolders, userFiles]);

  const folderName = useCallback(
    (id: string | null) =>
      id === null ? 'My Files' : fileFolders.find((f) => f.id === id)?.name ?? '?',
    [fileFolders]
  );

  // Duplicate check (case-insensitive within same parent)
  const isDuplicateName = useCallback(
    (name: string, parentId: string | null, excludeId?: string) => {
      const lower = name.toLowerCase();
      const folderClash = fileFolders.some(
        (f) =>
          f.parentId === parentId &&
          f.id !== excludeId &&
          f.name.toLowerCase() === lower
      );
      const fileClash = userFiles.some(
        (f) =>
          f.folderId === parentId &&
          f.id !== excludeId &&
          f.name.toLowerCase() === lower
      );
      return folderClash || fileClash;
    },
    [fileFolders, userFiles]
  );

  // ── Actions ──

  const handleCreateFolder = () => {
    const name = nameValue.trim();
    if (!name) return;
    if (isDuplicateName(name, currentFolderId)) return;
    addFolder({ name, parentId: currentFolderId });
    setNameDialog(null);
    setNameValue('');
  };

  const handleRename = () => {
    if (!nameDialog) return;
    const name = nameValue.trim();
    if (!name) return;
    if (nameDialog.mode === 'new-folder') return handleCreateFolder();
    const excludeId = nameDialog.id;
    if (isDuplicateName(name, currentFolderId, excludeId)) return;
    if (nameDialog.mode === 'rename-folder') renameFolder(nameDialog.id, name);
    if (nameDialog.mode === 'rename-file') renameFile(nameDialog.id, name);
    setNameDialog(null);
    setNameValue('');
  };

  const openNameDialog = (state: NameDialogState) => {
    setNameDialog(state);
    setNameValue(state && state.mode !== 'new-folder' ? state.current : '');
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    try {
      for (const f of Array.from(fileList)) {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const kind = classifyFile(f.type, f.name);
        await putFileBlob(id, f);
        addFile({
          name: f.name,
          folderId: currentFolderId,
          kind,
          mimeType: f.type || 'application/octet-stream',
          sizeBytes: f.size,
          blobRef: id,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async (file: UserFile) => {
    const blob = await getFileBlob(file.blobRef);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const handlePreview = async (file: UserFile) => {
    if (file.kind !== 'image' && file.kind !== 'pdf') return;
    const blob = await getFileBlob(file.blobRef);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setPreview({ file, url });
  };

  const handleDeleteFile = async (file: UserFile) => {
    if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) return;
    await deleteFileBlob(file.blobRef);
    deleteFile(file.id);
    setMenuOpenId(null);
  };

  const handleDeleteFolder = async (folder: UserFolder) => {
    if (!confirm(`Delete folder "${folder.name}" and everything inside it?`)) return;
    // Collect file ids that will vanish so blobs can be cleaned
    const doomed = new Set<string>([folder.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const f of fileFolders) {
        if (f.parentId && doomed.has(f.parentId) && !doomed.has(f.id)) {
          doomed.add(f.id);
          changed = true;
        }
      }
    }
    const doomedFiles = userFiles.filter(
      (f) => f.folderId !== null && doomed.has(f.folderId)
    );
    deleteFolder(folder.id);
    for (const df of doomedFiles) {
      await deleteFileBlob(df.blobRef);
    }
    setMenuOpenId(null);
  };

  const kindIcon = (kind: UserFile['kind']) => {
    switch (kind) {
      case 'image': return <ImageIcon className="h-5 w-5 text-emerald-500" />;
      case 'pdf': return <FileText className="h-5 w-5 text-red-400" />;
      case 'video': return <Video className="h-5 w-5 text-purple-500" />;
      case 'audio': return <Music className="h-5 w-5 text-blue-500" />;
      case 'document': return <FileText className="h-5 w-5 text-amber-500" />;
      default: return <FileIcon className="h-5 w-5 text-slate-400" />;
    }
  };

  const displayItems = searchResults
    ? [
        ...searchResults.folders.map((f) => ({ type: 'folder' as const, data: f })),
        ...searchResults.files.map((f) => ({ type: 'file' as const, data: f })),
      ]
    : [
        ...foldersHere.map((f) => ({ type: 'folder' as const, data: f })),
        ...filesHere.map((f) => ({ type: 'file' as const, data: f })),
      ];

  // Quick-create folders from subjects on first open of root
  const createSubjectFolders = () => {
    for (const s of subjects.filter((x) => !x.archived)) {
      const exists = fileFolders.some(
        (f) => f.name.toLowerCase() === s.name.toLowerCase() && f.parentId === null
      );
      if (!exists) addFolder({ name: s.name, parentId: null });
    }
  };

  return (
    <div className="fab-content-pad space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold tracking-tight">Files</h1>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            multiple
            className="hidden"
            id="delulu-file-upload"
            onChange={(e) => {
              handleUpload(e.target.files);
              e.target.value = '';
            }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => document.getElementById('delulu-file-upload')?.click()}
            disabled={busy}
          >
            <Upload className="size-3.5 mr-1.5" />
            {busy ? 'Uploading…' : 'Upload'}
          </Button>
          <Button size="sm" onClick={() => openNameDialog({ mode: 'new-folder' })}>
            <Plus className="size-3.5 mr-1.5" />Folder
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs flex-wrap">
        {breadcrumb.map((b, i) => (
          <span key={b.id ?? 'root'} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            <button
              onClick={() => setCurrentFolderId(b.id)}
              className={`hover:text-foreground ${i === breadcrumb.length - 1 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
            >
              {b.name}
            </button>
          </span>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search all files and folders…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      {displayItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <FolderOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium">
            {search ? 'No results' : 'This folder is empty'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {search
              ? 'Try a different search term'
              : 'Upload screenshots, PDFs, notes — anything you need'}
          </p>
          {!search && currentFolderId === null && subjects.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={createSubjectFolders}
            >
              <Plus className="size-3.5 mr-1.5" />
              Create folders for my subjects
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {displayItems.map(({ type, data }) => {
            const isFolder = type === 'folder';
            const item = data as UserFolder & UserFile;
            const isOpen = menuOpenId === item.id;
            return (
              <div
                key={`${type}-${item.id}`}
                className="group relative rounded-lg border border-border bg-card p-3 hover:border-primary/40 transition-colors"
              >
                {/* Main click target */}
                <button
                  className="w-full text-left"
                  onClick={() => {
                    if (isFolder) {
                      setCurrentFolderId(item.id);
                      setSearch('');
                    } else if ((item as UserFile).kind === 'image' || (item as UserFile).kind === 'pdf') {
                      handlePreview(item as UserFile);
                    }
                  }}
                  onDoubleClick={() => !isFolder && handleDownload(item as UserFile)}
                >
                  <div className="flex items-start justify-between">
                    {isFolder ? (
                      <Folder className="h-9 w-9 text-amber-400/90" />
                    ) : (
                      kindIcon((item as UserFile).kind)
                    )}
                  </div>
                  <p className="mt-2 text-xs font-medium truncate" title={item.name}>
                    {item.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {isFolder
                      ? `${fileFolders.filter((f) => f.parentId === item.id).length + userFiles.filter((f) => f.folderId === item.id).length} items`
                      : `${formatBytes((item as UserFile).sizeBytes)} · ${new Date((item as UserFile).createdAt).toLocaleDateString()}`}
                  </p>
                </button>

                {/* Menu button */}
                <button
                  className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  onClick={() => setMenuOpenId(isOpen ? null : item.id)}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {isOpen && (
                  <div className="absolute z-20 top-7 right-1.5 w-44 rounded-md border border-border bg-popover shadow-lg py-1 text-xs">
                    {isFolder ? (
                      <>
                        <MenuBtn
                          icon={<Pencil className="h-3.5 w-3.5" />}
                          label="Rename"
                          onClick={() => openNameDialog({ mode: 'rename-folder', id: item.id, current: item.name })}
                        />
                        <MenuBtn
                          icon={<FolderInput className="h-3.5 w-3.5" />}
                          label="Move"
                          onClick={() => { setMoveDialog({ kind: 'folder', id: item.id }); setMenuOpenId(null); }}
                        />
                        <MenuBtn
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                          label="Delete"
                          danger
                          onClick={() => handleDeleteFolder(item as UserFolder)}
                        />
                      </>
                    ) : (
                      <>
                        {((item as UserFile).kind === 'image' || (item as UserFile).kind === 'pdf') && (
                          <MenuBtn
                            icon={<ImageIcon className="h-3.5 w-3.5" />}
                            label="Open"
                            onClick={() => { handlePreview(item as UserFile); setMenuOpenId(null); }}
                          />
                        )}
                        <MenuBtn
                          icon={<Download className="h-3.5 w-3.5" />}
                          label="Download"
                          onClick={() => { handleDownload(item as UserFile); setMenuOpenId(null); }}
                        />
                        <MenuBtn
                          icon={<Pencil className="h-3.5 w-3.5" />}
                          label="Rename"
                          onClick={() => openNameDialog({ mode: 'rename-file', id: item.id, current: item.name })}
                        />
                        <MenuBtn
                          icon={<FolderInput className="h-3.5 w-3.5" />}
                          label="Move to folder"
                          onClick={() => { setMoveDialog({ kind: 'file', id: item.id }); setMenuOpenId(null); }}
                        />
                        <MenuBtn
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                          label="Delete"
                          danger
                          onClick={() => handleDeleteFile(item as UserFile)}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Name dialog (create folder / rename) */}
      <Dialog open={nameDialog !== null} onOpenChange={(o) => !o && setNameDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {nameDialog?.mode === 'new-folder'
                ? 'New Folder'
                : nameDialog?.mode === 'rename-folder'
                  ? 'Rename Folder'
                  : 'Rename File'}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            placeholder="Enter name…"
            autoFocus
          />
          {nameValue.trim() && isDuplicateName(nameValue.trim(), currentFolderId, nameDialog && nameDialog.mode !== 'new-folder' ? nameDialog.id : undefined) && (
            <p className="text-xs text-destructive">An item with this name already exists here.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNameDialog(null)}>Cancel</Button>
            <Button onClick={handleRename} disabled={!nameValue.trim()}>
              {nameDialog?.mode === 'new-folder' ? 'Create' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move dialog */}
      <MoveDialog
        state={moveDialog}
        folders={fileFolders}
        onClose={() => setMoveDialog(null)}
        folderName={folderName}
        onMove={(id, kind, target) => {
          if (kind === 'file') moveFile(id, target);
          else moveFolder(id, target);
          setMoveDialog(null);
        }}
      />

      {/* Preview modal */}
      <Dialog open={preview !== null} onOpenChange={(o) => { if (!o && preview) { URL.revokeObjectURL(preview.url); setPreview(null); } }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">{preview?.file.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto rounded-md bg-black/20 min-h-[40vh]">
            {preview?.file.kind === 'image' && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt={preview.file.name} className="max-w-full max-h-[65vh] mx-auto object-contain" />
            )}
            {preview?.file.kind === 'pdf' && (
              <iframe src={preview.url} title={preview.file.name} className="w-full h-[65vh]" />
            )}
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              {preview ? formatBytes(preview.file.sizeBytes) : ''}
            </span>
            <div className="flex gap-2">
              {preview && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { handleDownload(preview.file); }}
                >
                  <Download className="size-3.5 mr-1.5" />Download
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => { if (preview) { URL.revokeObjectURL(preview.url); setPreview(null); } }}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MenuBtn({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full px-3 py-1.5 hover:bg-muted/60 text-left ${
        danger ? 'text-destructive' : ''
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MoveDialog({
  state,
  folders,
  onClose,
  onMove,
  folderName,
}: {
  state: MoveDialogState;
  folders: UserFolder[];
  onClose: () => void;
  onMove: (id: string, kind: 'file' | 'folder', target: string | null) => void;
  folderName: (id: string | null) => string;
}) {
  const [target, setTarget] = useState<string | null>(null);
  // Reset target when dialog opens
  const [lastState, setLastState] = useState<MoveDialogState>(null);
  if (state !== lastState) {
    setLastState(state);
    setTarget(null);
  }

  // Folder options exclude the item itself and its descendants (for folders)
  const options = useMemo(() => {
    if (!state) return [];
    let exclude = new Set<string>();
    if (state.kind === 'folder') {
      exclude = new Set([state.id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const f of folders) {
          if (f.parentId && exclude.has(f.parentId) && !exclude.has(f.id)) {
            exclude.add(f.id);
            changed = true;
          }
        }
      }
    }
    return folders.filter((f) => !exclude.has(f.id));
  }, [state, folders]);

  return (
    <Dialog open={state !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Move to folder</DialogTitle>
        </DialogHeader>
        <div className="max-h-64 overflow-auto rounded-md border border-border divide-y divide-border">
          <button
            className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/60 flex items-center gap-2 ${target === null ? 'bg-muted' : ''}`}
            onClick={() => setTarget(null)}
          >
            <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
            My Files (root)
          </button>
          {options.map((f) => (
            <button
              key={f.id}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/60 flex items-center gap-2 ${target === f.id ? 'bg-muted' : ''}`}
              onClick={() => setTarget(f.id)}
            >
              <Folder className="h-3.5 w-3.5 text-amber-400" />
              {f.name}
              <span className="ml-auto text-[10px] text-muted-foreground">
                {f.parentId ? `in ${folderName(f.parentId)}` : ''}
              </span>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={state === null}
            onClick={() => state && onMove(state.id, state.kind, target)}
          >
            Move here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default FileManager;
