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
