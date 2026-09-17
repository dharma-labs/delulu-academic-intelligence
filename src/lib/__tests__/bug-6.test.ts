import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/lib/store';

describe('#6 reset paths', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState(useStore.getInitialState(), true);
  });

  it('restoreDemoData re-seeds (keeps files); resetState empties incl. files', () => {
    const s = () => useStore.getState();
    s().addFile({
      name: 'a.pdf', folderId: null, kind: 'pdf',
      mimeType: 'application/pdf', sizeBytes: 1, blobRef: 'b1',
    });

    s().restoreDemoData();
    expect(s().subjects.length).toBeGreaterThan(0);
    expect(s().userFiles.map((f) => f.name)).toContain('a.pdf'); // files kept

    s().resetState();
    expect(s().subjects).toEqual([]);
    expect(s().userFiles).toEqual([]);                            // file keys cleared (X-1)
    expect(s().fileFolders).toEqual([]);
    expect(localStorage.getItem('delulu-v4-data')).toBeNull();
  });
});
