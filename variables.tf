variable "database_url" {
  description = "Supabase connection string"
  type        = string
  sensitive   = true
}

variable "nextauth_secret" {
  description = "Secret for NextAuth.js"
  type        = string
  sensitive   = true
}

variable "google_api_key" {
  description = "Gemini API Key"
  type        = string
  sensitive   = true
}

variable "pinecone_api_key" {
  description = "Pinecone API Key"
  type        = string
  sensitive   = true
}

variable "pinecone_index" {
  description = "Pinecone Index Name"
  type        = string
}

variable "line_channel_access_token" {
  description = "LINE Channel Access Token"
  type        = string
  sensitive   = true
}

variable "line_channel_secret" {
  description = "LINE Channel Secret"
  type        = string
  sensitive   = true
}

variable "auth_google_id" {
  description = "Google OAuth Client ID"
  type        = string
}

variable "auth_google_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  sensitive   = true
}

variable "auth_line_id" {
  description = "LINE Login Channel ID"
  type        = string
}

variable "auth_line_secret" {
  description = "LINE Login Channel Secret"
  type        = string
  sensitive   = true
}

variable "google_picker_api_key" {
  description = "Google Cloud API Key for Picker (Browser key)"
  type        = string
  sensitive   = true
}

variable "serper_api_key" {
  description = "Serper API Key"
  type        = string
  sensitive   = true
}

variable "google_cse_id" {
  description = "Google Custom Search Engine ID"
  type        = string
  sensitive   = true
}

variable "next_public_stripe_publishable_key" {
  description = "Stripe Publishable Key"
  type        = string
}

variable "stripe_secret_key" {
  description = "Stripe Secret Key"
  type        = string
  sensitive   = true
}

variable "stripe_price_id_standard_monthly" { type = string }
variable "stripe_price_id_standard_yearly" { type = string }
variable "stripe_price_id_premium_monthly" { type = string }
variable "stripe_price_id_premium_yearly" { type = string }
variable "stripe_price_id_ticket_90" { type = string }

variable "stripe_webhook_secret" {
  description = "Stripe Webhook Signing Secret"
  type        = string
  sensitive   = true
}

variable "firebase_api_key" {
  description = "Firebase API Key"
  type        = string
  sensitive   = true
}

variable "firebase_auth_domain" {
  description = "Firebase Auth Domain"
  type        = string
}

variable "firebase_project_id" {
  description = "Firebase Project ID"
  type        = string
}

variable "firebase_storage_bucket" {
  description = "Firebase Storage Bucket"
  type        = string
}

variable "firebase_messaging_sender_id" {
  description = "Firebase Messaging Sender ID"
  type        = string
}

variable "firebase_app_id" {
  description = "Firebase App ID"
  type        = string
}

variable "firebase_measurement_id" {
  description = "Firebase Measurement ID"
  type        = string
  default     = ""
}

variable "firebase_service_account_key" {
  description = "Path to the Firebase Service Account Key JSON or the content itself"
  type        = string
  # sensitive   = true  # 必要に応じて追加
}
variable "tavily_api_key" {
  description = "Tavily API Key"
  type        = string
  sensitive   = true
}