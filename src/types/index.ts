export interface Employee {
  id: string;
  erpid: string;
  app_number?: string;
  name: string;
  jobtitle?: string;
  store_id?: string;
  store_name?: string;
  department?: string;
  line_uid?: string;
  is_active: boolean;
  total_reviews: number;
  positive_count: number;
  negative_count: number;
  other_count: number;
  avg_response_hours: number;
  synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  employee_id: string;
  employee_name?: string;
  is_proxy: boolean;
  actual_employee_id?: string;
  source: string;
  review_type: string;
  urgency: string;
  event_date?: string;
  content?: string;
  content_transcript?: string;
  requires_response: boolean;
  response_token?: string;
  response_deadline?: string;
  responded_at?: string;
  response_speed_hours?: number;
  status: string;
  closed_at?: string;
  closed_by?: string;
  close_note?: string;
  employee_notified: boolean;
  employee_notified_at?: string;
  manager_notified: boolean;
  manager_notified_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  responses?: ReviewResponse[];
  attachments?: ReviewAttachment[];
}

export interface ReviewResponse {
  id: string;
  review_id: string;
  employee_id: string;
  content?: string;
  responder_type: string;
  responder_name?: string;
  attachments?: unknown;
  created_at: string;
  updated_at: string;
}

export interface ReviewAttachment {
  id: string;
  review_id: string;
  file_type: string;
  file_name?: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  transcript?: string;
  transcript_status: string;
  uploaded_by: string;
  uploaded_by_id?: string;
  created_at: string;
}

export interface User {
  id: string;
  employee_id?: string;
  erpid?: string;
  name: string;
  role: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  rule_type: string;
  threshold: number;
  period_days: number;
  notify_employee: boolean;
  notify_managers: boolean;
  message_template?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlertLog {
  id: string;
  alert_rule_id: string;
  employee_id: string;
  triggered_count: number;
  message_sent?: string;
  notified_employee: boolean;
  notified_managers: boolean;
  created_at: string;
}

export interface Manager {
  id: string;
  employee_id?: string;
  name: string;
  line_uid?: string;
  notification_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const SOURCE_LABELS: Record<string, string> = {
  google_map: 'Google MAP',
  facebook: 'Facebook',
  phone: '電話客服',
  app: 'APP 客服',
  other: '其他',
};

export const TYPE_LABELS: Record<string, string> = {
  positive: '正評',
  negative: '負評',
  other: '其他',
};

export const URGENCY_LABELS: Record<string, string> = {
  urgent_plus: '特急',
  urgent: '緊急',
  normal: '普通',
};

export const STATUS_LABELS: Record<string, string> = {
  pending: '待處理',
  responded: '已回覆',
  closed: '已結案',
};
