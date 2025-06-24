use actix_web::{web, post, get, delete, HttpResponse, Responder};
use uuid::Uuid;
use serde::Deserialize;

use crate::db::connection::DbPool;
use crate::services::comment_service::{post_comment_service, get_comments_for_article_service, delete_comment_service, get_user_comments_service};
use crate::models::article::{CreateCommentSchema, Comment}; // Ensure Comment model is correctly defined
use crate::errors::ServiceError;
use crate::errors::ErrorResponse;
use crate::api::auth_handler::AuthenticatedUser;

#[derive(Deserialize)]
pub struct CommentQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[utoipa::path(
    post,
    path = "/api/v1/comments",
    request_body = CreateCommentSchema,
    responses(
        (status = 201, description = "Comment posted successfully", body = Comment),
        (status = 400, description = "Invalid input", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Article not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    )
)]
#[post("/comments")]
pub async fn post_comment_handler(
    pool: web::Data<DbPool>,
    auth_user: AuthenticatedUser,
    body: web::Json<CreateCommentSchema>,
) -> Result<impl Responder, ServiceError> {
    match post_comment_service(&pool, auth_user.user_id, body.into_inner()).await {
        Ok(comment) => Ok(HttpResponse::Created().json(comment)),
        Err(e) => Err(e),
    }
}

#[utoipa::path(
    get,
    path = "/api/v1/comments/article/{article_id}",
    params(
        ("article_id" = Uuid, Path, description = "ID of the article to retrieve comments for")
    ),
    responses(
        (status = 200, description = "Comments for article retrieved successfully", body = Vec<Comment>),
        (status = 404, description = "Article not found or no comments found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    )
    // No security for fetching public comments, or add if only for admins/specific users
)]
#[get("/comments/article/{article_id}")]
pub async fn get_comments_for_article_handler(
    pool: web::Data<DbPool>,
    article_id: web::Path<Uuid>,
) -> Result<impl Responder, ServiceError> {
    match get_comments_for_article_service(&pool, article_id.into_inner()).await {
        Ok(comments) => Ok(HttpResponse::Ok().json(comments)),
        Err(e) => Err(e),
    }
}

#[utoipa::path(
    get,
    path = "/api/v1/comments/users/comments",
    params(
        ("page" = Option<i64>, Query, description = "Page number"),
        ("limit" = Option<i64>, Query, description = "Items per page")
    ),
    responses(
        (status = 200, description = "User comments retrieved successfully", body = Vec<Comment>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    )
)]
#[get("/users/comments")]
pub async fn get_user_comments_handler(
    pool: web::Data<DbPool>,
    auth_user: AuthenticatedUser,
    query: web::Query<CommentQuery>,
) -> Result<impl Responder, ServiceError> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    
    match get_user_comments_service(&pool, auth_user.user_id, page, limit).await {
        Ok(comments) => Ok(HttpResponse::Ok().json(comments)),
        Err(e) => Err(e),
    }
}

#[utoipa::path(
    delete,
    path = "/api/v1/comments/{comment_id}",
    params(
        ("comment_id" = Uuid, Path, description = "ID of the comment to delete")
    ),
    responses(
        (status = 204, description = "Comment deleted successfully"),
        (status = 401, description = "Unauthorized (user does not own comment or is not admin)", body = ErrorResponse),
        (status = 403, description = "Forbidden (user does not have permission)", body = ErrorResponse),
        (status = 404, description = "Comment not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    )
)]
#[delete("/comments/{comment_id}")]
pub async fn delete_comment_handler(
    pool: web::Data<DbPool>,
    auth_user: AuthenticatedUser,
    comment_id: web::Path<Uuid>,
) -> Result<impl Responder, ServiceError> {
    match delete_comment_service(&pool, auth_user.user_id, comment_id.into_inner()).await {
        Ok(_) => Ok(HttpResponse::NoContent().finish()),
        Err(e) => Err(e),
    }
}

pub fn init_comment_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/comments")
            .service(post_comment_handler)
            .service(get_comments_for_article_handler)
            .service(get_user_comments_handler)
            .service(delete_comment_handler)
    );
}
