use actix_files::{Files, NamedFile};
use actix_web::{web, App, HttpRequest, HttpServer, middleware::Logger};
use dotenv::dotenv;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

// 导入项目模块
mod api;
mod config;
mod db;
mod errors;
mod models;
mod services;
mod utils;
mod visualization;

use crate::config::app_config::Config;
use crate::db::connection::create_pool;
use crate::api::auth_handler;
use crate::api::user_handler;
use crate::api::news_handler;
use crate::api::recommendation_handler;
use crate::api::feedback_handler;
use crate::api::comment_handler;
use crate::api::interaction_handler;
use crate::api::system_info_handler;
use crate::services::crawler_service::init_crawler_scheduler;
use api::viz::{category_heat, model_performance, user_interest};

// --- OpenAPI Documentation Setup ---
#[derive(OpenApi)]
#[openapi(
    paths(
        api::auth_handler::register_user_handler,
        api::auth_handler::login_user_handler,
        api::user_handler::get_my_profile_handler,
        api::user_handler::update_my_profile_handler,
        api::news_handler::get_articles_handler,
        api::news_handler::get_article_by_id_handler,
        api::recommendation_handler::get_recommendations_handler,
        api::feedback_handler::submit_feedback_handler,
        api::feedback_handler::get_feedback_for_article_handler,
        api::comment_handler::post_comment_handler,
        api::comment_handler::get_comments_for_article_handler,
        api::comment_handler::delete_comment_handler,
        api::interaction_handler::create_interaction_handler,
        api::interaction_handler::get_article_interactions_handler,
        api::interaction_handler::get_user_interactions_handler,
        api::interaction_handler::add_to_favorites_handler,
        api::interaction_handler::remove_from_favorites_handler,
        api::interaction_handler::get_user_favorites_handler,
        api::interaction_handler::record_reading_history_handler,
        api::interaction_handler::get_user_feedback_history_handler,
        api::system_info_handler::get_system_status_handler,
    ),
    components(
        schemas(
            models::user::CreateUserSchema,
            models::user::LoginUserSchema,
            models::user::TokenResponse,
            models::user::User,
            models::user::UserProfileResponse,
            models::user::UpdateUserProfileSchema,
            models::article::Article,
            models::article::FeedbackData,
            models::article::Comment,
            models::article::CreateCommentSchema,
            models::article::UserFeedback,
            models::article::UserInteraction,
            models::article::CreateInteractionSchema,
            models::article::InteractionResponse,
            models::article::ArticleInteractionStats,
            models::article::UserFavorite,
            models::article::CreateFavoriteSchema,
            models::article::ReadingHistory,
            models::article::CreateReadingHistorySchema,
            models::article::UserFeedbackHistory,
            errors::ErrorResponse
        ),
    ),
    tags(
        (name = "Authentication", description = "User authentication endpoints"),
        (name = "User Profile", description = "User profile management endpoints"),
        (name = "News", description = "News article endpoints"),
        (name = "Recommendations", description = "Personalized news recommendations"),
        (name = "Feedback", description = "User feedback on articles"),
        (name = "Comments", description = "User comments on articles"),
        (name = "Interactions", description = "User interactions with articles"),
        (name = "Favorites", description = "User favorites management"),
        (name = "System", description = "System status and information")
    ),
    security(
        ("bearer_auth" = [])
    ),
)]
struct ApiDoc;

// 显式提供 `/viz` 路由页面
async fn viz_page(_req: HttpRequest) -> actix_web::Result<NamedFile> {
    Ok(NamedFile::open("./static/viz.html")?)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

    let app_config = Config::from_env().expect("Failed to load configuration");
    let db_pool = create_pool(&app_config.database_url)
        .await
        .expect("Failed to create database pool");

    init_crawler_scheduler(
        db_pool.clone(),
        &app_config.crawler_cron_expression,
    )
    .await
    .expect("Failed to init crawler");

    let addr = format!("{}:{}", app_config.server_address, app_config.server_port);
    log::info!("Starting server at http://{}", addr);

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(db_pool.clone()))
            .wrap(Logger::default())
            // 注册 API 路由
            .configure(auth_handler::init_auth_routes)
            .configure(user_handler::init_user_profile_routes)
            .configure(news_handler::init_news_routes)
            .service(
                web::scope("/api/v1")  // 前缀在这里定义
                .configure(news_handler::init_news_img_routes)
            )
            .configure(news_handler::init_news_img_routes)
            .configure(recommendation_handler::init_recommendation_routes)
            .configure(feedback_handler::init_feedback_routes)
            .configure(comment_handler::init_comment_routes)
            .configure(interaction_handler::init_interaction_routes)
            .configure(system_info_handler::init_system_info_routes)
            // 注册 viz 数据接口
            .service(category_heat)
            .service(model_performance)
            .service(user_interest)
            // Swagger UI
            .service(
                SwaggerUi::new("/swagger-ui/{_:.*}")
                    .url("/api-doc/openapi.json", ApiDoc::openapi()),
            )
            // 静态文件
            .service(Files::new("/static", "./static").show_files_listing())
            .route("/viz", web::get().to(viz_page))
            .service(Files::new("/", "./static").index_file("index.html"))
    })
    .bind(addr)?
    .run()
    .await
}
