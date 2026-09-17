import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/lib/store';

describe('#7 file metadata', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState(useStore.getInitialState(), true);
  });

  it('export -> import round-trips folders and files', () => {
    const s = () => useStore.getState();
    s().addFolder({ name: 'Sem 3', parentId: null });
    s().addFile({
      name: 'notes.pdf', folderId: null, kind: 'pdf',
      mimeType: 'application/pdf', sizeBytes: 123, blobRef: 'b1',
    });

    const json = s().exportData();
    s().resetState();
    expect(s().userFiles).toEqual([]);

    s().importData(json);
    expect(s().userFiles.map((f) => f.name)).toContain('notes.pdf');
    expect(s().fileFolders.map((f) => f.name)).toContain('Sem 3');
  });

  it('partialize writes the file keys into localStorage', () => {
    useStore.getState().addFile({
      name: 'x.png', folderId: null, kind: 'image',
      mimeType: 'image/png', sizeBytes: 1, blobRef: 'b2',
    });
    const raw = JSON.parse(localStorage.getItem('delulu-v4-data') as string);
    expect(raw.state).toHaveProperty('userFiles');
    expect(raw.state).toHaveProperty('fileFolders');
  });
});
