variable "cloudflare_account_id" {
  description = "Cloudflare account ID (Kahel Studio)"
  type        = string
}

variable "cloudflare_zone_id_production" {
  description = "Zone ID for kahelstudio.com"
  type        = string
}

variable "cloudflare_zone_id_staging" {
  description = "Zone ID for kahel.studio"
  type        = string
}

variable "supabase_access_token" {
  description = "Supabase personal access token (set via SUPABASE_ACCESS_TOKEN env var)"
  type        = string
  sensitive   = true
  default     = "" # overridden by TF_VAR_supabase_access_token env var in CI
}

variable "supabase_org_id" {
  description = "Supabase organisation ID"
  type        = string
}

variable "supabase_project_ref_staging" {
  description = "Supabase project ref for kahel-studio-staging-jp"
  type        = string
}

variable "supabase_project_ref_production" {
  description = "Supabase project ref for kahel-studio-production-jp"
  type        = string
}
