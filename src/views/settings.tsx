'use client';

import { useStore, exportData as storeExportData, importData as storeImportData, resetData as storeResetData } from '@/lib/store';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useState, useRef } from 'react';
import { User, Palette, Database, Info, Bot, Download, Upload, Trash2, Save, Sun, Moon, Monitor } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsView() {
  const { profile, updateProfile } = useStore();
  const { theme, setTheme } = useTheme();
  const [localProfile, setLocalProfile] = useState(profile);
  const [resetText, setResetText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
    reader.readAsText(file);
    e.target.value = '';
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
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your profile, appearance, and data</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Profile</CardTitle>
          <CardDescription>Your academic information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={localProfile.name} onChange={(e) => setLocalProfile({ ...localProfile, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester">Semester</Label>
              <Input id="semester" type="number" min={1} max={12} value={localProfile.semester} onChange={(e) => setLocalProfile({ ...localProfile, semester: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <Input id="branch" placeholder="e.g. Computer Science" value={localProfile.branch} onChange={(e) => setLocalProfile({ ...localProfile, branch: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="college">College</Label>
              <Input id="college" placeholder="Your college name" value={localProfile.college} onChange={(e) => setLocalProfile({ ...localProfile, college: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetCGPA">Target CGPA</Label>
              <Input id="targetCGPA" type="number" min={0} max={10} step={0.1} value={localProfile.targetCGPA} onChange={(e) => setLocalProfile({ ...localProfile, targetCGPA: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="threshold">Attendance Threshold (%)</Label>
              <Input id="threshold" type="number" min={0} max={100} value={localProfile.attendanceThreshold} onChange={(e) => setLocalProfile({ ...localProfile, attendanceThreshold: Number(e.target.value) })} />
            </div>
          </div>
          <Button onClick={handleSave} className="w-full sm:w-auto"><Save className="w-4 h-4 mr-2" />Save Profile</Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4" /> Appearance</CardTitle>
          <CardDescription>Customize how Delulu looks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const active = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors min-h-[80px] justify-center ${
                    active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Database className="w-4 h-4" /> Data Management</CardTitle>
          <CardDescription>Export, import, or reset your data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={handleExport} className="flex-1"><Download className="w-4 h-4 mr-2" />Export JSON Backup</Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1"><Upload className="w-4 h-4 mr-2" />Import Backup</Button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
          <Separator />
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Reset all data to defaults. This cannot be undone.</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto"><Trash2 className="w-4 h-4 mr-2" />Reset All Data</Button>
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
          </div>
        </CardContent>
      </Card>

      {/* AI Tutor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Bot className="w-4 h-4" /> AI Tutor</CardTitle>
          <CardDescription>Configure the optional AI assistant</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">AI Tutor is an optional feature. The app works fully offline without it.</p>
          <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground">AI Tutor uses the built-in LLM skill. No API key configuration needed — it works out of the box when online.</p>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Info className="w-4 h-4" /> About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">App</span>
            <span className="text-sm font-medium">Delulu 4.0</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Version</span>
            <span className="text-sm font-medium">4.0.0</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Data Storage</span>
            <span className="text-sm font-medium">Local (your device only)</span>
          </div>
          <Separator className="my-2" />
          <p className="text-xs text-muted-foreground">An Academic Operating System for serious students. Fun brand. Serious product.</p>
        </CardContent>
      </Card>
    </div>
  );
}