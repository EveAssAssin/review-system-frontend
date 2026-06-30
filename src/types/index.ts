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
  needs_service_evaluation?: boolean;
  total_reviews: number;
  positive_count: number;
  negative_count: number;
  other_count: number;
  avg_response_hours: number;
  synced_at?: string;
  created_at: string;
  updated_at: string;
}

/** 將數字型的評價編號格式化為顯示字串 (#0001) */
export const formatReviewNo = (n?: number | null): string =>
  n != null ? `#${String(n).padStart(4, '0')}` : '';

export interface Review {
  id: string;
  review_number?: number; // 自動遞增的顯示編號（#0001、#0002 ...）
  employee_id: string;
  employee_name?: string; // 部分 API 直接回傳（如 findByToken）
  employees?: {           // search / findById 回傳的巢狀物件
    name: string;
    store_name?: string;
    department?: string;
    app_number?: string;
  };
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
  immediate_response?: string;
  employee_notified: boolean;
  employee_notified_at?: string;
  manager_notified: boolean;
  manager_notified_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  responses?: ReviewResponse[];
  attachments?: ReviewAttachment[];
  // 洗評論摘要（後端 search/findById 自動 join）
  wash_task?: WashTaskSummary | null;
  close_reason?: 'normal' | 'wash_failed' | 'wash_completed' | null;
}

export interface WashTaskSummary {
  id: string;
  required_count: number;
  deadline: string;
  status: 'in_progress' | 'completed' | 'failed';
  approved_count: number;
  pending_review_count: number;
  has_pending_review: boolean;
  is_expired: boolean;
}

export interface WashTask {
  id: string;
  review_id: string;
  required_count: number;
  deadline: string;
  status: 'in_progress' | 'completed' | 'failed';
  completed_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WashUpload {
  id: string;
  task_id: string;
  slot_index: number;
  image_url?: string | null;
  status: 'pending' | 'uploaded' | 'approved' | 'rejected';
  uploaded_by?: string | null;
  uploaded_at?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  reject_reason?: string | null;
  created_at: string;
  updated_at: string;
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
  line: 'LINE',
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

export type ReviewType = 'positive' | 'negative' | 'other';
export type ReviewStatus = 'pending' | 'responded' | 'closed';

// ─── 客戶回報 ───────────────────────────────────────────
export interface FeedbackCategory {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FeedbackRecord {
  id: string;
  feedback_id: string;
  content: string;
  recorder_type: 'staff' | 'system';
  recorder_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerFeedback {
  id: string;
  feedback_type: string;
  client_id?: string;
  client_name: string;
  client_phone?: string;
  client_card?: string;
  category_id?: string;
  urgency: string;
  content?: string;
  source: string;
  status: string;
  assigned_employee_id?: string;
  employee_notified: boolean;
  employee_notified_at?: string;
  customer_sms_sent: boolean;
  customer_sms_sent_at?: string;
  close_note?: string;
  closed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // joins
  feedback_categories?: { id: string; name: string };
  employees?: { id: string; name: string; store_name?: string; department?: string };
  records?: FeedbackRecord[];
}

export const FEEDBACK_TYPE_LABELS: Record<string, string> = {
  suggestion: '建議',
  complaint: '投訴',
  praise: '稱讚',
  inquiry: '詢問',
  other: '其他',
};

export const FEEDBACK_STATUS_LABELS: Record<string, string> = {
  pending: '待處理',
  processing: '處理中',
  resolved: '已解決',
  closed: '已結案',
};

export const FEEDBACK_SOURCE_LABELS: Record<string, string> = {
  phone: '電話',
  walk_in: '到店',
  line: 'LINE',
  app: 'APP',
  web: '網路',
  other: '其他',
};

// ─── 服務評鑑 ───────────────────────────────────────────
export interface ServiceEvaluationScore {
  review_rate: number;
  review_rate_score: number;
  process_score: number;
  phone_score: number;
  deduction: number;
  total: number;
}

export interface ServiceEvaluation {
  id: string;
  employee_id: string;
  year_month: string;
  glasses_count: number;
  website_review_count: number;
  negative_review_count: number;
  google_low_star_count: number;
  service_process_score: number;
  phone_survey_score: number;
  cumulative_review_count?: number;
  // 電訪好評 — 錄音檔 + 文字稿
  phone_survey_audio_url?: string | null;
  phone_survey_audio_name?: string | null;
  phone_survey_audio_uploaded_at?: string | null;
  phone_survey_transcript?: string | null;
  phone_survey_transcript_status?: 'idle' | 'transcribing' | 'done' | 'failed';
  phone_survey_transcript_error?: string | null;
  // 新計分模式：員工自上傳 Google Map 評論截圖
  verified_screenshot_count?: number;
  scoring_mode?: 'legacy' | 'screenshot' | null;
  note?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  is_locked?: boolean;
  locked_at?: string | null;
  locked_by?: string | null;
  locked_score?: number | null;
  last_auto_sync_at?: string | null;
  score?: ServiceEvaluationScore;
  employees?: { id: string; name: string; store_name?: string; department?: string; app_number?: string };
}

export interface ServiceEvaluationOverviewRow {
  employee: { id: string; name: string; store_name?: string; department?: string; app_number?: string };
  evaluation: ServiceEvaluation | null;
}


// ── 評論截圖（新公式的核心物件）──────────────────────────
export type ReviewScreenshotStatus =
  | 'pending'         // AI 處理中
  | 'awaiting_pick'   // 多則需員工選一則
  | 'verified'        // 通過
  | 'rejected'        // 拒絕
  | 'needs_review';   // 待人工覆核

export interface ExtractedReview {
  reviewer_name: string;
  reviewer_review_count?: number | null;
  reviewer_is_local_guide?: boolean | null;
  star_count: number;
  posted_relative_time: string;
  posted_days_ago: number;
  has_new_badge?: boolean | null;
  content: string;
}

export interface ReviewScreenshot {
  id: string;
  employee_id: string;
  year_month: string;
  image_url?: string | null;
  image_name?: string | null;
  image_uploaded_at?: string | null;
  image_purged_at?: string | null;
  ai_raw_extraction?: {
    store_name?: string | null;
    store_matches_lohas?: boolean;
    reviews?: ExtractedReview[];
    overall_confidence?: number;
    notes?: string;
  } | null;
  ai_confidence?: number | null;
  ai_model?: string | null;
  store_name?: string | null;
  reviewer_name?: string | null;
  reviewer_review_count?: number | null;
  reviewer_is_local_guide?: boolean | null;
  star_count?: number | null;
  posted_relative_time?: string | null;
  posted_days_ago?: number | null;
  has_new_badge?: boolean | null;
  content?: string | null;
  content_hash?: string | null;
  status: ReviewScreenshotStatus;
  reject_reason?: string | null;
  warnings?: Array<{ type: string; message: string; [key: string]: any }> | null;
  duplicate_of?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  manual_status?: string | null;
  manual_reject_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceEvalScoringSettings {
  scoring_mode: 'legacy' | 'screenshot';
  level3_dedupe: boolean;
}
