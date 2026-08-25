terraform {
  required_version = ">= 1.9"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.23"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.9"
    }
  }

  # R2 S3-compatible backend.
  # Credentials: set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY to an R2 API token
  # (different from CLOUDFLARE_API_TOKEN — create one at R2 → Manage API tokens).
  # The tf-state bucket must exist before running terraform init.
  backend "s3" {
    bucket = "tf-state"
    key    = "kahel/terraform.tfstate"
    region = "auto"

    endpoints = {
      s3 = "https://a716135fbd2388307e0ba86b5fae8ceb.r2.cloudflarestorage.com"
    }

    skip_credentials_validation  = true
    skip_region_validation       = true
    skip_requesting_account_id   = true
    skip_metadata_api_check      = true
    skip_s3_checksum             = true
    use_path_style               = true
  }
}

# Reads CLOUDFLARE_API_TOKEN from environment — never hardcode here.
provider "cloudflare" {}

# Reads SUPABASE_ACCESS_TOKEN from environment.
provider "supabase" {
  access_token = var.supabase_access_token
}
