use actix_web::{web, get, HttpResponse, Responder};
use uuid::Uuid;
use crate::db::connection::DbPool;
//use crate::services::recommendation_service; // Assuming articles might be fetched via recommendation or a dedicated article service
use crate::errors::ServiceError;
use crate::errors::ErrorResponse;
use crate::models::article::Article;

use std::path::PathBuf;

#[utoipa::path(
    get,
    path = "/api/v1/news/articles",
    params(
        ("page" = Option<i64>, Query, description = "Page number for pagination"),
        ("limit" = Option<i64>, Query, description = "Number of items per page")
    ),
    responses(
        (status = 200, description = "List of articles retrieved successfully", body = Vec<Article>),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    )
)]
#[get("/articles")]
pub async fn get_articles_handler(
    pool: web::Data<DbPool>,
    query: web::Query<PaginationParams>,
) -> Result<impl Responder, ServiceError> {
    let client = pool.get().await.map_err(|_| ServiceError::InternalServerError("DB Pool error".to_string()))?;
    let raw_client: &tokio_postgres::Client = &*client; // ✅ 解引用转换为 tokio_postgres::Client

    match crate::db::article_queries::get_recent_articles(
        raw_client,
        Some(query.limit.unwrap_or(10)),
        Some(query.page.unwrap_or(1) - 1),
    ).await {
        Ok(articles) => Ok(HttpResponse::Ok().json(articles)),
        Err(e) => {
            log::error!("Failed to fetch articles: {}", e);
            Err(ServiceError::InternalServerError("Could not fetch articles".to_string()))
        }
    }
}


#[utoipa::path(
    get,
    path = "/api/v1/news/articles/{article_id}",
    params(
        ("article_id" = Uuid, Path, description = "ID of the article to retrieve")
    ),
    responses(
        (status = 200, description = "Article retrieved successfully", body = Article),
        (status = 404, description = "Article not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    )
)]
#[get("/articles/{article_id}")]
pub async fn get_article_by_id_handler(
    pool: web::Data<DbPool>,
    article_id: web::Path<Uuid>,
) -> Result<impl Responder, ServiceError> {
    let client = pool.get().await.map_err(|_| ServiceError::InternalServerError("DB Pool error".to_string()))?;
    let raw_client: &tokio_postgres::Client = &*client; // ✅ 同样转换

    match crate::db::article_queries::find_article_by_id(raw_client, article_id.into_inner()).await {
        Ok(Some(article)) => Ok(HttpResponse::Ok().json(article)),
        Ok(None) => Err(ServiceError::NotFound("Article not found".to_string())),
        Err(e) => {
            log::error!("Failed to fetch article by ID: {}", e);
            Err(ServiceError::InternalServerError("Could not fetch article".to_string()))
        }
    }
}

// #[derive(serde::Deserialize, ToSchema)]
#[derive(serde::Deserialize)]
pub struct ImageQuery {
    url: String,
}

#[utoipa::path(
    get,
    path = "/api/v1/images",
    params(
        ("url" = String, Query, description = "URL of the image to retrieve")
    ),
    responses(
        (status = 200, description = "Image retrieved successfully", content_type = "image/*"),
        (status = 404, description = "Image not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    )
)]
#[get("/images")]
pub async fn get_image_handler(
    pool: web::Data<DbPool>,
    query: web::Query<ImageQuery>,
) -> Result<impl actix_web::Responder, ServiceError> {
    let client = pool.get().await.map_err(|_| 
        ServiceError::InternalServerError("DB Pool error".to_string())
    )?;
    //let raw_client: &tokio_postgres::Client = &*client;
    // let raw_client = pool.get().await.map_err(|e| anyhow::anyhow!("DB Pool error: {}", e))?;
    log::info!("Fetching image start: {}", query.url);
    let raw_client = pool.get().await.map_err(|_| {
    ServiceError::InternalServerError("DB Pool error".to_string())})?;

    log::info!("Fetching image for URL: {}", query.url);
    match crate::db::article_queries::load_image_from_db(&raw_client, &query.url).await {
        Ok(Some(image)) => {
            // println!(
            //         "Image loaded - Type: {}, Size: {} bytes", 
            //         &image.content_type, 
            // );
            let filepath=PathBuf::from(&image.file_path);
            match tokio::fs::read(&filepath).await {
                Ok(data) => {
                    Ok(HttpResponse::Ok()
                        .content_type(image.clone().content_type)
                        .insert_header(("Cache-Control", "public, max-age=86400")) // 缓存1天
                        .body(data))},
                Err(_) => Err(ServiceError::NotFound("Image not found".to_string())),
            }  
        }
        Ok(None) => Err(ServiceError::NotFound("Image not found".to_string())),
        Err(e) => Err(ServiceError::DatabaseError(e)),
    }
}

// Helper struct for pagination query parameters (used in get_articles_handler)
#[derive(serde::Deserialize, utoipa::IntoParams)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

//pub fn init_news_routes(cfg: &mut web::ServiceConfig) {
//    cfg.service(
//        web::scope("/articles") // Base path for article-related routes
//            .service(get_articles_handler)
//            .service(get_article_by_id_handler)
//    );
//}

pub fn init_news_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1/news")
            .service(get_articles_handler)
            .service(get_article_by_id_handler)
    );
}

pub fn init_news_img_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(get_image_handler)
        ;
}

