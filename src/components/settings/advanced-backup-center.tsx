"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  HardDrive, Cloud, Download, Save, RotateCcw, 
  Activity, Calendar, Settings, Shield, FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AdvancedBackupCenter() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isBackupRunning, setIsBackupRunning] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const { toast } = useToast();

  const backupHistory = [
    {
      id: '1',
      date: '2025-09-26 14:30',
      type: 'Full Backup',
      location: 'Local + Google Drive',
      size: '4.2 GB',
      duration: '12 minutes',
      status: 'Success'
    },
    {
      id: '2', 
      date: '2025-09-25 20:15',
      type: 'Incremental',
      location: 'Local',
      size: '180 MB',
      duration: '2 minutes',
      status: 'Success'
    }
  ];

  const runBackup = async () => {
    setIsBackupRunning(true);
    setBackupProgress(0);
    
    toast({
      title: 'Backup Started',
      description: 'Creating backup...',
    });

    try {
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setBackupProgress(i);
      }
      
      toast({
        title: 'Backup Complete',
        description: 'Backup created successfully',
      });
    } catch (error) {
      toast({
        title: 'Backup Failed',
        description: 'Error creating backup',
        variant: 'destructive'
      });
    } finally {
      setIsBackupRunning(false);
      setBackupProgress(0);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Activity },
    { id: 'backup', name: 'Backup', icon: Save },
    { id: 'restore', name: 'Restore', icon: RotateCcw },
    { id: 'storage', name: 'Storage', icon: HardDrive },
    { id: 'cloud', name: 'Cloud', icon: Cloud },
    { id: 'schedules', name: 'Schedule', icon: Calendar }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
            <HardDrive className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Advanced Backup & Restore
            </h2>
            <p className="text-muted-foreground">Comprehensive backup management with local and cloud storage support</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1">
            {backupHistory.length} backups
          </Badge>
          <Badge variant="default" className="px-3 py-1 bg-green-500">
            {backupHistory.filter(b => b.status === 'Success').length} successful
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={runBackup}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Save className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">Create Backup</h3>
              <p className="text-sm text-muted-foreground">Instant backup</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <RotateCcw className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold">Restore Backup</h3>
              <p className="text-sm text-muted-foreground">Restore data</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Cloud className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold">Cloud Storage</h3>
              <p className="text-sm text-muted-foreground">Setup cloud services</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Progress Bar */}
      {isBackupRunning && (
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Creating backup...</span>
              <span className="text-sm text-muted-foreground">{backupProgress}%</span>
            </div>
            <Progress value={backupProgress} className="h-3" />
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Backup Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Backup Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Last Backup</span>
                    <Badge variant="outline">{backupHistory[0]?.date || 'None'}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Successful Backups</span>
                    <Badge variant="default" className="bg-green-500">
                      {backupHistory.filter(b => b.status === 'Success').length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total Storage Used</span>
                    <Badge variant="outline">8.2 GB</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Backups */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Recent Backups
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {backupHistory.slice(0, 3).map(backup => (
                    <div key={backup.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{backup.type}</p>
                        <p className="text-sm text-muted-foreground">{backup.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={backup.status === 'Success' ? 'default' : 'destructive'}
                          className={backup.status === 'Success' ? 'bg-green-500' : ''}
                        >
                          {backup.status}
                        </Badge>
                        <Button size="sm" variant="ghost">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={runBackup}>
                <CardContent className="p-6 text-center">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                  <h3 className="font-semibold mb-2">Full Backup</h3>
                  <p className="text-sm text-muted-foreground">Complete backup of all data</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-6 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <h3 className="font-semibold mb-2">Incremental Backup</h3>
                  <p className="text-sm text-muted-foreground">Backup only new changes</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-6 text-center">
                  <Settings className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                  <h3 className="font-semibold mb-2">Custom Backup</h3>
                  <p className="text-sm text-muted-foreground">Choose data to backup</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Other tabs would be implemented here */}
        {activeTab !== 'overview' && activeTab !== 'backup' && (
          <Card>
            <CardHeader>
              <CardTitle>{tabs.find(t => t.id === activeTab)?.name} Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {tabs.find(t => t.id === activeTab)?.name} configuration options will be implemented here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}