'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore } from '@/lib/store';
import {
  Users,
  Plus,
  Trophy,
  Music,
  BookOpen,
  Heart,
  Dumbbell,
  Hash,
  Calendar,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import type { Society } from '@/lib/types';

const CATEGORY_CONFIG: Record<
  Society['category'],
  { label: string; color: string; icon: React.ReactNode }
> = {
  cultural: { label: 'Cultural', color: 'bg-purple-100 text-purple-700', icon: <Music className="h-3.5 w-3.5" /> },
  sports: { label: 'Sports', color: 'bg-blue-100 text-blue-700', icon: <Dumbbell className="h-3.5 w-3.5" /> },
  academic: { label: 'Academic', color: 'bg-emerald-100 text-emerald-700', icon: <BookOpen className="h-3.5 w-3.5" /> },
  social: { label: 'Social', color: 'bg-amber-100 text-amber-700', icon: <Heart className="h-3.5 w-3.5" /> },
  other: { label: 'Other', color: 'bg-slate-100 text-slate-700', icon: <Hash className="h-3.5 w-3.5" /> },
};

export function SocietyTracker() {
  const { societies, addSociety, updateSociety, removeSociety } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    role: 'Member',
    category: 'cultural' as Society['category'],
    startDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const active = useMemo(() => societies.filter((s) => s.active), [societies]);
  const inactive = useMemo(() => societies.filter((s) => !s.active), [societies]);

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addSociety({
      name: form.name.trim(),
      role: form.role,
      category: form.category,
      startDate: form.startDate,
      active: true,
      notes: form.notes || undefined,
    });
    setForm({ name: '', role: 'Member', category: 'cultural', startDate: new Date().toISOString().split('T')[0], notes: '' });
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold">Societies &amp; ECA</h3>
          <Badge variant="secondary" className="text-xs">{active.length} active</Badge>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
              <Plus className="h-3 w-3" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Society / Activity</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Input
                placeholder="Society name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <Input
                placeholder="Role (e.g. Member, Secretary)"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              />
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v as Society['category'] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
              <Input
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={!form.name.trim()}>
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active societies */}
      {active.length === 0 && inactive.length === 0 && (
        <p className="text-xs text-muted-foreground py-4 text-center">
          No societies yet. Add your first one!
        </p>
      )}

      <div className="space-y-2">
        {active.map((s) => (
          <SocietyCard
            key={s.id}
            society={s}
            onToggle={() => updateSociety(s.id, { active: !s.active })}
            onRemove={() => removeSociety(s.id)}
          />
        ))}
        {inactive.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground pt-2">Inactive</p>
            {inactive.map((s) => (
              <SocietyCard
                key={s.id}
                society={s}
                onToggle={() => updateSociety(s.id, { active: !s.active })}
                onRemove={() => removeSociety(s.id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function SocietyCard({
  society,
  onToggle,
  onRemove,
}: {
  society: Society;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const cfg = CATEGORY_CONFIG[society.category];
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 ${cfg.color}`}>
          {cfg.label}
        </Badge>
        <div className="min-w-0">
          <span className="font-medium truncate block">{society.name}</span>
          <span className="text-xs text-muted-foreground">{society.role}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onToggle} className="text-muted-foreground hover:text-foreground">
          {society.active ? (
            <ToggleRight className="h-4 w-4 text-emerald-500" />
          ) : (
            <ToggleLeft className="h-4 w-4" />
          )}
        </button>
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive text-xs">
          ×
        </button>
      </div>
    </div>
  );
}

/** Compact widget for dashboard */
export function SocietyWidget() {
  const { societies } = useStore();
  const active = societies.filter((s) => s.active).length;
  return (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-purple-500" />
      <span className="text-sm font-medium">{active}</span>
      <span className="text-xs text-muted-foreground">active societies</span>
    </div>
  );
}
