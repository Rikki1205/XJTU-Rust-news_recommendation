use actix_web::{web, post, get, HttpResponse, Responder};
use uuid::Uuid;

use crate::db::connection::DbPool;
use crate::services::feedback_service::{submit_feedback_service, get_feedback_for_article_service};
use crate::models::article::{FeedbackData, UserFeedback}; // Ensure FeedbackType is correctly defined and imported
use crate::errors::ServiceError;
use crate::errors::ErrorResponse;
use crate::api::auth_handler::AuthenticatedUser;

#[utoipa::path(
    post,
    path = "/api/v1/feedback",
    request_body = FeedbackData,
    responses(
        (status = 201, description = "Feedback submitted successfully"),
        (status = 400, description = "Invalid input", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Article not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    )
)]
#[post("/feedback")]
pub async fn submit_feedback_handler(
    pool: web::Data<DbPool>,
    auth_user: AuthenticatedUser,
    body: web::Json<FeedbackData>,
) -> Result<impl Responder, ServiceError> {
    match submit_feedback_service(&pool, auth_user.user_id, body.into_inner()).await {
        Ok(_) => Ok(HttpResponse::Created().finish()), // Or return the created feedback if needed
        Err(e) => Err(e),
    }
}

#[utoipa::path(
    get,
    path = "/api/v1/feedback/article/{article_id}",
    params(
        ("article_id" = Uuid, Path, description = "ID of the article to retrieve feedback for")
    ),
    responses(
        (status = 200, description = "Feedback for article retrieved successfully", body = Vec<UserFeedback>),
        (status = 404, description = "Article not found or no feedback found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    )
    // No security for fetching public feedback counts, or add if only for admins/specific users
)]
#[get("/feedback/article/{article_id}")]
pub async fn get_feedback_for_article_handler(
    pool: web::Data<DbPool>,
    article_id: web::Path<Uuid>,
) -> Result<impl Responder, ServiceError> {
    match get_feedback_for_article_service(&pool, article_id.into_inner()).await {
        Ok(feedback_list) => Ok(HttpResponse::Ok().json(feedback_list)),
        Err(e) => Err(e),
    }
}

pub fn init_feedback_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/feedback")
            .service(submit_feedback_handler)
            .service(get_feedback_for_article_handler)
    );
}
