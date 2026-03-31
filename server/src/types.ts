export type EventName = 'variant_view' | 'cta_click' | 'form_submit';

export interface ABEvent {
  event_name: EventName;
  test_id: string;
  landing_id: string;
  variant_id: string;
  session_id: string;
  timestamp: string;
  cta_id?: string;
  form_id?: string;
  page_url?: string;
}

export interface VariantReport {
  variant_id: string;
  views: number;
  clicks: number;
  submits: number;
  ctr: number;
  submit_rate: number;
}

export interface TestReport {
  test_id: string;
  variants: VariantReport[];
  generated_at: string;
}
