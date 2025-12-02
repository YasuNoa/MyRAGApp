provider "google" {
  project = "myragapp-479606"
  region  = "asia-northeast1"
}

# --- Backend Service (Python) ---
resource "google_cloud_run_service" "backend" {
  name     = "myragapp-backend"
  location = "asia-northeast1"

  template {
    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = "0"
        "autoscaling.knative.dev/maxScale" = "5"
      }
    }
    spec {
      containers {
        image = "gcr.io/myragapp-479606/myragapp-backend"
        resources {
          limits = {
            memory = "512Mi"
            cpu    = "1000m"
          }
        }
        env {
          name  = "DATABASE_URL"
          value = var.database_url
        }
        env {
          name  = "GOOGLE_API_KEY"
          value = var.google_api_key
        }
        env {
          name  = "PINECONE_API_KEY"
          value = var.pinecone_api_key
        }
        env {
          name  = "PINECONE_INDEX"
          value = var.pinecone_index
        }
        env {
          name  = "TZ"
          value = "Asia/Tokyo"
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# Allow public access to Backend
resource "google_cloud_run_service_iam_member" "backend_public" {
  service  = google_cloud_run_service.backend.name
  location = google_cloud_run_service.backend.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# --- Frontend Service (Next.js) ---
resource "google_cloud_run_service" "frontend" {
  name     = "myragapp-frontend"
  location = "asia-northeast1"

  template {
    spec {
      containers {
        image = "gcr.io/myragapp-479606/myragapp-frontend"
        env {
          name  = "NEXT_PUBLIC_API_URL"
          value = google_cloud_run_service.backend.status[0].url
        }
        env {
          name  = "DATABASE_URL"
          value = var.database_url
        }
        env {
          name  = "NEXTAUTH_SECRET"
          value = var.nextauth_secret
        }
        # NEXTAUTH_URL will be set after the first deploy or via custom domain
        env {
            name = "NEXTAUTH_URL"
            value = "https://jibun-ai.com" # Placeholder for initial deploy
        }
        env {
          name = "AUTH_TRUST_HOST"
          value = "true"
        }
        
        # Google OAuth
        env {
          name = "AUTH_GOOGLE_ID"
          value = var.auth_google_id
        }
        env {
          name = "AUTH_GOOGLE_SECRET"
          value = var.auth_google_secret
        }

        # LINE Login
        env {
          name = "AUTH_LINE_ID"
          value = var.auth_line_id
        }
        env {
          name = "AUTH_LINE_SECRET"
          value = var.auth_line_secret
        }

        # LINE Messaging API
        env {
          name = "LINE_CHANNEL_ACCESS_TOKEN"
          value = var.line_channel_access_token
        }
        env {
          name = "LINE_CHANNEL_SECRET"
          value = var.line_channel_secret
        }
        
        # Public vars for Google Picker
        env {
          name = "NEXT_PUBLIC_GOOGLE_API_KEY"
          value = var.google_picker_api_key
        }
        env {
          name  = "NEXT_PUBLIC_GOOGLE_CLIENT_ID"
          value = var.auth_google_id
        }
        env {
          name  = "PYTHON_BACKEND_URL"
          value = google_cloud_run_service.backend.status[0].url
        }
        env {
          name  = "GOOGLE_API_KEY"
          value = var.google_api_key
        }
        env {
          name  = "TZ"
          value = "Asia/Tokyo"
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# Allow public access to Frontend
resource "google_cloud_run_service_iam_member" "frontend_public" {
  service  = google_cloud_run_service.frontend.name
  location = google_cloud_run_service.frontend.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# --- Outputs ---
output "backend_url" {
  value = google_cloud_run_service.backend.status[0].url
}

output "frontend_url" {
  value = google_cloud_run_service.frontend.status[0].url
}

# --- Secret Manager ---
resource "google_secret_manager_secret" "database_url" {
  secret_id = "database_url"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "database_url_version" {
  secret = google_secret_manager_secret.database_url.id
  secret_data = var.database_url
}

# Grant Cloud Build access to secrets
data "google_project" "project" {}

resource "google_project_iam_member" "cloudbuild_secrets" {
  project = data.google_project.project.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
}
