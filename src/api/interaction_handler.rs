use actix_web::{web, post, get, delete, HttpResponse, Responder};
use uuid::Uuid;
use serde::Deserialize;

use crate::db::connection::DbPool;
use crate::services::interaction_service::{
    create_or_update_interaction_service, get_article_stats_service,
    get_user_interactions_service, add_to_favorites_service,
    remove_from_favorites_service, get_user_favorites_service,
    record_reading_history_service, get_user_feedback_history_service
};
use crate::models::article::{
    CreateInteractionSchema, CreateFavoriteSchema, CreateReadingHistorySchema,
    InteractionResponse, ArticleInteractionStats, UserInteraction,
    UserFavorite, ReadingHistory, UserFeedbackHistory
};
use crate::errors::ServiceError;
use crate::errors::ErrorResponse;
use crate::api::auth_handler::AuthenticatedUser;

#[derive(Deserialize)]
pub struct InteractionQuery {
    pub interaction_type: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Deserialize)]
pub struct FavoriteQuery {
    pub folder_name: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Deserialize)]
pub struct FeedbackHistoryQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[utoipa::path(
    post,
    path = "/api/v1/interactions/interactions",
    request_body = CreateInteractionSchema,
    responses(
        (status = 200, description = "Interaction created/updated successfully", body = InteractionResponse),
        (status = 400, description = "Invalid input", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    )
)]
#[post("/interactions")]
pub async fn create_interaction_handler(
    pool: web::Data<DbPool>,
    auth_user: AuthenticatedUser,
    body: web::Json<CreateInteractionSchema>,
) -> Result<impl Responder, ServiceError> {
    match create_or_update_interaction_service(&pool, auth_user.user_id, body.into_inner()).await {
        Ok(response) => Ok(HttpResponse::Ok().json(response)),
        Err(e) => Err(e),
    }
}

#[utoipa::path(
    get,
    path = "/api/v1/interactions/articles/{article_id}/interactions",
    params(
        ("article_id" = Uuid, Path, description = "Article ID")
    ),
    responses(
        (status = 200, description = "Article interaction statistics", body = ArticleInteractionStats),
        (status = 404, description = "Article not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    )
)]
#[get("/articles/{article_id}/interactions")]
pub async fn get_article_interactions_handler(
    pool: web::Data<DbPool>,
    path: web::Path<Uuid>,
    auth_user: Option<AuthenticatedUser>,
) -> Result<impl Responder, ServiceError> {
    let article_id = path.into_inner();
    let user_id = auth_user.map(|u| u.user_id);
    
    match get_article_stats_service(&pool, article_id, user_id).await {
        Ok(stats) => Ok(HttpResponse::Ok().json(stats)),
        Err(e) => Err(e),
    }
}

#[utoipa::path(
    get,
    path = "/api/v1/interactions/users/interactions",
    params(
        ("interaction_type" = Option<String>, Query, description = "Filter by interaction type"),
        ("page" = Option<i64>, Query, description = "Page number"),
        ("limit" = Option<i64>, Query, description = "Items per page")
    ),
    responses(
        (status = 200, description = "User interactions", body = Vec<UserInteraction>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    )
)]
#[get("/users/interactions")]
pub async fn get_user_interactions_handler(
    pool: web::Data<DbPool>,
    auth_user: AuthenticatedUser,
    query: web::Query<InteractionQuery>,
) -> Result<impl Responder, ServiceError> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    
    match get_user_interactions_service(&pool, auth_user.user_id, query.interaction_type.clone(), page, limit).await {
        Ok(interactions) => Ok(HttpResponse::Ok().json(interactions)),
        Err(e) => Err(e),
    }
}

#[utoipa::path(
    post,
    path = "/api/v1/interactions/favorites",
    request_body = CreateFavoriteSchema,
    responses(
        (status = 201, description = "Added to favorites successfully", body = UserFavorite),
        (status = 400, description = "Invalid input", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    )
)]
#[post("/favorites")]
pub async fn add_to_favorites_handler(
    pool: web::Data<DbPool>,
    auth_user: AuthenticatedUser,
    body: web::Json<CreateFavoriteSchema>,
) -> Result<impl Responder, ServiceError> {
    match add_to_favorites_service(&pool, auth_user.user_id, body.into_inner()).await {
        Ok(favorite) => Ok(HttpResponse::Created().json(favorite)),
        Err(e) => Err(e),
    }
}

#[utoipa::path(
    delete,
    path = "/api/v1/interactions/favorites/{article_id}",
    params(
        ("article_id" = Uuid, Path, description = "Article ID to remove from favorites")
    ),
    responses(
        (status = 200, description = "Removed from favorites successfully"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Favorite not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    )
)]
#[delete("/favorites/{article_id}")]
pub async fn remove_from_favorites_handler(
    pool: web::Data<DbPool>,
    auth_user: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<impl Responder, ServiceError> {
    let article_id = path.into_inner();
    
    match remove_from_favorites_service(&pool, auth_user.user_id, article_id).await {
        Ok(_) => Ok(HttpResponse::Ok().json(serde_json::json!({"message": "Removed from favorites successfully"}))),
        Err(e) => Err(e),
    }
}

#[utoipa::path(
    get,
    path = "/api/v1/interactions/favorites",
    params(
        ("folder_name" = Option<String>, Query, description = "Filter by folder name"),
        ("page" = Option<i64>, Query, description = "Page number"),
        ("limit" = Option<i64>, Query, description = "Items per page")
    ),
    responses(
        (status = 200, description = "User favorites", body = Vec<UserFavorite>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    )
)]
#[get("/favorites")]
pub async fn get_user_favorites_handler(
    pool: web::Data<DbPool>,
    auth_user: AuthenticatedUser,
    query: web::Query<FavoriteQuery>,
) -> Result<impl Responder, ServiceError> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    
    match get_user_favorites_service(&pool, auth_user.user_id, query.folder_name.clone(), page, limit).await {
        Ok(favorites) => Ok(HttpResponse::Ok().json(favorites)),
        Err(e) => Err(e),
    }
}

#[utoipa::path(
    post,
    path = "/api/v1/interactions/reading-history",
    request_body = CreateReadingHistorySchema,
    responses(
        (status = 201, description = "Reading history recorded successfully", body = ReadingHistory),
        (status = 400, description = "Invalid input", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    )
)]
#[post("/reading-history")]
pub async fn record_reading_history_handler(
    pool: web::Data<DbPool>,
    auth_user: AuthenticatedUser,
    body: web::Json<CreateReadingHistorySchema>,
) -> Result<impl Responder, ServiceError> {
    match record_reading_history_service(&pool, auth_user.user_id, body.into_inner()).await {
        Ok(history) => Ok(HttpResponse::Created().json(history)),
        Err(e) => Err(e),
    }
}

#[utoipa::path(
    get,
    path = "/api/v1/interactions/users/feedback-history",
    params(
        ("page" = Option<i64>, Query, description = "Page number"),
        ("limit" = Option<i64>, Query, description = "Items per page")
    ),
    responses(
        (status = 200, description = "User feedback history", body = UserFeedbackHistory),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    )
)]
#[get("/users/feedback-history")]
pub async fn get_user_feedback_history_handler(
    pool: web::Data<DbPool>,
    auth_user: AuthenticatedUser,
    query: web::Query<FeedbackHistoryQuery>,
) -> Result<impl Responder, ServiceError> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    
    match get_user_feedback_history_service(&pool, auth_user.user_id, page, limit).await {
        Ok(history) => Ok(HttpResponse::Ok().json(history)),
        Err(e) => Err(e),
    }
}

// 配置互动相关路由
pub fn init_interaction_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1/interactions")
            .service(create_interaction_handler)
            .service(get_article_interactions_handler)
            .service(get_user_interactions_handler)
            .service(add_to_favorites_handler)
            .service(remove_from_favorites_handler)
            .service(get_user_favorites_handler)
            .service(record_reading_history_handler)
            .service(get_user_feedback_history_handler)
    );
} 