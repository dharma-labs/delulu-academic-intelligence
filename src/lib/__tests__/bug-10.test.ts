import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/lib/store';

describe('#10 delete cascades', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState(useStore.getInitialState(), true);
  });

  it('deleteSubject also removes its re-evaluation requests', () => {
    const id = 'subj-x';
    useStore.setState({
      reEvalRequests: [{ id: 'r1', subjectId: id } as any, { id: 'r2', subjectId: 'other' } as any],
    });
    useStore.getState().deleteSubject(id);
    const left = useStore.getState().reEvalRequests;
    expect(left.map((r) => r.id)).toEqual(['r2']);
  });

  it('deleteExam also removes its PYQs', () => {
    useStore.setState({
      exams: [{ id: 'e1' } as any],
      pyqs: [{ id: 'p1', examId: 'e1' } as any, { id: 'p2', examId: 'e2' } as any],
    });
    useStore.getState().deleteExam('e1');
    const s = useStore.getState();
    expect(s.exams.map((e) => e.id)).toEqual([]);
    expect(s.pyqs.map((p) => p.id)).toEqual(['p2']);
  });

  it('deleteNote strips the id from knowledge node links', () => {
    useStore.setState({
      notes: [{ id: 'n1' } as any],
      knowledgeNodes: [
        { id: 'k1', subjectIds: [], linkedNoteIds: ['n1', 'n9'] } as any,
        { id: 'k2', subjectIds: [], linkedNoteIds: ['n9'] } as any,
      ],
    });
    useStore.getState().deleteNote('n1');
    const nodes = useStore.getState().knowledgeNodes;
    expect(nodes[0].linkedNoteIds).toEqual(['n9']);
    expect(nodes[1].linkedNoteIds).toEqual(['n9']);
  });

  it('deleteFile strips the id from knowledge node links', () => {
    useStore.setState({
      userFiles: [{ id: 'f1' } as any],
      knowledgeNodes: [{ id: 'k1', subjectIds: [], linkedFileIds: ['f1'] } as any],
    });
    useStore.getState().deleteFile('f1');
    expect(useStore.getState().knowledgeNodes[0].linkedFileIds).toEqual([]);
  });

  it('deleteSyllabusTopic clears the node link to it', () => {
    useStore.setState({
      syllabusUnits: [{ id: 'u1', subjectId: 's1', topics: [{ id: 't1' }] } as any],
      knowledgeNodes: [{ id: 'k1', subjectIds: [], linkedSyllabusTopicId: 't1' } as any],
    });
    useStore.getState().deleteSyllabusTopic('t1');
    expect(useStore.getState().knowledgeNodes[0].linkedSyllabusTopicId).toBeNull();
  });
});
