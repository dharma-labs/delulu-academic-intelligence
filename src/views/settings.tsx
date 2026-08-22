'use client';

import { useStore, exportData as storeExportData, importData as storeImportData, resetData as storeResetData } from '@/lib/store';
import { useTheme } from 'next-themes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState, useRef } from 'react';
import { User, Palette, Database, Info, Bot, Download, Upload, Trash2, Save, Sun, Moon, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, SectionHeader, InsightCard } from '@/components/shared';
import { motion } from 'framer-motion';

export default function SettingsView() {
  const { profile, updateProfile } = useStore();
  const { theme, setTheme } = useTheme();
  const [localProfile, setLocalProfile] = useState(profile);
  const [resetText, setResetText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleSave = () => {
    updateProfile(localProfile);
    toast.success('Profile saved');
  };

  const handleExport = () => {
    const data = useStore.getState().exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delulu-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully');
  };

  const handleImportPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportDialogOpen(true);
    e.target.value = '';
  };

  const confirmImport = () => {
    if (!importFile) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = ev.target?.result as string;
        useStore.getState().importData(json);
        setLocalProfile(useStore.getState().profile);
        toast.success('Data imported successfully');
      } catch {
        toast.error('Invalid backup file');
      }
    };
    reader.readAsText(importFile);
    setImportFile(null);
    setImportDialogOpen(false);
  };

  const handleReset = () => {
    if (resetText !== 'RESET') return;
    useStore.getState().resetData();
    setLocalProfile(useStore.getState().profile);
    setResetText('');
    toast.success('All data has been reset');
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="p-4 md:p-6 content-area max-w-3xl mx-auto animate-fade-slide-in">
      <PageHeader
        title="Settings"
        subtitle="Manage your profile, appearance, and data"
      />

      {/* Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-4"
      >
        <Card className="border border-border">
          <CardContent className="p-5">
            <SectionHeader title="Profile" subtitle="Your academic information" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="space-y-1.5">
                <span className="section-label">Name</span>
                <Input
                  value={localProfile.name}
                  onChange={(e) => setLocalProfile({ ...localProfile, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <span className="section-label">Semester</span>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={localProfile.semester}
                  onChange={(e) => setLocalProfile({ ...localProfile, semester: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <span className="section-label">Branch</span>
                <Input
                  placeholder="e.g. Computer Science"
                  value={localProfile.branch}
                  onChange={(e) => setLocalProfile({ ...localProfile, branch: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <span className="section-label">College</span>
                <Input
                  placeholder="Your college name"
                  value={localProfile.college}
                  onChange={(e) => setLocalProfile({ ...localProfile, college: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <span className="section-label">Target CGPA</span>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  value={localProfile.targetCGPA}
                  onChange={(e) => setLocalProfile({ ...localProfile, targetCGPA: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <span className="section-label">Attendance Threshold (%)</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={localProfile.attendanceThreshold}
                  onChange={(e) => setLocalProfile({ ...localProfile, attendanceThreshold: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <span className="section-label">Weekly Study Goal (hours)</span>
                <Input
                  type="number"
                  min={1}
                  max={80}
                  value={localProfile.weeklyStudyGoalHours ?? 10}
                  onChange={(e) => setLocalProfile({ ...localProfile, weeklyStudyGoalHours: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="mt-5">
              <Button onClick={handleSave} size="sm">
                <Save className="w-3.5 h-3.5 mr-1.5" />Save Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Appearance Section */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="mb-4"
      >
        <Card className="border border-border">
          <CardContent className="p-5">
            <SectionHeader title="Appearance" subtitle="Customize how Delulu looks" />
            <div className="flex gap-3 mt-4">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const active = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors min-h-[72px] justify-center ${
                      active ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/25 text-muted-foreground'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Data Management Section */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mb-4"
      >
        <Card className="border border-border">
          <CardContent className="p-5">
            <SectionHeader title="Data Management" subtitle="Export, import, or reset your data" />
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <Button variant="outline" onClick={handleExport} className="flex-1" size="sm">
                <Download className="w-3.5 h-3.5 mr-1.5" />Export JSON Backup
              </Button>
              <Dialog open={importDialogOpen} onOpenChange={(open) => { setImportDialogOpen(open); if (!open) setImportFile(null); }}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1" size="sm">
                    <Upload className="w-3.5 h-3.5 mr-1.5" />Import Backup
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import Backup</DialogTitle>
                    <DialogDescription>
                      This will <strong>overwrite all existing data</strong> with the contents of {importFile?.name || 'the selected file'}. This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => { setImportDialogOpen(false); setImportFile(null); }}>Cancel</Button>
                    <Button size="sm" onClick={confirmImport} disabled={!importFile}>
                      <Upload className="w-3.5 h-3.5 mr-1.5" />Confirm Import
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportPick} />
            </div>
            <Separator className="my-4" />
            <div className="space-y-3">
              <InsightCard
                type="warning"
                icon={Trash2}
                title="Reset all data to defaults"
                description="This will permanently delete all your subjects, marks, attendance, notes, tasks, and other data."
                action={
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />Reset All Data
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all your subjects, marks, attendance, notes, tasks, and other data. Type <strong>RESET</strong> to confirm.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <Input
                        placeholder='Type "RESET" to confirm'
                        value={resetText}
                        onChange={(e) => setResetText(e.target.value)}
                        className="my-4"
                      />
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setResetText('')}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleReset}
                          disabled={resetText !== 'RESET'}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                          Reset Everything
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                }
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Tutor Section */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="mb-4"
      >
        <Card className="border border-border">
          <CardContent className="p-5">
            <SectionHeader title="AI Tutor" subtitle="Configure the optional AI assistant" />
            <div className="mt-4 space-y-2">
              <InsightCard
                type="info"
                icon={Bot}
                title="No configuration needed"
                description="AI Tutor uses the built-in LLM skill. It works out of the box when online. The app works fully offline without it."
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* About Section */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="border border-border">
          <CardContent className="p-5">
            <SectionHeader title="About" />
            <div className="mt-3 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">App</span>
                <span className="text-xs font-medium">Delulu 4.0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Version</span>
                <span className="text-xs font-medium">4.0.0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Data Storage</span>
                <span className="text-xs font-medium">Local (your device only)</span>
              </div>
              <Separator className="my-1" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                An Academic Operating System for serious students. Fun brand. Serious product.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}