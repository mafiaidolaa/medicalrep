'use client';

/**
 * نظام أتمتة النسخ الاحتياطي المتقدم
 * يوفر جدولة تلقائية متطورة وخطط استرداد الكوارث
 */

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';

// تعريف الأنواع
export interface BackupJob {
  id: string;
  name: string;
  description?: string;
  type: 'full' | 'incremental' | 'differential' | 'snapshot';
  source: {
    type: 'database' | 'files' | 'application' | 'system';
    path: string;
    includes?: string[];
    excludes?: string[];
    filters?: {
      fileTypes?: string[];
      maxFileSize?: number;
      modifiedAfter?: Date;
    };
  };
  destination: {
    locationId: string;
    path: string;
    encryption: boolean;
    compression: boolean;
    compressionLevel?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  };
  schedule: {
    enabled: boolean;
    frequency: 'continuous' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
    interval?: number; // for continuous/hourly
    time?: string; // HH:MM for daily
    days?: ('sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday')[];
    dayOfMonth?: number; // for monthly
    timezone: string;
    maxConcurrent?: number;
  };
  retention: {
    keepDaily: number;
    keepWeekly: number;
    keepMonthly: number;
    keepYearly: number;
    deleteAfterDays?: number;
  };
  notifications: {
    onSuccess: boolean;
    onFailure: boolean;
    onWarning: boolean;
    channels: ('email' | 'sms' | 'webhook' | 'slack')[];
    recipients: string[];
  };
  priority: 'low' | 'normal' | 'high' | 'critical';
  maxRetries: number;
  retryDelay: number; // minutes
  timeout: number; // minutes
  enabled: boolean;
  created_at: string;
  updated_at: string;
  lastRun?: {
    startTime: string;
    endTime?: string;
    status: 'running' | 'completed' | 'failed' | 'cancelled' | 'warning';
    size: number;
    compressedSize: number;
    filesCount: number;
    duration: number;
    errorMessage?: string;
    warnings?: string[];
  };
  nextRun?: string;
  statistics: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    averageDuration: number;
    averageSize: number;
    lastSuccessful?: string;
  };
}

export interface BackupLocation {
  id: string;
  name: string;
  type: 'local' | 'network' | 's3' | 'azure' | 'gcp' | 'ftp' | 'sftp';
  connection: {
    path: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string; // should be encrypted
    accessKey?: string;
    secretKey?: string;
    region?: string;
    bucket?: string;
    endpoint?: string;
    ssl?: boolean;
    passive?: boolean;
  };
  settings: {
    encryption: boolean;
    encryptionKey?: string;
    compression: boolean;
    compressionType: 'gzip' | 'bzip2' | 'lzma' | 'zstd';
    bandwidth_limit?: number; // KB/s
    verify_checksum: boolean;
    create_path: boolean;
  };
  capacity: {
    total: number;
    used: number;
    available: number;
    quotaEnabled: boolean;
    quotaLimit?: number;
  };
  health: {
    status: 'healthy' | 'warning' | 'error' | 'unknown';
    lastCheck: string;
    latency?: number; // ms
    throughput?: number; // MB/s
    errors?: string[];
  };
  enabled: boolean;
}

export interface DisasterRecoveryPlan {
  id: string;
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'data_loss' | 'system_failure' | 'cyber_attack' | 'natural_disaster' | 'human_error';
  objectives: {
    rto: number; // Recovery Time Objective (minutes)
    rpo: number; // Recovery Point Objective (minutes)
    mttr: number; // Mean Time To Recovery (minutes)
  };
  scope: {
    systems: string[];
    databases: string[];
    applications: string[];
    data_types: string[];
    critical_functions: string[];
  };
  procedures: {
    id: string;
    step: number;
    title: string;
    description: string;
    type: 'automated' | 'manual' | 'approval';
    estimated_duration: number; // minutes
    responsible_team: string;
    dependencies?: string[];
    automation_script?: string;
    verification_steps?: string[];
  }[];
  resources: {
    backup_locations: string[];
    recovery_servers: string[];
    network_requirements: string[];
    personnel: {
      role: string;
      contact: string;
      backup_contact?: string;
    }[];
  };
  testing: {
    enabled: boolean;
    frequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
    last_test?: string;
    next_test?: string;
    test_results?: {
      date: string;
      status: 'passed' | 'failed' | 'partial';
      duration: number;
      issues?: string[];
      recommendations?: string[];
    }[];
  };
  triggers: {
    automatic: boolean;
    conditions: {
      system_failure: boolean;
      data_corruption: boolean;
      security_breach: boolean;
      natural_disaster: boolean;
      manual_activation: boolean;
    };
    escalation_time: number; // minutes
  };
  communications: {
    notification_list: string[];
    escalation_contacts: string[];
    external_communications: boolean;
    templates: {
      incident_notification: string;
      status_update: string;
      recovery_complete: string;
    };
  };
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface BackupMonitoring {
  system_health: {
    overall_status: 'healthy' | 'warning' | 'critical' | 'unknown';
    active_jobs: number;
    queued_jobs: number;
    failed_jobs_24h: number;
    storage_usage: number; // percentage
    last_successful_full_backup?: string;
    next_scheduled_backup?: string;
  };
  performance_metrics: {
    average_backup_speed: number; // MB/s
    average_compression_ratio: number;
    average_job_duration: number; // minutes
    success_rate_7d: number; // percentage
    data_growth_rate: number; // MB/day
  };
  alerts: {
    id: string;
    type: 'error' | 'warning' | 'info';
    title: string;
    message: string;
    job_id?: string;
    location_id?: string;
    created_at: string;
    acknowledged: boolean;
    resolved: boolean;
  }[];
  reports: {
    daily_summary: {
      date: string;
      jobs_completed: number;
      jobs_failed: number;
      data_backed_up: number; // MB
      duration_total: number; // minutes
    };
    weekly_trend: {
      week: string;
      success_rate: number;
      average_duration: number;
      data_volume: number;
      issues_count: number;
    }[];
    compliance: {
      retention_compliance: number; // percentage
      encryption_compliance: number; // percentage
      test_compliance: number; // percentage
      documentation_status: 'complete' | 'incomplete' | 'outdated';
    };
  };
}

export interface BackupConfig {
  global_settings: {
    max_concurrent_jobs: number;
    max_bandwidth_usage: number; // MB/s
    temp_directory: string;
    log_retention_days: number;
    compression_default: boolean;
    encryption_default: boolean;
    verify_backups: boolean;
    auto_cleanup: boolean;
    notification_defaults: {
      on_success: boolean;
      on_failure: boolean;
      on_warning: boolean;
      channels: string[];
    };
  };
  security: {
    encryption_algorithm: 'AES256' | 'ChaCha20' | 'AES128';
    key_management: 'manual' | 'automatic' | 'external';
    access_control: boolean;
    audit_logging: boolean;
    secure_delete: boolean;
  };
  compliance: {
    gdpr_enabled: boolean;
    hipaa_enabled: boolean;
    sox_enabled: boolean;
    pci_enabled: boolean;
    retention_enforcement: boolean;
    data_classification: boolean;
  };
  integration: {
    monitoring_webhook?: string;
    slack_webhook?: string;
    email_smtp?: {
      host: string;
      port: number;
      username: string;
      password: string;
      tls: boolean;
    };
    sms_provider?: {
      provider: 'twilio' | 'aws_sns' | 'custom';
      config: any;
    };
  };
}

// القيم الافتراضية
const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  global_settings: {
    max_concurrent_jobs: 3,
    max_bandwidth_usage: 100,
    temp_directory: '/tmp/backups',
    log_retention_days: 90,
    compression_default: true,
    encryption_default: true,
    verify_backups: true,
    auto_cleanup: true,
    notification_defaults: {
      on_success: false,
      on_failure: true,
      on_warning: true,
      channels: ['email']
    }
  },
  security: {
    encryption_algorithm: 'AES256',
    key_management: 'automatic',
    access_control: true,
    audit_logging: true,
    secure_delete: true
  },
  compliance: {
    gdpr_enabled: false,
    hipaa_enabled: false,
    sox_enabled: false,
    pci_enabled: false,
    retention_enforcement: true,
    data_classification: false
  },
  integration: {}
};

// Context لنظام النسخ الاحتياطي
const BackupAutomationContext = createContext<{
  config: BackupConfig;
  jobs: BackupJob[];
  locations: BackupLocation[];
  recoveryPlans: DisasterRecoveryPlan[];
  monitoring: BackupMonitoring;
  updateConfig: (newConfig: Partial<BackupConfig>) => Promise<void>;
  createJob: (job: Omit<BackupJob, 'id' | 'created_at' | 'updated_at'>) => Promise<string>;
  updateJob: (id: string, updates: Partial<BackupJob>) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  runJob: (id: string) => Promise<void>;
  pauseJob: (id: string) => Promise<void>;
  resumeJob: (id: string) => Promise<void>;
  createLocation: (location: Omit<BackupLocation, 'id'>) => Promise<string>;
  updateLocation: (id: string, updates: Partial<BackupLocation>) => Promise<void>;
  testLocation: (id: string) => Promise<boolean>;
  createRecoveryPlan: (plan: Omit<DisasterRecoveryPlan, 'id' | 'created_at' | 'updated_at'>) => Promise<string>;
  executeRecoveryPlan: (id: string) => Promise<void>;
  testRecoveryPlan: (id: string) => Promise<boolean>;
  isLoading: boolean;
  isRunning: boolean;
} | null>(null);

// Hook لاستخدام نظام النسخ الاحتياطي
export const useBackupAutomation = () => {
  const context = useContext(BackupAutomationContext);
  if (!context) {
    throw new Error('useBackupAutomation must be used within BackupAutomationProvider');
  }
  return context;
};

// Provider لنظام النسخ الاحتياطي
export function BackupAutomationProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<BackupConfig>(DEFAULT_BACKUP_CONFIG);
  const [jobs, setJobs] = useState<BackupJob[]>([]);
  const [locations, setLocations] = useState<BackupLocation[]>([]);
  const [recoveryPlans, setRecoveryPlans] = useState<DisasterRecoveryPlan[]>([]);
  const [monitoring, setMonitoring] = useState<BackupMonitoring>({
    system_health: {
      overall_status: 'healthy',
      active_jobs: 0,
      queued_jobs: 0,
      failed_jobs_24h: 0,
      storage_usage: 45,
    },
    performance_metrics: {
      average_backup_speed: 25.5,
      average_compression_ratio: 0.6,
      average_job_duration: 32,
      success_rate_7d: 98.5,
      data_growth_rate: 150
    },
    alerts: [],
    reports: {
      daily_summary: {
        date: new Date().toISOString(),
        jobs_completed: 5,
        jobs_failed: 0,
        data_backed_up: 2048,
        duration_total: 145
      },
      weekly_trend: [],
      compliance: {
        retention_compliance: 100,
        encryption_compliance: 100,
        test_compliance: 85,
        documentation_status: 'complete'
      }
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // تحميل الإعدادات والبيانات
  useEffect(() => {
    loadBackupData();
    startMonitoring();
  }, []);

  const loadBackupData = async () => {
    try {
      setIsLoading(true);
      
      // محاولة التحميل من localStorage
      const savedConfig = localStorage.getItem('backup-automation-config');
      const savedJobs = localStorage.getItem('backup-jobs');
      const savedLocations = localStorage.getItem('backup-locations');
      const savedPlans = localStorage.getItem('disaster-recovery-plans');
      
      if (savedConfig) {
        setConfig({ ...DEFAULT_BACKUP_CONFIG, ...JSON.parse(savedConfig) });
      }
      if (savedJobs) {
        setJobs(JSON.parse(savedJobs));
      }
      if (savedLocations) {
        setLocations(JSON.parse(savedLocations));
      }
      if (savedPlans) {
        setRecoveryPlans(JSON.parse(savedPlans));
      }
      
    } catch (error) {
      console.error('خطأ في تحميل بيانات النسخ الاحتياطي:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startMonitoring = () => {
    // بدء مراقبة النظام
    const monitoringInterval = setInterval(() => {
      updateMonitoring();
    }, 30000); // كل 30 ثانية

    return () => clearInterval(monitoringInterval);
  };

  const updateMonitoring = async () => {
    try {
      // تحديث إحصائيات النظام
      const activeJobs = jobs.filter(job => job.lastRun?.status === 'running').length;
      const queuedJobs = jobs.filter(job => job.enabled && job.nextRun).length;
      const failedJobs24h = jobs.filter(job => 
        job.lastRun?.status === 'failed' && 
        new Date(job.lastRun.startTime) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length;
      
      const totalUsed = locations.reduce((sum, loc) => sum + loc.capacity.used, 0);
      const totalCapacity = locations.reduce((sum, loc) => sum + loc.capacity.total, 0);
      const storageUsage = totalCapacity > 0 ? (totalUsed / totalCapacity) * 100 : 0;

      setMonitoring(prev => ({
        ...prev,
        system_health: {
          ...prev.system_health,
          active_jobs: activeJobs,
          queued_jobs: queuedJobs,
          failed_jobs_24h: failedJobs24h,
          storage_usage: storageUsage,
          overall_status: failedJobs24h > 0 ? 'warning' : 
                         storageUsage > 90 ? 'critical' : 
                         storageUsage > 80 ? 'warning' : 'healthy'
        }
      }));
      
    } catch (error) {
      console.error('خطأ في تحديث المراقبة:', error);
    }
  };

  const updateConfig = async (newConfig: Partial<BackupConfig>) => {
    try {
      const updatedConfig = { ...config, ...newConfig };
      setConfig(updatedConfig);
      localStorage.setItem('backup-automation-config', JSON.stringify(updatedConfig));
    } catch (error) {
      console.error('خطأ في حفظ إعدادات النسخ الاحتياطي:', error);
      throw error;
    }
  };

  const createJob = async (jobData: Omit<BackupJob, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
    try {
      const newJob: BackupJob = {
        ...jobData,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        statistics: {
          totalRuns: 0,
          successfulRuns: 0,
          failedRuns: 0,
          averageDuration: 0,
          averageSize: 0
        }
      };
      
      const updatedJobs = [...jobs, newJob];
      setJobs(updatedJobs);
      localStorage.setItem('backup-jobs', JSON.stringify(updatedJobs));
      
      return newJob.id;
    } catch (error) {
      console.error('خطأ في إنشاء مهمة النسخ الاحتياطي:', error);
      throw error;
    }
  };

  const updateJob = async (id: string, updates: Partial<BackupJob>) => {
    try {
      const updatedJobs = jobs.map(job => 
        job.id === id 
          ? { ...job, ...updates, updated_at: new Date().toISOString() }
          : job
      );
      setJobs(updatedJobs);
      localStorage.setItem('backup-jobs', JSON.stringify(updatedJobs));
    } catch (error) {
      console.error('خطأ في تحديث مهمة النسخ الاحتياطي:', error);
      throw error;
    }
  };

  const deleteJob = async (id: string) => {
    try {
      const updatedJobs = jobs.filter(job => job.id !== id);
      setJobs(updatedJobs);
      localStorage.setItem('backup-jobs', JSON.stringify(updatedJobs));
    } catch (error) {
      console.error('خطأ في حذف مهمة النسخ الاحتياطي:', error);
      throw error;
    }
  };

  const runJob = async (id: string) => {
    try {
      setIsRunning(true);
      
      // محاكاة تشغيل المهمة
      await updateJob(id, {
        lastRun: {
          startTime: new Date().toISOString(),
          status: 'running',
          size: 0,
          compressedSize: 0,
          filesCount: 0,
          duration: 0
        }
      });
      
      // محاكاة مدة التنفيذ
      setTimeout(async () => {
        await updateJob(id, {
          lastRun: {
            startTime: new Date(Date.now() - 30000).toISOString(),
            endTime: new Date().toISOString(),
            status: 'completed',
            size: Math.floor(Math.random() * 1000000000), // حجم عشوائي
            compressedSize: Math.floor(Math.random() * 500000000),
            filesCount: Math.floor(Math.random() * 10000),
            duration: 30
          }
        });
        setIsRunning(false);
      }, 3000);
      
    } catch (error) {
      console.error('خطأ في تشغيل مهمة النسخ الاحتياطي:', error);
      setIsRunning(false);
      throw error;
    }
  };

  const pauseJob = async (id: string) => {
    try {
      await updateJob(id, { enabled: false });
    } catch (error) {
      console.error('خطأ في إيقاف مهمة النسخ الاحتياطي:', error);
      throw error;
    }
  };

  const resumeJob = async (id: string) => {
    try {
      await updateJob(id, { enabled: true });
    } catch (error) {
      console.error('خطأ في استئناف مهمة النسخ الاحتياطي:', error);
      throw error;
    }
  };

  const createLocation = async (locationData: Omit<BackupLocation, 'id'>): Promise<string> => {
    try {
      const newLocation: BackupLocation = {
        ...locationData,
        id: Date.now().toString()
      };
      
      const updatedLocations = [...locations, newLocation];
      setLocations(updatedLocations);
      localStorage.setItem('backup-locations', JSON.stringify(updatedLocations));
      
      return newLocation.id;
    } catch (error) {
      console.error('خطأ في إنشاء موقع التخزين:', error);
      throw error;
    }
  };

  const updateLocation = async (id: string, updates: Partial<BackupLocation>) => {
    try {
      const updatedLocations = locations.map(location => 
        location.id === id ? { ...location, ...updates } : location
      );
      setLocations(updatedLocations);
      localStorage.setItem('backup-locations', JSON.stringify(updatedLocations));
    } catch (error) {
      console.error('خطأ في تحديث موقع التخزين:', error);
      throw error;
    }
  };

  const testLocation = async (id: string): Promise<boolean> => {
    try {
      // محاكاة اختبار الاتصال
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await updateLocation(id, {
        health: {
          status: 'healthy',
          lastCheck: new Date().toISOString(),
          latency: Math.floor(Math.random() * 100),
          throughput: Math.floor(Math.random() * 50) + 10
        }
      });
      
      return true;
    } catch (error) {
      console.error('خطأ في اختبار موقع التخزين:', error);
      return false;
    }
  };

  const createRecoveryPlan = async (planData: Omit<DisasterRecoveryPlan, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
    try {
      const newPlan: DisasterRecoveryPlan = {
        ...planData,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const updatedPlans = [...recoveryPlans, newPlan];
      setRecoveryPlans(updatedPlans);
      localStorage.setItem('disaster-recovery-plans', JSON.stringify(updatedPlans));
      
      return newPlan.id;
    } catch (error) {
      console.error('خطأ في إنشاء خطة استرداد الكوارث:', error);
      throw error;
    }
  };

  const executeRecoveryPlan = async (id: string) => {
    try {
      // محاكاة تنفيذ خطة الاسترداد
      console.log(`تنفيذ خطة استرداد الكوارث: ${id}`);
    } catch (error) {
      console.error('خطأ في تنفيذ خطة استرداد الكوارث:', error);
      throw error;
    }
  };

  const testRecoveryPlan = async (id: string): Promise<boolean> => {
    try {
      // محاكاة اختبار خطة الاسترداد
      await new Promise(resolve => setTimeout(resolve, 5000));
      return Math.random() > 0.2; // نسبة نجاح 80%
    } catch (error) {
      console.error('خطأ في اختبار خطة استرداد الكوارث:', error);
      return false;
    }
  };

  const value = {
    config,
    jobs,
    locations,
    recoveryPlans,
    monitoring,
    updateConfig,
    createJob,
    updateJob,
    deleteJob,
    runJob,
    pauseJob,
    resumeJob,
    createLocation,
    updateLocation,
    testLocation,
    createRecoveryPlan,
    executeRecoveryPlan,
    testRecoveryPlan,
    isLoading,
    isRunning
  };

  return React.createElement(
    BackupAutomationContext.Provider,
    { value },
    children
  );
}

// مساعدات إضافية
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} دقيقة`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} ساعة${mins > 0 ? ` و ${mins} دقيقة` : ''}`;
  } else {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return `${days} يوم${hours > 0 ? ` و ${hours} ساعة` : ''}`;
  }
};

export const getNextRunTime = (job: BackupJob): Date | null => {
  if (!job.enabled || !job.schedule.enabled) return null;
  
  const now = new Date();
  const schedule = job.schedule;
  
  switch (schedule.frequency) {
    case 'continuous':
      if (schedule.interval) {
        return new Date(now.getTime() + schedule.interval * 60000);
      }
      break;
    case 'hourly':
      const nextHour = new Date(now);
      nextHour.setHours(nextHour.getHours() + (schedule.interval || 1));
      nextHour.setMinutes(0);
      nextHour.setSeconds(0);
      return nextHour;
    case 'daily':
      if (schedule.time) {
        const [hours, minutes] = schedule.time.split(':').map(Number);
        const nextDay = new Date(now);
        nextDay.setHours(hours, minutes, 0, 0);
        if (nextDay <= now) {
          nextDay.setDate(nextDay.getDate() + 1);
        }
        return nextDay;
      }
      break;
    // يمكن إضافة المزيد من أنواع الجدولة هنا
  }
  
  return null;
};