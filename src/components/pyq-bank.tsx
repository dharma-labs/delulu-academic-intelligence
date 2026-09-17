'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { loadCourses } from '@/lib/du-data-loader';
import {
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Search,
} from 'lucide-react';
import type { DUProgramme } from '@/lib/du-data-loader';

export function PyqBank() {
  const [programmes, setProgrammes] = useState<DUProgramme[]>([]);
  const [expandedSem, setExpandedSem] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCourses().then((d) => {
      if (d?.programmes) setProgrammes(d.programmes);
    });
  }, []);

  const filteredPapers = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const results: Array<{ programme: string; semester: number; name: string; upcCode?: string }> = [];
    for (const prog of programmes) {
      for (const sem of prog.semesters) {
        for (const paper of sem.papers) {
          if (
            paper.name.toLowerCase().includes(q) ||
            (paper.upcCode && paper.upcCode.includes(q))
          ) {
            results.push({
              programme: prog.name,
              semester: sem.semester,
              name: paper.name,
              upcCode: paper.upcCode ?? undefined,
            });
          }
        }
      }
    }
    return results;
  }, [programmes, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-blue-500" />
        <h3 className="text-sm font-semibold">PYQ Bank</h3>
        <Badge variant="secondary" className="text-xs">
          {programmes.reduce((a, p) => a + p.semesters.reduce((b, s) => b + s.papers.length, 0), 0)} papers
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by paper name or UPC code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border bg-background px-8 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Search results */}
      {filteredPapers && (
        <div className="space-y-1">
          {filteredPapers.length === 0 && (
            <p className="text-xs text-muted-foreground py-2 text-center">No papers found</p>
          )}
          {filteredPapers.slice(0, 20).map((p, i) => (
            <PaperRow
              key={i}
              name={p.name}
              upcCode={p.upcCode}
              meta={`${p.programme} · Sem ${p.semester}`}
            />
          ))}
          {filteredPapers.length > 20 && (
            <p className="text-xs text-muted-foreground text-center">
              +{filteredPapers.length - 20} more results
            </p>
          )}
        </div>
      )}

      {/* Browse by programme/semester */}
      {!filteredPapers &&
        programmes.map((prog) => (
          <div key={prog.code} className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {prog.name}
            </p>
            {prog.semesters.map((sem) => {
              const key = `${prog.code}-${sem.semester}`;
              const isExpanded = expandedSem === key;
              return (
                <div key={key}>
                  <button
                    onClick={() => setExpandedSem(isExpanded ? undefined : key)}
                    className="flex items-center gap-1.5 w-full text-left text-sm py-1 hover:bg-muted/50 rounded px-1"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                    <span className="font-medium">Semester {sem.semester}</span>
                    <Badge variant="outline" className="text-[10px] ml-auto">
                      {sem.papers.length}
                    </Badge>
                  </button>
                  {isExpanded && (
                    <div className="ml-5 space-y-1 py-1">
                      {sem.papers.map((paper) => (
                        <PaperRow
                          key={paper.upcCode ?? paper.name}
                          name={paper.name}
                          upcCode={paper.upcCode ?? undefined}
                          verified={paper.verified}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
    </div>
  );
}

function PaperRow({
  name,
  upcCode,
  meta,
  verified,
}: {
  name: string;
  upcCode?: string;
  meta?: string;
  verified?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs py-1 px-2 rounded hover:bg-muted/30">
      <div className="min-w-0">
        <span className="font-medium truncate block">{name}</span>
        {meta && <span className="text-muted-foreground">{meta}</span>}
        {upcCode && (
          <span className="text-muted-foreground ml-1 font-mono">
            {upcCode}
            {verified && <span className="text-emerald-500 ml-0.5">✓</span>}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <a
          href="https://exam.du.ac.in/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
