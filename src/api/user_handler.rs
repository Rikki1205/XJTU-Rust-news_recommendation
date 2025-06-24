use actix_web::{web, get, put, HttpResponse, Responder};
// use uuid::Uuid; // Already in auth_handler, but good to have if this module is standalone

use crate::services::user_service::{get_user_profile_service, update_user_profile_service};
use crate::db::connection::DbPool;
use crate::errors::ServiceError;
use crate::errors::ErrorResponse;
use crate::models::user::{UserProfileResponse, UpdateUserProfileSchema};
use crate::api::auth_handler::AuthenticatedUser; // Re-use the AuthenticatedUser from auth_handler

#[utoipa::path(
    get,
    path = "/api/v1/users/profile/me",
    responses(
        (status = 200, description = "User profile retrieved successfully", body = UserProfileResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "User not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    )
)]
#[get("/profile/me")]
pub async fn get_my_profile_handler(
    pool: web::Data<DbPool>,
    auth_user: AuthenticatedUser, // Extracts user_id from token
) -> Result<impl Responder, ServiceError> {
    match get_user_profile_service(&pool, auth_user.user_id).await {
        Ok(profile) => Ok(HttpResponse::Ok().json(profile)),
        Err(e) => Err(e),
    }
}

#[utoipa::path(
    put,
    path = "/api/v1/users/profile/me",
    request_body = UpdateUserProfileSchema,
    responses(
        (status = 200, description = "User profile updated successfully", body = UserProfileResponse),
        (status = 400, description = "Invalid input / No update data provided", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "User not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    )
)]
#[put("/profile/me")]
pub async fn update_my_profile_handler(
    pool: web::Data<DbPool>,
    auth_user: AuthenticatedUser,
    body: web::Json<UpdateUserProfileSchema>,
) -> Result<impl Responder, ServiceError> {
    match update_user_profile_service(&pool, auth_user.user_id, body.into_inner()).await {
        Ok(profile) => Ok(HttpResponse::Ok().json(profile)),
        Err(e) => Err(e),
    }
}

pub fn init_user_profile_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1/users") // Base path for user-related routes
            .service(get_my_profile_handler)
            .service(update_my_profile_handler)
    );
}
