// @ts-nocheck
import { supabase } from '../supabase';
import { ExpenseItem } from '../../types/accounts';

// Types for fraud detection
export interface FraudDetectionSettings {
  id: string;
  enabled: boolean;
  duplicate_threshold: number; // نسبة التشابه المطلوبة لاعتبار الإيصال مكرر (0-100)
  amount_tolerance: number; // نسبة التسامح في المبلغ (0-100)
  time_window_hours: number; // نافذة زمنية للبحث عن المكررات (بالساعات)
  location_radius_km: number; // نطاق المسافة للموقع (بالكيلومتر)
  auto_flag_suspicious: boolean; // وضع علامة تلقائية على الإيصالات المشبوهة
  require_manager_approval: boolean; // طلب موافقة المدير للإيصالات المشبوهة
  created_at: string;
  updated_at: string;
}

export interface FraudAlert {
  id: string;
  expense_item_id: string;
  duplicate_item_id: string;
  confidence_score: number; // درجة الثقة في كون الإيصال مكرر (0-100)
  fraud_type: 'duplicate_receipt' | 'amount_manipulation' | 'location_mismatch' | 'time_anomaly' | 'pattern_anomaly';
  details: {
    amount_difference?: number;
    time_difference_hours?: number;
    distance_km?: number;
    similarity_factors?: string[];
    risk_level: 'low' | 'medium' | 'high' | 'critical';
  };
  status: 'pending' | 'reviewed' | 'confirmed' | 'dismissed';
  reviewed_by?: string;
  reviewed_at?: string;
  notes?: string;
  created_at: string;
}

export interface ReceiptFingerprint {
  id: string;
  expense_item_id: string;
  hash_content: string; // Hash للنصوص في الإيصال
  hash_visual?: string; // Hash للمحتوى البصري (إذا توفر)
  amount: number;
  timestamp: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  merchant_info?: {
    name?: string;
    tax_number?: string;
    phone?: string;
  };
  extracted_text?: string;
  created_at: string;
}

class FraudDetectionService {
  // Get fraud detection settings
  async getSettings(): Promise<FraudDetectionSettings | null> {
    try {
      const { data, error } = await supabase
        .from('fraud_detection_settings')
        .select('*')
        .single();

      if (error && error.code === 'PGRST116') {
        // Create default settings if none exist
        return await this.createDefaultSettings();
      }

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get fraud detection settings failed:', error);
      return null;
    }
  }

  // Create default fraud detection settings
  async createDefaultSettings(): Promise<FraudDetectionSettings | null> {
    try {
      const defaultSettings = {
        enabled: true,
        duplicate_threshold: 85,
        amount_tolerance: 5,
        time_window_hours: 24,
        location_radius_km: 0.5,
        auto_flag_suspicious: true,
        require_manager_approval: true,
      };

      const { data, error } = await supabase
        .from('fraud_detection_settings')
        .insert(defaultSettings)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create default fraud settings failed:', error);
      return null;
    }
  }

  // Update fraud detection settings
  async updateSettings(settings: Partial<FraudDetectionSettings>): Promise<FraudDetectionSettings | null> {
    try {
      const { data, error } = await supabase
        .from('fraud_detection_settings')
        .update(settings)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update fraud detection settings failed:', error);
      return null;
    }
  }

  // Create receipt fingerprint
  async createReceiptFingerprint(expenseItem: ExpenseItem): Promise<ReceiptFingerprint | null> {
    try {
      // Extract text content for hashing
      const textContent = this.extractTextContent(expenseItem);
      const hashContent = this.generateHash(textContent);

      // Extract merchant information
      const merchantInfo = this.extractMerchantInfo(expenseItem);

      const fingerprint = {
        expense_item_id: expenseItem.id,
        hash_content: hashContent,
        amount: expenseItem.amount,
        timestamp: expenseItem.expense_date || expenseItem.created_at,
        location: expenseItem.location ? {
          lat: expenseItem.location.lat,
          lng: expenseItem.location.lng,
          address: expenseItem.location.address,
        } : undefined,
        merchant_info: merchantInfo,
        extracted_text: textContent,
      };

      const { data, error } = await supabase
        .from('receipt_fingerprints')
        .insert(fingerprint)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create receipt fingerprint failed:', error);
      return null;
    }
  }

  // Check for duplicate receipts
  async checkForDuplicates(expenseItem: ExpenseItem): Promise<FraudAlert[]> {
    const settings = await this.getSettings();
    if (!settings || !settings.enabled) return [];

    try {
      const alerts: FraudAlert[] = [];
      
      // Create fingerprint for the current expense item
      const currentFingerprint = await this.createReceiptFingerprint(expenseItem);
      if (!currentFingerprint) return [];

      // Search for similar receipts
      const timeWindow = new Date(
        Date.parse(expenseItem.expense_date || expenseItem.created_at) - 
        settings.time_window_hours * 60 * 60 * 1000
      );

      const { data: existingFingerprints, error } = await supabase
        .from('receipt_fingerprints')
        .select(`
          *,
          expense_item:expense_items(*)
        `)
        .neq('expense_item_id', expenseItem.id)
        .gte('created_at', timeWindow.toISOString());

      if (error) throw error;

      // Check each existing fingerprint for similarities
      for (const existingFingerprint of existingFingerprints || []) {
        const similarity = this.calculateSimilarity(currentFingerprint, existingFingerprint);
        
        if (similarity.confidence >= settings.duplicate_threshold) {
          const alert: Omit<FraudAlert, 'id' | 'created_at'> = {
            expense_item_id: expenseItem.id,
            duplicate_item_id: existingFingerprint.expense_item_id,
            confidence_score: similarity.confidence,
            fraud_type: 'duplicate_receipt',
            details: {
              amount_difference: Math.abs(currentFingerprint.amount - existingFingerprint.amount),
              time_difference_hours: this.calculateTimeDifferenceHours(
                currentFingerprint.timestamp,
                existingFingerprint.timestamp
              ),
              distance_km: this.calculateDistance(
                currentFingerprint.location,
                existingFingerprint.location
              ),
              similarity_factors: similarity.factors,
              risk_level: this.assessRiskLevel(similarity.confidence),
            },
            status: 'pending',
          };

          // Insert fraud alert
          const { data: alertData, error: alertError } = await supabase
            .from('fraud_alerts')
            .insert(alert)
            .select()
            .single();

          if (!alertError && alertData) {
            alerts.push(alertData);
          }
        }
      }

      return alerts;
    } catch (error) {
      console.error('Check for duplicates failed:', error);
      return [];
    }
  }

  // Extract text content from expense item
  private extractTextContent(expenseItem: ExpenseItem): string {
    const parts: string[] = [];
    
    if (expenseItem.description) parts.push(expenseItem.description);
    if (expenseItem.receipt_number) parts.push(expenseItem.receipt_number);
    if (expenseItem.merchant_name) parts.push(expenseItem.merchant_name);
    if (expenseItem.notes) parts.push(expenseItem.notes);
    
    // Add amount as string
    parts.push(expenseItem.amount.toString());
    
    // Add category if available
    if (expenseItem.category_name) parts.push(expenseItem.category_name);
    
    return parts.join(' ').toLowerCase().trim();
  }

  // Extract merchant information
  private extractMerchantInfo(expenseItem: ExpenseItem): any {
    return {
      name: expenseItem.merchant_name,
      tax_number: expenseItem.tax_number,
      phone: expenseItem.merchant_phone,
    };
  }

  // Generate hash for content
  private generateHash(content: string): string {
    // Simple hash function (in production, use a proper hashing library)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Calculate similarity between two receipt fingerprints
  private calculateSimilarity(
    fingerprint1: ReceiptFingerprint,
    fingerprint2: ReceiptFingerprint
  ): { confidence: number; factors: string[] } {
    const factors: string[] = [];
    let similarityScore = 0;
    let totalFactors = 0;

    // Compare content hash
    totalFactors += 40; // 40% weight for content similarity
    if (fingerprint1.hash_content === fingerprint2.hash_content) {
      similarityScore += 40;
      factors.push('نص الإيصال متطابق');
    } else {
      // Check text similarity
      const textSimilarity = this.calculateTextSimilarity(
        fingerprint1.extracted_text || '',
        fingerprint2.extracted_text || ''
      );
      similarityScore += textSimilarity * 0.4;
      if (textSimilarity > 70) {
        factors.push(`نص الإيصال متشابه (${textSimilarity.toFixed(1)}%)`);
      }
    }

    // Compare amounts
    totalFactors += 25; // 25% weight for amount similarity
    const amountDifference = Math.abs(fingerprint1.amount - fingerprint2.amount);
    const amountSimilarity = Math.max(0, 100 - (amountDifference / Math.max(fingerprint1.amount, fingerprint2.amount)) * 100);
    similarityScore += amountSimilarity * 0.25;
    if (amountSimilarity > 95) {
      factors.push(`المبلغ متطابق (${fingerprint1.amount})`);
    } else if (amountSimilarity > 80) {
      factors.push(`المبلغ متقارب (${fingerprint1.amount} - ${fingerprint2.amount})`);
    }

    // Compare timestamps
    totalFactors += 20; // 20% weight for time proximity
    const timeDifference = this.calculateTimeDifferenceHours(
      fingerprint1.timestamp,
      fingerprint2.timestamp
    );
    const timeSimilarity = Math.max(0, 100 - timeDifference * 4); // Decrease by 4% per hour
    similarityScore += timeSimilarity * 0.2;
    if (timeDifference < 1) {
      factors.push('وقت متقارب جداً (أقل من ساعة)');
    } else if (timeDifference < 6) {
      factors.push(`وقت متقارب (${timeDifference.toFixed(1)} ساعات)`);
    }

    // Compare locations
    if (fingerprint1.location && fingerprint2.location) {
      totalFactors += 15; // 15% weight for location similarity
      const distance = this.calculateDistance(fingerprint1.location, fingerprint2.location);
      const locationSimilarity = Math.max(0, 100 - distance * 20); // Decrease by 20% per km
      similarityScore += locationSimilarity * 0.15;
      if (distance < 0.1) {
        factors.push('موقع متطابق');
      } else if (distance < 1) {
        factors.push(`موقع متقارب (${distance.toFixed(2)} كم)`);
      }
    }

    const confidence = Math.min(100, (similarityScore / totalFactors) * 100);
    return { confidence, factors };
  }

  // Calculate text similarity using basic algorithms
  private calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;
    if (text1 === text2) return 100;

    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = Math.max(words1.length, words2.length);
    
    return totalWords > 0 ? (commonWords.length / totalWords) * 100 : 0;
  }

  // Calculate time difference in hours
  private calculateTimeDifferenceHours(time1: string, time2: string): number {
    const date1 = new Date(time1);
    const date2 = new Date(time2);
    return Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60);
  }

  // Calculate distance between two locations
  private calculateDistance(
    location1?: { lat: number; lng: number },
    location2?: { lat: number; lng: number }
  ): number {
    if (!location1 || !location2) return Infinity;

    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(location2.lat - location1.lat);
    const dLon = this.toRadians(location2.lng - location1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(location1.lat)) * Math.cos(this.toRadians(location2.lat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Assess risk level based on confidence score
  private assessRiskLevel(confidence: number): 'low' | 'medium' | 'high' | 'critical' {
    if (confidence >= 95) return 'critical';
    if (confidence >= 85) return 'high';
    if (confidence >= 70) return 'medium';
    return 'low';
  }

  // Get fraud alerts
  async getFraudAlerts(
    limit: number = 50,
    offset: number = 0,
    status?: string,
    fraudType?: string
  ): Promise<FraudAlert[]> {
    try {
      let query = supabase
        .from('fraud_alerts')
        .select(`
          *,
          expense_item:expense_items(*),
          duplicate_item:expense_items!fraud_alerts_duplicate_item_id_fkey(*)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      if (fraudType) {
        query = query.eq('fraud_type', fraudType);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Get fraud alerts failed:', error);
      return [];
    }
  }

  // Update fraud alert status
  async updateAlertStatus(
    alertId: string,
    status: FraudAlert['status'],
    reviewedBy: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('fraud_alerts')
        .update({
          status,
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
          notes,
        })
        .eq('id', alertId);

      return !error;
    } catch (error) {
      console.error('Update alert status failed:', error);
      return false;
    }
  }

  // Get fraud statistics
  async getFraudStatistics(): Promise<{
    totalAlerts: number;
    pendingAlerts: number;
    confirmedFraud: number;
    dismissedAlerts: number;
    riskLevelBreakdown: Record<string, number>;
    fraudTypeBreakdown: Record<string, number>;
  }> {
    try {
      const { data: alerts, error } = await supabase
        .from('fraud_alerts')
        .select('status, fraud_type, details');

      if (error) throw error;

      const stats = {
        totalAlerts: alerts?.length || 0,
        pendingAlerts: 0,
        confirmedFraud: 0,
        dismissedAlerts: 0,
        riskLevelBreakdown: {} as Record<string, number>,
        fraudTypeBreakdown: {} as Record<string, number>,
      };

      alerts?.forEach(alert => {
        if (alert.status === 'pending') stats.pendingAlerts++;
        if (alert.status === 'confirmed') stats.confirmedFraud++;
        if (alert.status === 'dismissed') stats.dismissedAlerts++;

        const riskLevel = alert.details?.risk_level || 'unknown';
        stats.riskLevelBreakdown[riskLevel] = (stats.riskLevelBreakdown[riskLevel] || 0) + 1;

        stats.fraudTypeBreakdown[alert.fraud_type] = (stats.fraudTypeBreakdown[alert.fraud_type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Get fraud statistics failed:', error);
      return {
        totalAlerts: 0,
        pendingAlerts: 0,
        confirmedFraud: 0,
        dismissedAlerts: 0,
        riskLevelBreakdown: {},
        fraudTypeBreakdown: {},
      };
    }
  }

  // Advanced pattern detection
  async detectAnomalousPatternsForUser(userId: string): Promise<FraudAlert[]> {
    try {
      const alerts: FraudAlert[] = [];
      
      // Get user's expense patterns from last 3 months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const { data: expenses, error } = await supabase
        .from('expense_items')
        .select(`
          *,
          expense_request:expense_requests(employee_id)
        `)
        .eq('expense_request.employee_id', userId)
        .gte('created_at', threeMonthsAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error || !expenses?.length) return alerts;

      // Check for unusual spending patterns
      const patterns = this.analyzeSpendingPatterns(expenses);
      
      // Flag unusual patterns
      if (patterns.unusualHighAmounts.length > 0) {
        // Create alerts for unusually high amounts
        for (const expense of patterns.unusualHighAmounts) {
          const alert: Omit<FraudAlert, 'id' | 'created_at'> = {
            expense_item_id: expense.id,
            duplicate_item_id: expense.id,
            confidence_score: patterns.anomalyScore,
            fraud_type: 'amount_manipulation',
            details: {
              amount_difference: expense.amount - patterns.averageAmount,
              risk_level: expense.amount > patterns.averageAmount * 3 ? 'critical' : 'high',
              similarity_factors: [`مبلغ غير عادي (${expense.amount} مقابل متوسط ${patterns.averageAmount.toFixed(2)})`],
            },
            status: 'pending',
          };

          const { data: alertData, error: alertError } = await supabase
            .from('fraud_alerts')
            .insert(alert)
            .select()
            .single();

          if (!alertError && alertData) {
            alerts.push(alertData);
          }
        }
      }

      return alerts;
    } catch (error) {
      console.error('Detect anomalous patterns failed:', error);
      return [];
    }
  }

  // Analyze spending patterns
  private analyzeSpendingPatterns(expenses: any[]): {
    averageAmount: number;
    standardDeviation: number;
    unusualHighAmounts: any[];
    anomalyScore: number;
  } {
    const amounts = expenses.map(e => e.amount);
    const averageAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    
    const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - averageAmount, 2), 0) / amounts.length;
    const standardDeviation = Math.sqrt(variance);
    
    const threshold = averageAmount + (2 * standardDeviation);
    const unusualHighAmounts = expenses.filter(e => e.amount > threshold);
    
    const anomalyScore = Math.min(100, (unusualHighAmounts.length / expenses.length) * 100 * 2);
    
    return {
      averageAmount,
      standardDeviation,
      unusualHighAmounts,
      anomalyScore,
    };
  }

  // Bulk check expenses for fraud
  async bulkCheckExpenses(expenseItems: ExpenseItem[]): Promise<FraudAlert[]> {
    const allAlerts: FraudAlert[] = [];
    
    for (const expense of expenseItems) {
      const alerts = await this.checkForDuplicates(expense);
      allAlerts.push(...alerts);
    }
    
    return allAlerts;
  }
}

export const fraudDetectionService = new FraudDetectionService();
export default fraudDetectionService;