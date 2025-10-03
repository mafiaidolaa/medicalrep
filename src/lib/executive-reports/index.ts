// @ts-nocheck

import { supabase } from '../supabase';

// Types for executive reports
export interface ExecutiveReportSettings {
  id: string;
  enabled: boolean;
  auto_generate_monthly: boolean;
  auto_generate_quarterly: boolean;
  include_comparisons: boolean;
  include_forecasting: boolean;
  include_budget_variance: boolean;
  email_to_executives: boolean;
  executives_emails: string[];
  report_frequency: 'weekly' | 'monthly' | 'quarterly';
  custom_kpis: string[]; // Custom KPI codes
  created_at: string;
  updated_at: string;
}

export interface KPIMetric {
  code: string;
  name: string;
  value: number;
  unit: string;
  target?: number;
  previous_value?: number;
  change_percentage?: number;
  trend: 'up' | 'down' | 'stable';
  status: 'excellent' | 'good' | 'warning' | 'critical';
  description?: string;
}

export interface ExecutiveReport {
  id: string;
  title: string;
  period_type: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  start_date: string;
  end_date: string;
  generated_at: string;
  
  // Summary metrics
  total_expenses: number;
  total_requests: number;
  approval_rate: number;
  average_processing_time: number;
  
  // KPIs
  kpis: KPIMetric[];
  
  // Detailed breakdowns
  department_breakdown: {
    department: string;
    amount: number;
    percentage: number;
    change_from_previous: number;
  }[];
  
  category_breakdown: {
    category: string;
    amount: number;
    percentage: number;
    budget_variance: number;
  }[];
  
  regional_breakdown: {
    region: string;
    amount: number;
    percentage: number;
    employee_count: number;
    avg_per_employee: number;
  }[];
  
  // Trends and insights
  monthly_trends: {
    month: string;
    amount: number;
    requests: number;
    approval_rate: number;
  }[];
  
  insights: {
    type: 'cost_saving' | 'trend_alert' | 'budget_variance' | 'efficiency';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    recommendation?: string;
  }[];
  
  // Comparisons
  yoy_comparison?: {
    current_period: number;
    previous_period: number;
    change_percentage: number;
    change_amount: number;
  };
  
  budget_comparison?: {
    budgeted_amount: number;
    actual_amount: number;
    variance_percentage: number;
    variance_amount: number;
  };
  
  created_at: string;
  created_by: string;
}

class ExecutiveReportsService {
  // Get report settings
  async getReportSettings(): Promise<ExecutiveReportSettings | null> {
    try {
      const { data, error } = await supabase
        .from('executive_report_settings')
        .select('*')
        .single();

      if (error && error.code === 'PGRST116') {
        return await this.createDefaultSettings();
      }

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get report settings failed:', error);
      return null;
    }
  }

  // Create default report settings
  async createDefaultSettings(): Promise<ExecutiveReportSettings | null> {
    try {
      const defaultSettings = {
        enabled: true,
        auto_generate_monthly: true,
        auto_generate_quarterly: true,
        include_comparisons: true,
        include_forecasting: false,
        include_budget_variance: true,
        email_to_executives: false,
        executives_emails: [],
        report_frequency: 'monthly' as const,
        custom_kpis: ['total_expenses', 'approval_rate', 'avg_processing_time', 'budget_variance'],
      };

      const { data, error } = await supabase
        .from('executive_report_settings')
        .insert(defaultSettings)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create default report settings failed:', error);
      return null;
    }
  }

  // Update report settings
  async updateReportSettings(settings: Partial<ExecutiveReportSettings>): Promise<ExecutiveReportSettings | null> {
    try {
      const { data, error } = await supabase
        .from('executive_report_settings')
        .update(settings)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update report settings failed:', error);
      return null;
    }
  }

  // Generate executive report
  async generateExecutiveReport(
    periodType: ExecutiveReport['period_type'],
    startDate: string,
    endDate: string,
    title?: string
  ): Promise<ExecutiveReport | null> {
    try {
      const settings = await this.getReportSettings();
      if (!settings?.enabled) return null;

      // Calculate basic metrics
      const basicMetrics = await this.calculateBasicMetrics(startDate, endDate);
      
      // Calculate KPIs
      const kpis = await this.calculateKPIs(startDate, endDate, settings.custom_kpis);
      
      // Get detailed breakdowns
      const departmentBreakdown = await this.getDepartmentBreakdown(startDate, endDate);
      const categoryBreakdown = await this.getCategoryBreakdown(startDate, endDate);
      const regionalBreakdown = await this.getRegionalBreakdown(startDate, endDate);
      
      // Get trends
      const monthlyTrends = await this.getMonthlyTrends(startDate, endDate);
      
      // Generate insights
      const insights = await this.generateInsights(basicMetrics, departmentBreakdown, categoryBreakdown);
      
      // Get comparisons
      const yoyComparison = settings.include_comparisons ? 
        await this.getYearOverYearComparison(startDate, endDate) : undefined;
      
      const budgetComparison = settings.include_budget_variance ? 
        await this.getBudgetComparison(startDate, endDate) : undefined;

      const report: Omit<ExecutiveReport, 'id' | 'created_at' | 'generated_at'> = {
        title: title || `تقرير مالي تنفيذي - ${periodType}`,
        period_type: periodType,
        start_date: startDate,
        end_date: endDate,
        ...basicMetrics,
        kpis,
        department_breakdown: departmentBreakdown,
        category_breakdown: categoryBreakdown,
        regional_breakdown: regionalBreakdown,
        monthly_trends: monthlyTrends,
        insights,
        yoy_comparison: yoyComparison,
        budget_comparison: budgetComparison,
        created_by: 'system', // In production, use actual user ID
      };

      // Save report to database
      const { data, error } = await supabase
        .from('executive_reports')
        .insert({
          ...report,
          generated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Generate executive report failed:', error);
      return null;
    }
  }

  // Calculate basic metrics
  private async calculateBasicMetrics(startDate: string, endDate: string) {
    try {
      const { data, error } = await supabase.rpc('get_executive_basic_metrics', {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;

      return {
        total_expenses: data?.total_expenses || 0,
        total_requests: data?.total_requests || 0,
        approval_rate: data?.approval_rate || 0,
        average_processing_time: data?.average_processing_time || 0,
      };
    } catch (error) {
      console.error('Calculate basic metrics failed:', error);
      return {
        total_expenses: 0,
        total_requests: 0,
        approval_rate: 0,
        average_processing_time: 0,
      };
    }
  }

  // Calculate KPIs
  private async calculateKPIs(startDate: string, endDate: string, customKpis: string[]): Promise<KPIMetric[]> {
    try {
      const kpis: KPIMetric[] = [];

      // Total Expenses KPI
      if (customKpis.includes('total_expenses')) {
        const currentPeriod = await this.getTotalExpenses(startDate, endDate);
        const previousPeriod = await this.getPreviousPeriodExpenses(startDate, endDate);
        
        kpis.push({
          code: 'total_expenses',
          name: 'إجمالي المصروفات',
          value: currentPeriod,
          unit: 'ر.س',
          previous_value: previousPeriod,
          change_percentage: previousPeriod > 0 ? ((currentPeriod - previousPeriod) / previousPeriod) * 100 : 0,
          trend: currentPeriod > previousPeriod ? 'up' : currentPeriod < previousPeriod ? 'down' : 'stable',
          status: this.getExpenseStatus(currentPeriod, previousPeriod),
          description: 'إجمالي المصروفات المعتمدة خلال الفترة',
        });
      }

      // Approval Rate KPI
      if (customKpis.includes('approval_rate')) {
        const approvalRate = await this.getApprovalRate(startDate, endDate);
        const previousApprovalRate = await this.getPreviousPeriodApprovalRate(startDate, endDate);
        
        kpis.push({
          code: 'approval_rate',
          name: 'معدل الموافقة',
          value: approvalRate,
          unit: '%',
          target: 85,
          previous_value: previousApprovalRate,
          change_percentage: previousApprovalRate > 0 ? ((approvalRate - previousApprovalRate) / previousApprovalRate) * 100 : 0,
          trend: approvalRate > previousApprovalRate ? 'up' : approvalRate < previousApprovalRate ? 'down' : 'stable',
          status: this.getApprovalRateStatus(approvalRate),
          description: 'نسبة الطلبات المعتمدة من إجمالي الطلبات',
        });
      }

      // Average Processing Time KPI
      if (customKpis.includes('avg_processing_time')) {
        const avgProcessingTime = await this.getAverageProcessingTime(startDate, endDate);
        const previousAvgTime = await this.getPreviousPeriodProcessingTime(startDate, endDate);
        
        kpis.push({
          code: 'avg_processing_time',
          name: 'متوسط وقت المعالجة',
          value: avgProcessingTime,
          unit: 'يوم',
          target: 2,
          previous_value: previousAvgTime,
          change_percentage: previousAvgTime > 0 ? ((avgProcessingTime - previousAvgTime) / previousAvgTime) * 100 : 0,
          trend: avgProcessingTime > previousAvgTime ? 'up' : avgProcessingTime < previousAvgTime ? 'down' : 'stable',
          status: this.getProcessingTimeStatus(avgProcessingTime),
          description: 'متوسط الوقت المطلوب لمعالجة طلبات المصروفات',
        });
      }

      // Budget Variance KPI
      if (customKpis.includes('budget_variance')) {
        const budgetVariance = await this.getBudgetVariancePercentage(startDate, endDate);
        
        kpis.push({
          code: 'budget_variance',
          name: 'انحراف الميزانية',
          value: budgetVariance,
          unit: '%',
          target: 0,
          trend: budgetVariance > 0 ? 'up' : budgetVariance < 0 ? 'down' : 'stable',
          status: this.getBudgetVarianceStatus(budgetVariance),
          description: 'الانحراف عن الميزانية المخططة',
        });
      }

      return kpis;
    } catch (error) {
      console.error('Calculate KPIs failed:', error);
      return [];
    }
  }

  // Get department breakdown
  private async getDepartmentBreakdown(startDate: string, endDate: string) {
    try {
      const { data, error } = await supabase.rpc('get_department_breakdown', {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get department breakdown failed:', error);
      return [];
    }
  }

  // Get category breakdown
  private async getCategoryBreakdown(startDate: string, endDate: string) {
    try {
      const { data, error } = await supabase.rpc('get_category_breakdown', {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get category breakdown failed:', error);
      return [];
    }
  }

  // Get regional breakdown
  private async getRegionalBreakdown(startDate: string, endDate: string) {
    try {
      const { data, error } = await supabase.rpc('get_regional_breakdown', {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get regional breakdown failed:', error);
      return [];
    }
  }

  // Get monthly trends
  private async getMonthlyTrends(startDate: string, endDate: string) {
    try {
      const { data, error } = await supabase.rpc('get_monthly_trends', {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get monthly trends failed:', error);
      return [];
    }
  }

  // Generate insights
  private async generateInsights(basicMetrics: any, departmentBreakdown: any[], categoryBreakdown: any[]) {
    const insights: ExecutiveReport['insights'] = [];

    // High spending departments
    const highSpendingDept = departmentBreakdown.find(dept => dept.percentage > 40);
    if (highSpendingDept) {
      insights.push({
        type: 'cost_saving',
        title: 'قسم عالي الإنفاق',
        description: `قسم ${highSpendingDept.department} يشكل ${highSpendingDept.percentage.toFixed(1)}% من إجمالي المصروفات`,
        impact: 'high',
        recommendation: 'مراجعة مصروفات هذا القسم وتحديد فرص التوفير',
      });
    }

    // Low approval rate
    if (basicMetrics.approval_rate < 70) {
      insights.push({
        type: 'efficiency',
        title: 'معدل موافقة منخفض',
        description: `معدل الموافقة الحالي ${basicMetrics.approval_rate.toFixed(1)}% أقل من المستوى المطلوب`,
        impact: 'medium',
        recommendation: 'مراجعة معايير الموافقة وتدريب الموظفين على إعداد طلبات أفضل',
      });
    }

    // High processing time
    if (basicMetrics.average_processing_time > 5) {
      insights.push({
        type: 'efficiency',
        title: 'وقت معالجة مرتفع',
        description: `متوسط وقت المعالجة ${basicMetrics.average_processing_time.toFixed(1)} يوم يتجاوز المستوى المطلوب`,
        impact: 'medium',
        recommendation: 'تحسين عملية الموافقة وأتمتة المزيد من الخطوات',
      });
    }

    // Budget variance alerts
    const highVarianceCategory = categoryBreakdown.find(cat => Math.abs(cat.budget_variance) > 20);
    if (highVarianceCategory) {
      insights.push({
        type: 'budget_variance',
        title: 'انحراف كبير في الميزانية',
        description: `فئة ${highVarianceCategory.category} تظهر انحراف ${highVarianceCategory.budget_variance.toFixed(1)}% عن الميزانية`,
        impact: 'high',
        recommendation: 'مراجعة ميزانية هذه الفئة وتعديل التخطيط للفترة القادمة',
      });
    }

    return insights;
  }

  // Helper methods for KPI calculations
  private async getTotalExpenses(startDate: string, endDate: string): Promise<number> {
    const { data } = await supabase.rpc('get_total_expenses_for_period', {
      p_start_date: startDate,
      p_end_date: endDate,
    });
    return data || 0;
  }

  private async getPreviousPeriodExpenses(startDate: string, endDate: string): Promise<number> {
    // Calculate previous period dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const periodLength = end.getTime() - start.getTime();
    const previousEnd = new Date(start.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - periodLength);

    const { data } = await supabase.rpc('get_total_expenses_for_period', {
      p_start_date: previousStart.toISOString(),
      p_end_date: previousEnd.toISOString(),
    });
    return data || 0;
  }

  private async getApprovalRate(startDate: string, endDate: string): Promise<number> {
    const { data } = await supabase.rpc('get_approval_rate_for_period', {
      p_start_date: startDate,
      p_end_date: endDate,
    });
    return data || 0;
  }

  private async getPreviousPeriodApprovalRate(startDate: string, endDate: string): Promise<number> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const periodLength = end.getTime() - start.getTime();
    const previousEnd = new Date(start.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - periodLength);

    const { data } = await supabase.rpc('get_approval_rate_for_period', {
      p_start_date: previousStart.toISOString(),
      p_end_date: previousEnd.toISOString(),
    });
    return data || 0;
  }

  private async getAverageProcessingTime(startDate: string, endDate: string): Promise<number> {
    const { data } = await supabase.rpc('get_avg_processing_time_for_period', {
      p_start_date: startDate,
      p_end_date: endDate,
    });
    return data || 0;
  }

  private async getPreviousPeriodProcessingTime(startDate: string, endDate: string): Promise<number> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const periodLength = end.getTime() - start.getTime();
    const previousEnd = new Date(start.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - periodLength);

    const { data } = await supabase.rpc('get_avg_processing_time_for_period', {
      p_start_date: previousStart.toISOString(),
      p_end_date: previousEnd.toISOString(),
    });
    return data || 0;
  }

  private async getBudgetVariancePercentage(startDate: string, endDate: string): Promise<number> {
    const { data } = await supabase.rpc('get_budget_variance_for_period', {
      p_start_date: startDate,
      p_end_date: endDate,
    });
    return data || 0;
  }

  private async getYearOverYearComparison(startDate: string, endDate: string) {
    try {
      const { data } = await supabase.rpc('get_yoy_comparison', {
        p_start_date: startDate,
        p_end_date: endDate,
      });
      return data;
    } catch (error) {
      console.error('Get YoY comparison failed:', error);
      return undefined;
    }
  }

  private async getBudgetComparison(startDate: string, endDate: string) {
    try {
      const { data } = await supabase.rpc('get_budget_comparison', {
        p_start_date: startDate,
        p_end_date: endDate,
      });
      return data;
    } catch (error) {
      console.error('Get budget comparison failed:', error);
      return undefined;
    }
  }

  // Status calculation helpers
  private getExpenseStatus(current: number, previous: number): KPIMetric['status'] {
    if (previous === 0) return 'good';
    const change = ((current - previous) / previous) * 100;
    if (change > 20) return 'critical';
    if (change > 10) return 'warning';
    if (change > 0) return 'good';
    return 'excellent';
  }

  private getApprovalRateStatus(rate: number): KPIMetric['status'] {
    if (rate >= 90) return 'excellent';
    if (rate >= 80) return 'good';
    if (rate >= 70) return 'warning';
    return 'critical';
  }

  private getProcessingTimeStatus(days: number): KPIMetric['status'] {
    if (days <= 1) return 'excellent';
    if (days <= 2) return 'good';
    if (days <= 5) return 'warning';
    return 'critical';
  }

  private getBudgetVarianceStatus(variance: number): KPIMetric['status'] {
    const absVariance = Math.abs(variance);
    if (absVariance <= 5) return 'excellent';
    if (absVariance <= 10) return 'good';
    if (absVariance <= 20) return 'warning';
    return 'critical';
  }

  // Get saved reports
  async getExecutiveReports(
    limit: number = 20,
    offset: number = 0,
    periodType?: string
  ): Promise<ExecutiveReport[]> {
    try {
      let query = supabase
        .from('executive_reports')
        .select('*')
        .order('generated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (periodType) {
        query = query.eq('period_type', periodType);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Get executive reports failed:', error);
      return [];
    }
  }

  // Get report by ID
  async getExecutiveReportById(reportId: string): Promise<ExecutiveReport | null> {
    try {
      const { data, error } = await supabase
        .from('executive_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get executive report by ID failed:', error);
      return null;
    }
  }

  // Delete report
  async deleteExecutiveReport(reportId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('executive_reports')
        .delete()
        .eq('id', reportId);

      return !error;
    } catch (error) {
      console.error('Delete executive report failed:', error);
      return false;
    }
  }

  // Schedule automatic report generation
  async scheduleAutoReports(): Promise<void> {
    const settings = await this.getReportSettings();
    if (!settings?.enabled) return;

    const today = new Date();
    
    // Monthly reports
    if (settings.auto_generate_monthly && today.getDate() === 1) {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      
      await this.generateExecutiveReport(
        'monthly',
        lastMonth.toISOString(),
        lastMonthEnd.toISOString(),
        `التقرير الشهري - ${lastMonth.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' })}`
      );
    }

    // Quarterly reports
    if (settings.auto_generate_quarterly && today.getDate() === 1) {
      const currentMonth = today.getMonth();
      if (currentMonth % 3 === 0) { // Start of quarter
        const quarterStart = new Date(today.getFullYear(), currentMonth - 3, 1);
        const quarterEnd = new Date(today.getFullYear(), currentMonth, 0);
        
        await this.generateExecutiveReport(
          'quarterly',
          quarterStart.toISOString(),
          quarterEnd.toISOString(),
          `التقرير الربع سنوي - Q${Math.ceil((currentMonth) / 3)} ${today.getFullYear()}`
        );
      }
    }
  }
}

export const executiveReportsService = new ExecutiveReportsService();
export default executiveReportsService;