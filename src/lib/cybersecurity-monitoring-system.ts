'use client';

/**
 * نظام مراقبة الأمان السيبراني
 * يوفر مراقبة شاملة للتهديدات والحوادث الأمنية
 */

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';

// تعريف الأنواع
export interface SecurityThreat {
  id: string;
  type: 'malware' | 'phishing' | 'brute_force' | 'ddos' | 'data_breach' | 'privilege_escalation' | 'sql_injection' | 'xss' | 'csrf' | 'suspicious_activity';
  category: 'web' | 'network' | 'system' | 'application' | 'user' | 'data';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'analyzing' | 'confirmed' | 'mitigated' | 'resolved' | 'false_positive';
  title: string;
  description: string;
  details: {
    source_ip?: string;
    target_ip?: string;
    user_agent?: string;
    affected_user?: string;
    affected_system?: string;
    attack_vector?: string;
    payload?: string;
    indicators?: string[];
  };
  impact: {
    confidentiality: 'none' | 'low' | 'medium' | 'high';
    integrity: 'none' | 'low' | 'medium' | 'high';
    availability: 'none' | 'low' | 'medium' | 'high';
    scope: 'unchanged' | 'changed';
  };
  timeline: {
    detected_at: string;
    first_seen?: string;
    last_seen?: string;
    resolved_at?: string;
  };
  mitigation: {
    auto_actions: string[];
    manual_actions: string[];
    recommendations: string[];
    status: 'none' | 'partial' | 'complete';
  };
  evidence: {
    logs: string[];
    screenshots?: string[];
    files?: string[];
    network_traces?: string[];
  };
  risk_score: number; // 0-100
  confidence: number; // 0-100
  created_at: string;
  updated_at: string;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  category: 'access_control' | 'authentication' | 'authorization' | 'data_protection' | 'network' | 'application';
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  conditions: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'matches_regex';
    value: string;
    case_sensitive?: boolean;
  }[];
  actions: {
    type: 'block' | 'alert' | 'log' | 'quarantine' | 'require_mfa' | 'rate_limit' | 'redirect';
    config: any;
    immediate: boolean;
  }[];
  exceptions: string[];
  schedule: {
    enabled: boolean;
    start_time?: string;
    end_time?: string;
    days?: string[];
    timezone: string;
  };
  metrics: {
    triggers_count: number;
    blocks_count: number;
    last_triggered?: string;
    effectiveness_score: number;
  };
  created_at: string;
  updated_at: string;
}

export interface VulnerabilityAssessment {
  id: string;
  target: {
    type: 'web_application' | 'network' | 'database' | 'server' | 'api';
    name: string;
    url?: string;
    ip_range?: string;
    description: string;
  };
  scan_config: {
    type: 'automated' | 'manual' | 'hybrid';
    frequency: 'daily' | 'weekly' | 'monthly' | 'on_demand';
    depth: 'basic' | 'standard' | 'comprehensive';
    tools: string[];
    exclude_paths?: string[];
  };
  results: {
    scan_id: string;
    started_at: string;
    completed_at?: string;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    vulnerabilities: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      info: number;
    };
    findings: {
      id: string;
      type: string;
      severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
      title: string;
      description: string;
      location: string;
      proof_of_concept?: string;
      remediation: string;
      cve_ids?: string[];
      cvss_score?: number;
      status: 'open' | 'fixed' | 'accepted' | 'false_positive';
    }[];
  };
  compliance: {
    frameworks: ('owasp' | 'pci_dss' | 'gdpr' | 'hipaa' | 'sox' | 'iso27001')[];
    requirements_met: number;
    requirements_total: number;
    gaps: string[];
  };
  scheduled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  category: 'security_breach' | 'data_leak' | 'malware_infection' | 'phishing_attack' | 'insider_threat' | 'system_compromise';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  priority: 'p1' | 'p2' | 'p3' | 'p4';
  affected_systems: string[];
  affected_users: string[];
  timeline: {
    reported_at: string;
    acknowledged_at?: string;
    investigation_started_at?: string;
    contained_at?: string;
    resolved_at?: string;
    closed_at?: string;
  };
  investigation: {
    lead_investigator: string;
    team_members: string[];
    findings: string[];
    evidence: string[];
    root_cause?: string;
  };
  response_actions: {
    immediate: string[];
    containment: string[];
    eradication: string[];
    recovery: string[];
    lessons_learned: string[];
  };
  communication: {
    internal_notifications: string[];
    external_notifications: string[];
    public_disclosure?: {
      required: boolean;
      disclosed_at?: string;
      details?: string;
    };
  };
  cost_impact: {
    estimated_loss?: number;
    recovery_cost?: number;
    legal_cost?: number;
    reputation_impact: 'none' | 'low' | 'medium' | 'high';
  };
  created_at: string;
  updated_at: string;
}

export interface SecurityDashboard {
  overview: {
    overall_security_score: number; // 0-100
    threat_level: 'low' | 'medium' | 'high' | 'critical';
    active_threats: number;
    blocked_attacks_24h: number;
    vulnerabilities_open: number;
    compliance_score: number;
    last_scan: string;
    last_incident?: string;
  };
  real_time_monitoring: {
    network_activity: {
      connections_per_minute: number;
      suspicious_ips: number;
      blocked_requests: number;
      bandwidth_usage: number;
    };
    authentication: {
      login_attempts_per_minute: number;
      failed_logins: number;
      suspicious_locations: number;
      new_devices: number;
    };
    system_health: {
      cpu_usage: number;
      memory_usage: number;
      disk_usage: number;
      services_status: 'healthy' | 'warning' | 'critical';
    };
  };
  threat_intelligence: {
    sources: string[];
    iocs_updated: number; // Indicators of Compromise
    threat_feeds_active: number;
    reputation_checks: number;
    last_update: string;
  };
  recent_events: {
    id: string;
    type: 'threat' | 'vulnerability' | 'incident' | 'policy_violation';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: string;
    status: 'new' | 'acknowledged' | 'resolved';
  }[];
}

export interface SecurityConfig {
  monitoring: {
    log_retention_days: number;
    alert_threshold: {
      failed_logins: number;
      suspicious_requests: number;
      unusual_activity: number;
    };
    real_time_analysis: boolean;
    threat_intelligence: boolean;
    behavioral_analysis: boolean;
    geolocation_tracking: boolean;
  };
  protection: {
    auto_blocking: boolean;
    rate_limiting: boolean;
    ip_whitelisting: boolean;
    user_agent_filtering: boolean;
    sql_injection_protection: boolean;
    xss_protection: boolean;
    csrf_protection: boolean;
  };
  notifications: {
    email_alerts: boolean;
    sms_alerts: boolean;
    webhook_alerts: boolean;
    dashboard_notifications: boolean;
    alert_recipients: string[];
    alert_thresholds: {
      low: boolean;
      medium: boolean;
      high: boolean;
      critical: boolean;
    };
  };
  compliance: {
    frameworks: string[];
    audit_logging: boolean;
    data_retention_policy: boolean;
    access_logging: boolean;
    change_tracking: boolean;
  };
  integration: {
    siem_enabled: boolean;
    siem_endpoint?: string;
    threat_feeds: string[];
    vulnerability_scanners: string[];
    external_apis: {
      virus_total?: string;
      abuse_ipdb?: string;
      greynoise?: string;
    };
  };
}

// القيم الافتراضية
const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  monitoring: {
    log_retention_days: 365,
    alert_threshold: {
      failed_logins: 5,
      suspicious_requests: 10,
      unusual_activity: 3
    },
    real_time_analysis: true,
    threat_intelligence: true,
    behavioral_analysis: true,
    geolocation_tracking: true
  },
  protection: {
    auto_blocking: true,
    rate_limiting: true,
    ip_whitelisting: false,
    user_agent_filtering: true,
    sql_injection_protection: true,
    xss_protection: true,
    csrf_protection: true
  },
  notifications: {
    email_alerts: true,
    sms_alerts: false,
    webhook_alerts: false,
    dashboard_notifications: true,
    alert_recipients: [],
    alert_thresholds: {
      low: false,
      medium: true,
      high: true,
      critical: true
    }
  },
  compliance: {
    frameworks: ['owasp'],
    audit_logging: true,
    data_retention_policy: true,
    access_logging: true,
    change_tracking: true
  },
  integration: {
    siem_enabled: false,
    threat_feeds: [],
    vulnerability_scanners: [],
    external_apis: {}
  }
};

// Context لنظام الأمان السيبراني
const CybersecurityMonitoringContext = createContext<{
  config: SecurityConfig;
  dashboard: SecurityDashboard;
  threats: SecurityThreat[];
  policies: SecurityPolicy[];
  vulnerabilities: VulnerabilityAssessment[];
  incidents: SecurityIncident[];
  updateConfig: (newConfig: Partial<SecurityConfig>) => Promise<void>;
  createPolicy: (policy: Omit<SecurityPolicy, 'id' | 'created_at' | 'updated_at'>) => Promise<string>;
  updatePolicy: (id: string, updates: Partial<SecurityPolicy>) => Promise<void>;
  deletePolicy: (id: string) => Promise<void>;
  resolveThreat: (id: string, resolution: string) => Promise<void>;
  startVulnerabilityScan: (targetId: string) => Promise<string>;
  createIncident: (incident: Omit<SecurityIncident, 'id' | 'created_at' | 'updated_at'>) => Promise<string>;
  updateIncident: (id: string, updates: Partial<SecurityIncident>) => Promise<void>;
  blockIP: (ip: string, reason: string, duration?: number) => Promise<void>;
  unblockIP: (ip: string) => Promise<void>;
  isLoading: boolean;
  isScanning: boolean;
} | null>(null);

// Hook لاستخدام نظام مراقبة الأمان السيبراني
export const useCybersecurityMonitoring = () => {
  const context = useContext(CybersecurityMonitoringContext);
  if (!context) {
    // في حالة عدم وجود Provider، نقدم بيانات افتراضية
    console.warn('useCybersecurityMonitoring is being used without CybersecurityMonitoringProvider. Using fallback data.');
    
    return {
      config: DEFAULT_SECURITY_CONFIG,
      dashboard: {
        overview: {
          overall_security_score: 78,
          threat_level: 'medium' as const,
          active_threats: 0,
          blocked_attacks_24h: 0,
          vulnerabilities_open: 0,
          compliance_score: 85,
          last_scan: new Date().toISOString()
        },
        real_time_monitoring: {
          network_activity: {
            connections_per_minute: 0,
            suspicious_ips: 0,
            blocked_requests: 0,
            bandwidth_usage: 0
          },
          authentication: {
            login_attempts_per_minute: 0,
            failed_logins: 0,
            suspicious_locations: 0,
            new_devices: 0
          },
          system_health: {
            cpu_usage: 0,
            memory_usage: 0,
            disk_usage: 0,
            services_status: 'healthy' as const
          }
        },
        threat_intelligence: {
          sources: [],
          iocs_updated: 0,
          threat_feeds_active: 0,
          reputation_checks: 0,
          last_update: new Date().toISOString()
        },
        recent_events: []
      },
      threats: [],
      policies: [],
      vulnerabilities: [],
      incidents: [],
      updateConfig: async () => {
        console.warn('updateConfig called without provider - no operation performed');
      },
      createPolicy: async () => {
        console.warn('createPolicy called without provider - no operation performed');
        return 'mock-id';
      },
      updatePolicy: async () => {
        console.warn('updatePolicy called without provider - no operation performed');
      },
      deletePolicy: async () => {
        console.warn('deletePolicy called without provider - no operation performed');
      },
      resolveThreat: async () => {
        console.warn('resolveThreat called without provider - no operation performed');
      },
      startVulnerabilityScan: async () => {
        console.warn('startVulnerabilityScan called without provider - no operation performed');
        return 'mock-scan-id';
      },
      createIncident: async () => {
        console.warn('createIncident called without provider - no operation performed');
        return 'mock-incident-id';
      },
      updateIncident: async () => {
        console.warn('updateIncident called without provider - no operation performed');
      },
      blockIP: async () => {
        console.warn('blockIP called without provider - no operation performed');
      },
      unblockIP: async () => {
        console.warn('unblockIP called without provider - no operation performed');
      },
      isLoading: false,
      isScanning: false
    };
  }
  return context;
};

// Provider لنظام مراقبة الأمان السيبراني
export function CybersecurityMonitoringProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [threats, setThreats] = useState<SecurityThreat[]>([]);
  const [policies, setPolicies] = useState<SecurityPolicy[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<VulnerabilityAssessment[]>([]);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [dashboard, setDashboard] = useState<SecurityDashboard>({
    overview: {
      overall_security_score: 78,
      threat_level: 'medium',
      active_threats: 3,
      blocked_attacks_24h: 45,
      vulnerabilities_open: 8,
      compliance_score: 85,
      last_scan: new Date().toISOString()
    },
    real_time_monitoring: {
      network_activity: {
        connections_per_minute: 150,
        suspicious_ips: 2,
        blocked_requests: 23,
        bandwidth_usage: 65
      },
      authentication: {
        login_attempts_per_minute: 12,
        failed_logins: 3,
        suspicious_locations: 1,
        new_devices: 0
      },
      system_health: {
        cpu_usage: 45,
        memory_usage: 62,
        disk_usage: 78,
        services_status: 'healthy'
      }
    },
    threat_intelligence: {
      sources: ['VirusTotal', 'AbuseIPDB', 'MISP'],
      iocs_updated: 1250,
      threat_feeds_active: 5,
      reputation_checks: 2847,
      last_update: new Date().toISOString()
    },
    recent_events: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // تحميل البيانات والبدء في المراقبة
  useEffect(() => {
    loadSecurityData();
    startRealTimeMonitoring();
  }, []);

  const loadSecurityData = async () => {
    try {
      setIsLoading(true);
      
      // محاولة التحميل من localStorage
      const savedConfig = localStorage.getItem('cybersecurity-config');
      const savedThreats = localStorage.getItem('security-threats');
      const savedPolicies = localStorage.getItem('security-policies');
      const savedVulnerabilities = localStorage.getItem('vulnerability-assessments');
      const savedIncidents = localStorage.getItem('security-incidents');
      
      if (savedConfig) {
        setConfig({ ...DEFAULT_SECURITY_CONFIG, ...JSON.parse(savedConfig) });
      }
      if (savedThreats) {
        setThreats(JSON.parse(savedThreats));
      }
      if (savedPolicies) {
        setPolicies(JSON.parse(savedPolicies));
      }
      if (savedVulnerabilities) {
        setVulnerabilities(JSON.parse(savedVulnerabilities));
      }
      if (savedIncidents) {
        setIncidents(JSON.parse(savedIncidents));
      }
      
      // تحميل بيانات تجريبية إذا لم توجد بيانات محفوظة
      if (!savedThreats) {
        loadMockData();
      }
      
    } catch (error) {
      console.error('خطأ في تحميل بيانات الأمان السيبراني:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMockData = () => {
    // إضافة بيانات تجريبية للتهديدات
    const mockThreats: SecurityThreat[] = [
      {
        id: '1',
        type: 'brute_force',
        category: 'network',
        severity: 'high',
        status: 'detected',
        title: 'محاولة هجوم القوة الغاشمة',
        description: 'تم رصد محاولات متكررة لتسجيل الدخول من عنوان IP واحد',
        details: {
          source_ip: '192.168.1.100',
          affected_user: 'admin',
          attack_vector: 'SSH Brute Force',
          indicators: ['multiple_failed_logins', 'high_frequency_requests']
        },
        impact: {
          confidentiality: 'high',
          integrity: 'medium',
          availability: 'low',
          scope: 'unchanged'
        },
        timeline: {
          detected_at: new Date().toISOString(),
          first_seen: new Date(Date.now() - 3600000).toISOString(),
          last_seen: new Date().toISOString()
        },
        mitigation: {
          auto_actions: ['blocked_ip', 'rate_limited'],
          manual_actions: [],
          recommendations: ['change_password', 'enable_2fa', 'review_logs'],
          status: 'partial'
        },
        evidence: {
          logs: ['/var/log/auth.log', '/var/log/secure'],
          files: []
        },
        risk_score: 85,
        confidence: 92,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    // إضافة بيانات تجريبية للسياسات
    const mockPolicies: SecurityPolicy[] = [
      {
        id: '1',
        name: 'حماية من هجمات القوة الغاشمة',
        description: 'حظر عناوين IP بعد محاولات فاشلة متتالية',
        category: 'access_control',
        enabled: true,
        severity: 'high',
        conditions: [
          {
            field: 'failed_login_attempts',
            operator: 'greater_than',
            value: '5'
          }
        ],
        actions: [
          {
            type: 'block',
            config: { duration: 3600 },
            immediate: true
          },
          {
            type: 'alert',
            config: { severity: 'high' },
            immediate: true
          }
        ],
        exceptions: ['192.168.1.1', '10.0.0.1'],
        schedule: {
          enabled: false,
          timezone: 'Asia/Riyadh'
        },
        metrics: {
          triggers_count: 23,
          blocks_count: 18,
          last_triggered: new Date().toISOString(),
          effectiveness_score: 94
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    setThreats(mockThreats);
    setPolicies(mockPolicies);
  };

  const startRealTimeMonitoring = () => {
    // بدء المراقبة في الوقت الفعلي
    const monitoringInterval = setInterval(() => {
      updateDashboard();
    }, 10000); // كل 10 ثواني

    return () => clearInterval(monitoringInterval);
  };

  const updateDashboard = async () => {
    try {
      // تحديث المقاييس في الوقت الفعلي
      setDashboard(prev => ({
        ...prev,
        real_time_monitoring: {
          ...prev.real_time_monitoring,
          network_activity: {
            ...prev.real_time_monitoring.network_activity,
            connections_per_minute: Math.floor(Math.random() * 200) + 100,
            blocked_requests: Math.floor(Math.random() * 50) + 10
          },
          authentication: {
            ...prev.real_time_monitoring.authentication,
            login_attempts_per_minute: Math.floor(Math.random() * 20) + 5,
            failed_logins: Math.floor(Math.random() * 10)
          }
        },
        overview: {
          ...prev.overview,
          active_threats: threats.filter(t => t.status !== 'resolved').length,
          blocked_attacks_24h: Math.floor(Math.random() * 100) + 20
        }
      }));
      
    } catch (error) {
      console.error('خطأ في تحديث لوحة المراقبة:', error);
    }
  };

  const updateConfig = async (newConfig: Partial<SecurityConfig>) => {
    try {
      const updatedConfig = { ...config, ...newConfig };
      setConfig(updatedConfig);
      localStorage.setItem('cybersecurity-config', JSON.stringify(updatedConfig));
    } catch (error) {
      console.error('خطأ في حفظ إعدادات الأمان:', error);
      throw error;
    }
  };

  const createPolicy = async (policyData: Omit<SecurityPolicy, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
    try {
      const newPolicy: SecurityPolicy = {
        ...policyData,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metrics: {
          triggers_count: 0,
          blocks_count: 0,
          effectiveness_score: 0
        }
      };
      
      const updatedPolicies = [...policies, newPolicy];
      setPolicies(updatedPolicies);
      localStorage.setItem('security-policies', JSON.stringify(updatedPolicies));
      
      return newPolicy.id;
    } catch (error) {
      console.error('خطأ في إنشاء سياسة الأمان:', error);
      throw error;
    }
  };

  const updatePolicy = async (id: string, updates: Partial<SecurityPolicy>) => {
    try {
      const updatedPolicies = policies.map(policy => 
        policy.id === id 
          ? { ...policy, ...updates, updated_at: new Date().toISOString() }
          : policy
      );
      setPolicies(updatedPolicies);
      localStorage.setItem('security-policies', JSON.stringify(updatedPolicies));
    } catch (error) {
      console.error('خطأ في تحديث سياسة الأمان:', error);
      throw error;
    }
  };

  const deletePolicy = async (id: string) => {
    try {
      const updatedPolicies = policies.filter(policy => policy.id !== id);
      setPolicies(updatedPolicies);
      localStorage.setItem('security-policies', JSON.stringify(updatedPolicies));
    } catch (error) {
      console.error('خطأ في حذف سياسة الأمان:', error);
      throw error;
    }
  };

  const resolveThreat = async (id: string, resolution: string) => {
    try {
      const updatedThreats = threats.map(threat => 
        threat.id === id 
          ? {
              ...threat,
              status: 'resolved' as const,
              timeline: {
                ...threat.timeline,
                resolved_at: new Date().toISOString()
              },
              mitigation: {
                ...threat.mitigation,
                status: 'complete' as const,
                manual_actions: [...threat.mitigation.manual_actions, resolution]
              },
              updated_at: new Date().toISOString()
            }
          : threat
      );
      setThreats(updatedThreats);
      localStorage.setItem('security-threats', JSON.stringify(updatedThreats));
    } catch (error) {
      console.error('خطأ في حل التهديد:', error);
      throw error;
    }
  };

  const startVulnerabilityScan = async (targetId: string): Promise<string> => {
    try {
      setIsScanning(true);
      
      // محاكاة فحص الثغرات
      const newScan: VulnerabilityAssessment = {
        id: Date.now().toString(),
        target: {
          type: 'web_application',
          name: 'تطبيق الويب الرئيسي',
          url: 'https://example.com',
          description: 'فحص شامل للتطبيق'
        },
        scan_config: {
          type: 'automated',
          frequency: 'weekly',
          depth: 'comprehensive',
          tools: ['OWASP ZAP', 'Nmap', 'Nikto']
        },
        results: {
          scan_id: Date.now().toString(),
          started_at: new Date().toISOString(),
          status: 'running',
          vulnerabilities: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            info: 0
          },
          findings: []
        },
        compliance: {
          frameworks: ['owasp'],
          requirements_met: 0,
          requirements_total: 0,
          gaps: []
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const updatedVulnerabilities = [...vulnerabilities, newScan];
      setVulnerabilities(updatedVulnerabilities);
      
      // محاكاة انتهاء الفحص
      setTimeout(() => {
        const completedScan = {
          ...newScan,
          results: {
            ...newScan.results,
            completed_at: new Date().toISOString(),
            status: 'completed' as const,
            vulnerabilities: {
              critical: 1,
              high: 3,
              medium: 5,
              low: 8,
              info: 12
            },
            findings: [
              {
                id: '1',
                type: 'SQL Injection',
                severity: 'critical' as const,
                title: 'ثغرة حقن SQL في نموذج تسجيل الدخول',
                description: 'تم اكتشاف ثغرة حقن SQL في حقل اسم المستخدم',
                location: '/login',
                remediation: 'استخدام Prepared Statements',
                cvss_score: 9.1,
                status: 'open' as const
              }
            ]
          }
        };
        
        setVulnerabilities(prev => 
          prev.map(v => v.id === newScan.id ? completedScan : v)
        );
        setIsScanning(false);
      }, 5000);
      
      return newScan.id;
    } catch (error) {
      console.error('خطأ في بدء فحص الثغرات:', error);
      setIsScanning(false);
      throw error;
    }
  };

  const createIncident = async (incidentData: Omit<SecurityIncident, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
    try {
      const newIncident: SecurityIncident = {
        ...incidentData,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const updatedIncidents = [...incidents, newIncident];
      setIncidents(updatedIncidents);
      localStorage.setItem('security-incidents', JSON.stringify(updatedIncidents));
      
      return newIncident.id;
    } catch (error) {
      console.error('خطأ في إنشاء الحادثة الأمنية:', error);
      throw error;
    }
  };

  const updateIncident = async (id: string, updates: Partial<SecurityIncident>) => {
    try {
      const updatedIncidents = incidents.map(incident => 
        incident.id === id 
          ? { ...incident, ...updates, updated_at: new Date().toISOString() }
          : incident
      );
      setIncidents(updatedIncidents);
      localStorage.setItem('security-incidents', JSON.stringify(updatedIncidents));
    } catch (error) {
      console.error('خطأ في تحديث الحادثة الأمنية:', error);
      throw error;
    }
  };

  const blockIP = async (ip: string, reason: string, duration?: number) => {
    try {
      // محاكاة حظر عنوان IP
      console.log(`حظر عنوان IP: ${ip} للسبب: ${reason}`);
      
      // إضافة تهديد جديد لتسجيل الحظر
      const blockThreat: SecurityThreat = {
        id: Date.now().toString(),
        type: 'suspicious_activity',
        category: 'network',
        severity: 'medium',
        status: 'mitigated',
        title: `حظر عنوان IP: ${ip}`,
        description: reason,
        details: { source_ip: ip },
        impact: {
          confidentiality: 'none',
          integrity: 'none',
          availability: 'low',
          scope: 'unchanged'
        },
        timeline: {
          detected_at: new Date().toISOString(),
          resolved_at: new Date().toISOString()
        },
        mitigation: {
          auto_actions: ['blocked_ip'],
          manual_actions: [],
          recommendations: [],
          status: 'complete'
        },
        evidence: { logs: [] },
        risk_score: 60,
        confidence: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setThreats(prev => [...prev, blockThreat]);
    } catch (error) {
      console.error('خطأ في حظر عنوان IP:', error);
      throw error;
    }
  };

  const unblockIP = async (ip: string) => {
    try {
      // محاكاة إلغاء حظر عنوان IP
      console.log(`إلغاء حظر عنوان IP: ${ip}`);
    } catch (error) {
      console.error('خطأ في إلغاء حظر عنوان IP:', error);
      throw error;
    }
  };

  const value = {
    config,
    dashboard,
    threats,
    policies,
    vulnerabilities,
    incidents,
    updateConfig,
    createPolicy,
    updatePolicy,
    deletePolicy,
    resolveThreat,
    startVulnerabilityScan,
    createIncident,
    updateIncident,
    blockIP,
    unblockIP,
    isLoading,
    isScanning
  };

  return React.createElement(
    CybersecurityMonitoringContext.Provider,
    { value },
    children
  );
}

// مساعدات إضافية
export const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'critical': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900';
    case 'high': return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900';
    case 'medium': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900';
    case 'low': return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900';
    default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900';
  }
};

export const getThreatTypeLabel = (type: string): string => {
  const labels: { [key: string]: string } = {
    malware: 'برمجيات خبيثة',
    phishing: 'تصيد احتيالي',
    brute_force: 'القوة الغاشمة',
    ddos: 'هجوم رفض الخدمة',
    data_breach: 'تسريب بيانات',
    privilege_escalation: 'تصعيد الصلاحيات',
    sql_injection: 'حقن SQL',
    xss: 'البرمجة النصية المتقاطعة',
    csrf: 'تزوير الطلبات',
    suspicious_activity: 'نشاط مشبوه'
  };
  return labels[type] || type;
};

export const calculateRiskScore = (threat: SecurityThreat): number => {
  let score = 0;
  
  // وزن الشدة
  const severityWeights = { info: 1, low: 2, medium: 4, high: 7, critical: 10 };
  score += severityWeights[threat.severity] * 10;
  
  // وزن مستوى الثقة
  score += (threat.confidence / 100) * 20;
  
  // وزن التأثير
  const impactWeights = { none: 0, low: 1, medium: 2, high: 3 };
  const maxImpact = Math.max(
    impactWeights[threat.impact.confidentiality],
    impactWeights[threat.impact.integrity],
    impactWeights[threat.impact.availability]
  );
  score += maxImpact * 10;
  
  return Math.min(100, Math.max(0, score));
};