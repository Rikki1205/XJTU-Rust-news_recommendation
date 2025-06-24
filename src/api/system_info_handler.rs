use actix_web::{get, HttpResponse, Responder, web};
use crate::errors::ServiceError;
use crate::errors::ErrorResponse;
use crate::db::connection::DbPool;

#[utoipa::path(
    get,
    path = "/api/v1/system/status",
    responses(
        (status = 200, description = "System is operational", body = SystemStatusResponse),
        (status = 503, description = "Service unavailable (e.g., DB connection issue)", body = ErrorResponse)
    )
)]
#[get("/system/status")]
pub async fn get_system_status_handler(pool: web::Data<DbPool>) -> Result<impl Responder, ServiceError> {
    // Try to get a connection from the pool as a basic health check
    match pool.get().await {
        Ok(_) => {
            let response = SystemStatusResponse {
                status: "OK".to_string(),
                message: "System is operational".to_string(),
                database_connected: true,
            };
            Ok(HttpResponse::Ok().json(response))
        }
        Err(e) => {
            log::error!("Database health check failed: {}", e);
            let response = SystemStatusResponse {
                status: "Error".to_string(),
                message: "System is experiencing issues (database connection failed)".to_string(),
                database_connected: false,
            };
            // Return 200 OK with error status in body, or 503 Service Unavailable
            // For a status endpoint, often 200 OK with detailed status is preferred over a hard 503 unless it's a load balancer check.
            Ok(HttpResponse::Ok().json(response)) 
            // Or to return 503:
            // Err(ServiceError::ServiceUnavailable("Database connection failed".to_string()))
        }
    }
}

#[derive(serde::Serialize, utoipa::ToSchema)]
pub struct SystemStatusResponse {
    status: String,
    message: String,
    database_connected: bool,
}

pub fn init_system_info_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(get_system_status_handler);
}
