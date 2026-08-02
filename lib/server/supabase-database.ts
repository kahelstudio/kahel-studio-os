export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row extends Record<string, unknown>> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };

type ClientRow = { id: string; name: string; status: string; external_ref: string; primary_contact_profile_id: string | null; created_at: string; updated_at: string };
type ProfileRow = { id: string; client_id: string; user_id: string | null; email: string; normalized_email: string; first_name: string; last_name: string; mobile: string | null; status: string; email_verified_at: string | null; created_at: string; updated_at: string };
type BookingRow = { id: string; client_id: string; client_profile_id: string; idempotency_key: string; reference: string; service_type: string; service_id: string; service_date: string; service_time: string; location: string; payment_type: string; currency: string; subtotal_amount_php: number; total_amount_php: number; paid_amount_php: number; refunded_amount_php: number; status: string; payment_status: string; completed_at: string | null; attendance: string; kind: string; duplicate_of: string | null; loyalty_exclusion_reason: string | null; loyalty_excluded_by: string | null; loyalty_excluded_at: string | null; reward_id: string | null; paymongo_checkout_session_id: string | null; paymongo_checkout_url: string | null; paymongo_payment_intent_id: string | null; paymongo_checkout_expires_at: string | null; checkout_creation_started_at: string | null; created_at: string; updated_at: string };
type ProjectRow = { id: string; client_id: string; booking_id: string | null; reference: string; title: string; description: string | null; status: string; starts_at: string | null; completed_at: string | null; created_at: string; updated_at: string };
type InvoiceRow = { id: string; client_id: string; project_id: string | null; reference: string; currency: string; subtotal_amount_php: number; tax_amount_php: number; total_amount_php: number; paid_amount_php: number; status: string; issued_at: string | null; due_at: string | null; paid_at: string | null; created_at: string; updated_at: string };
type GalleryRow = { id: string; client_id: string; project_id: string; booking_id: string | null; slug: string; title: string; description: string | null; status: string; access_rule: string; published: boolean; published_at: string | null; downloads_enabled: boolean; favorites_enabled: boolean; selections_enabled: boolean; watermark_enabled: boolean; expires_at: string | null; session_date: string | null; cover_media_asset_id: string | null; created_by: string | null; created_at: string; updated_at: string };
type GalleryAssetRow = { id: string; gallery_id: string; client_id: string; media_asset_id: string | null; storage_path: string; asset_type: string; title: string | null; alt_text: string | null; caption: string | null; sort_order: number; width: number | null; height: number | null; visibility: string; approval_status: string; downloadable: boolean; download_variant: string; created_at: string; updated_at: string };
type MediaAssetRow = { id: string; client_id: string | null; project_id: string | null; private_r2_key: string | null; public_r2_key: string | null; cloudflare_image_id: string | null; original_filename: string; original_extension: string | null; mime_type: string; byte_size: number | null; width: number | null; height: number | null; aspect_ratio: number | null; focal_x: number | null; focal_y: number | null; checksum_sha256: string | null; alt_text: string | null; decorative: boolean; caption: string | null; usage_type: string; visibility: string; status: string; processing_failure_code: string | null; processing_failure_message: string | null; source_asset_id: string | null; created_by: string | null; updated_by: string | null; uploaded_at: string | null; processed_at: string | null; dominant_color: string | null; created_at: string; updated_at: string };
type GalleryFavoriteRow = { gallery_id: string; gallery_asset_id: string; client_id: string; client_profile_id: string; created_at: string };
type GallerySelectionRow = { gallery_id: string; gallery_asset_id: string; client_id: string; client_profile_id: string; submission_status: string; note: string | null; submitted_at: string | null; created_at: string; updated_at: string };
type GalleryActivityRow = { id: number; gallery_id: string; client_id: string; client_profile_id: string | null; actor_user_id: string | null; event_type: string; gallery_asset_id: string | null; metadata: Json; created_at: string };
type MediaUploadSessionRow = { id: string; client_id: string | null; project_id: string | null; created_by: string | null; upload_token_hash: string; expected_mime_type: string | null; expected_byte_size: number | null; private_r2_key: string; status: string; expires_at: string; completed_asset_id: string | null; failure_message: string | null; created_at: string; updated_at: string };
type MediaProcessingJobRow = { id: string; media_asset_id: string; client_id: string | null; job_type: string; idempotency_key: string; status: string; attempts: number; available_at: string; locked_at: string | null; locked_by: string | null; finished_at: string | null; last_error: string | null; input: Json; output: Json | null; created_at: string; updated_at: string };
type GalleryDownloadArchiveRow = { id: string; gallery_id: string; client_id: string; requested_by_profile_id: string | null; idempotency_key: string; status: string; private_r2_key: string | null; byte_size: number | null; expires_at: string | null; failure_message: string | null; created_at: string; updated_at: string };
type GalleryEmailOutboxRow = { id: string; gallery_id: string; client_id: string; recipient_profile_id: string; template_key: string; idempotency_key: string; payload: Json; status: string; attempts: number; available_at: string; processing_at: string | null; sent_at: string | null; provider_message_id: string | null; last_error: string | null; created_at: string; updated_at: string };
type MessageRow = { id: string; client_id: string; sender_profile_id: string | null; project_id: string | null; sender: string; body: string; read_at: string | null; created_at: string };
type AuditRow = { id: string; client_id: string | null; client_profile_id: string | null; actor_user_id: string | null; actor_type: string; action: string; entity_type: string; entity_id: string | null; request_id: string | null; ip_address: string | null; user_agent: string | null; metadata: Json; created_at: string };
type ResolutionRow = { id: string; auth_user_id: string | null; normalized_email: string; candidate_profile_ids: string[]; reason: string; status: string; resolution: Json | null; resolved_by: string | null; resolved_at: string | null; created_at: string; updated_at: string };
type RateLimitRow = { scope: string; key_hash: string; window_started_at: string; attempts: number; expires_at: string; updated_at: string };
type StaffProfileRow = { user_id: string; role: string; display_name: string; active: boolean; can_manage_bookings: boolean; can_manage_loyalty: boolean; can_manage_rewards: boolean; can_manage_galleries: boolean; created_at: string; updated_at: string };
type ServiceRow = { id: string; code: string; name: string; active: boolean; created_at: string; updated_at: string };
type LoyaltyProgramRow = { id: string; code: string; name: string; launch_date: string; active: boolean; threshold: number; reward_service_id: string; expires_after: string | null; retroactive: boolean; created_at: string; updated_at: string };
type LoyaltyRewardRow = { id: string; client_id: string; program_id: string; sequence: number; threshold: number; service_id: string; status: string; issued_at: string; reserved_at: string | null; redeemed_at: string | null; voided_at: string | null; expires_at: string | null; review_required: boolean; review_reason: string | null; updated_at: string };
type LoyaltyEligibilityRow = { booking_id: string; program_id: string; client_id: string; state: string; contribution: number; reason_code: string; evaluated_at: string };
type LoyaltyEventRow = { id: number; booking_id: string | null; program_id: string; client_id: string; event_key: string; event_type: string; delta: number; reason_code: string; created_at: string };
type LoyaltyOutboxRow = { id: string; reward_id: string; client_id: string; template_key: string; payload: Json; status: string; attempts: number; available_at: string; processing_at: string | null; sent_at: string | null; provider_message_id: string | null; last_error: string | null; created_at: string; updated_at: string };
type LoyaltyTermsRow = { id: string; program_id: string; version: number; effective_at: string; body: string; published_at: string | null; created_at: string };
type LoyaltyAuditRow = { id: number; actor_user_id: string | null; action: string; entity_type: string; entity_id: string; reason: string; previous_data: Json; new_data: Json; created_at: string };

export type Database = {
  public: {
    Tables: {
      clients: Table<ClientRow>;
      client_profiles: Table<ProfileRow>;
      bookings: Table<BookingRow>;
      projects: Table<ProjectRow>;
      invoices: Table<InvoiceRow>;
      galleries: Table<GalleryRow>;
      gallery_assets: Table<GalleryAssetRow>;
      media_assets: Table<MediaAssetRow>;
      gallery_favorites: Table<GalleryFavoriteRow>;
      gallery_selections: Table<GallerySelectionRow>;
      gallery_activity: Table<GalleryActivityRow>;
      media_upload_sessions: Table<MediaUploadSessionRow>;
      media_processing_jobs: Table<MediaProcessingJobRow>;
      gallery_download_archives: Table<GalleryDownloadArchiveRow>;
      gallery_email_outbox: Table<GalleryEmailOutboxRow>;
      customer_messages: Table<MessageRow>;
      customer_audit_log: Table<AuditRow>;
      customer_identity_resolution_cases: Table<ResolutionRow>;
      customer_auth_rate_limits: Table<RateLimitRow>;
      staff_profiles: Table<StaffProfileRow>;
      services: Table<ServiceRow>;
      loyalty_programs: Table<LoyaltyProgramRow>;
      loyalty_rewards: Table<LoyaltyRewardRow>;
      loyalty_booking_eligibility: Table<LoyaltyEligibilityRow>;
      loyalty_booking_events: Table<LoyaltyEventRow>;
      loyalty_email_outbox: Table<LoyaltyOutboxRow>;
      loyalty_terms_versions: Table<LoyaltyTermsRow>;
      loyalty_audit_log: Table<LoyaltyAuditRow>;
    };
    Views: Record<string, never>;
    Functions: {
      consume_customer_auth_rate_limit: {
        Args: { requested_scope: string; requested_key_hash: string; maximum_attempts: number; window_duration: string };
        Returns: Array<{ allowed: boolean; attempts: number; retry_at: string }>;
      };
      customer_owns_client: { Args: { requested_client_id: string }; Returns: boolean };
      claim_booking_checkout: { Args: { requested_booking_id: string }; Returns: boolean };
      loyalty_set_booking_exclusion: { Args: { requested_booking_id: string; excluded: boolean; reason: string }; Returns: BookingRow };
      loyalty_transition_reward: { Args: { requested_reward_id: string; requested_status: "available" | "reserved" | "redeemed" | "cancelled"; reason: string }; Returns: LoyaltyRewardRow };
      loyalty_issue_manual_reward: { Args: { requested_client_id: string; reason: string }; Returns: LoyaltyRewardRow };
      loyalty_correct_progress: { Args: { requested_client_id: string; requested_eligible_count: number; reason: string }; Returns: number };
      loyalty_create_reward_booking: { Args: { requested_client_id: string; requested_profile_id: string; requested_reward_id: string; requested_idempotency_key: string; requested_reference: string; requested_date: string; requested_time: string; requested_location: string }; Returns: BookingRow };
      loyalty_claim_email: { Args: { requested_outbox_id?: string | null }; Returns: LoyaltyOutboxRow | null };
      loyalty_finish_email: { Args: { requested_outbox_id: string; succeeded: boolean; provider_id?: string | null; failure?: string | null }; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
