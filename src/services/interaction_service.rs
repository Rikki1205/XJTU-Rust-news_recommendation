use uuid::Uuid;

use crate::db::connection::DbPool;
use crate::db::interaction_queries::{
    upsert_user_interaction, get_article_interaction_stats, get_user_interactions,
    add_to_favorites, remove_from_favorites, get_user_favorites,
    upsert_reading_history, get_user_feedback_history
};
use crate::models::article::{
    CreateInteractionSchema, UserInteraction, ArticleInteractionStats,
    CreateFavoriteSchema, UserFavorite, CreateReadingHistorySchema,
    ReadingHistory, UserFeedbackHistory, InteractionResponse
};
use crate::errors::ServiceError;

// 创建或更新用户互动
pub async fn create_or_update_interaction_service(
    pool: &DbPool,
    user_id: Uuid,
    interaction_data: CreateInteractionSchema,
) -> Result<InteractionResponse, ServiceError> {
    let client = pool.get().await.map_err(|e| {
        log::error!("Failed to get DB client from pool: {}", e);
        ServiceError::InternalServerError("Database connection error".to_string())
    })?;

    match upsert_user_interaction(&client, user_id, interaction_data).await {
        Ok(interaction) => {
            let message = if interaction.is_active {
                format!("{}成功", match interaction.interaction_type.as_str() {
                    "like" => "点赞",
                    "favorite" => "收藏",
                    _ => "互动",
                })
            } else {
                format!("取消{}成功", match interaction.interaction_type.as_str() {
                    "like" => "点赞",
                    "favorite" => "收藏",
                    _ => "互动",
                })
            };

            Ok(InteractionResponse {
                success: true,
                message,
                interaction: Some(interaction),
            })
        }
        Err(e) => {
            log::error!("Failed to create/update interaction: {}", e);
            Err(ServiceError::InternalServerError("Failed to process interaction".to_string()))
        }
    }
}

// 获取文章互动统计
pub async fn get_article_stats_service(
    pool: &DbPool,
    article_id: Uuid,
    user_id: Option<Uuid>,
) -> Result<ArticleInteractionStats, ServiceError> {
    let client = pool.get().await.map_err(|e| {
        log::error!("Failed to get DB client from pool: {}", e);
        ServiceError::InternalServerError("Database connection error".to_string())
    })?;

    get_article_interaction_stats(&client, article_id, user_id).await
        .map_err(|e| {
            log::error!("Failed to get article stats: {}", e);
            ServiceError::InternalServerError("Failed to get article statistics".to_string())
        })
}

// 获取用户互动记录
pub async fn get_user_interactions_service(
    pool: &DbPool,
    user_id: Uuid,
    interaction_type: Option<String>,
    page: i64,
    limit: i64,
) -> Result<Vec<UserInteraction>, ServiceError> {
    let client = pool.get().await.map_err(|e| {
        log::error!("Failed to get DB client from pool: {}", e);
        ServiceError::InternalServerError("Database connection error".to_string())
    })?;

    get_user_interactions(&client, user_id, interaction_type, page, limit).await
        .map_err(|e| {
            log::error!("Failed to get user interactions: {}", e);
            ServiceError::InternalServerError("Failed to get user interactions".to_string())
        })
}

// 添加到收藏夹
pub async fn add_to_favorites_service(
    pool: &DbPool,
    user_id: Uuid,
    favorite_data: CreateFavoriteSchema,
) -> Result<UserFavorite, ServiceError> {
    let client = pool.get().await.map_err(|e| {
        log::error!("Failed to get DB client from pool: {}", e);
        ServiceError::InternalServerError("Database connection error".to_string())
    })?;

    add_to_favorites(&client, user_id, favorite_data).await
        .map_err(|e| {
            log::error!("Failed to add to favorites: {}", e);
            ServiceError::InternalServerError("Failed to add to favorites".to_string())
        })
}

// 从收藏夹移除
pub async fn remove_from_favorites_service(
    pool: &DbPool,
    user_id: Uuid,
    article_id: Uuid,
) -> Result<(), ServiceError> {
    let client = pool.get().await.map_err(|e| {
        log::error!("Failed to get DB client from pool: {}", e);
        ServiceError::InternalServerError("Database connection error".to_string())
    })?;

    let rows_affected = remove_from_favorites(&client, user_id, article_id).await
        .map_err(|e| {
            log::error!("Failed to remove from favorites: {}", e);
            ServiceError::InternalServerError("Failed to remove from favorites".to_string())
        })?;

    if rows_affected == 0 {
        Err(ServiceError::NotFound("Favorite not found".to_string()))
    } else {
        Ok(())
    }
}

// 获取用户收藏夹
pub async fn get_user_favorites_service(
    pool: &DbPool,
    user_id: Uuid,
    folder_name: Option<String>,
    page: i64,
    limit: i64,
) -> Result<Vec<UserFavorite>, ServiceError> {
    let client = pool.get().await.map_err(|e| {
        log::error!("Failed to get DB client from pool: {}", e);
        ServiceError::InternalServerError("Database connection error".to_string())
    })?;

    get_user_favorites(&client, user_id, folder_name, page, limit).await
        .map_err(|e| {
            log::error!("Failed to get user favorites: {}", e);
            ServiceError::InternalServerError("Failed to get user favorites".to_string())
        })
}

// 记录阅读历史
pub async fn record_reading_history_service(
    pool: &DbPool,
    user_id: Uuid,
    reading_data: CreateReadingHistorySchema,
) -> Result<ReadingHistory, ServiceError> {
    let client = pool.get().await.map_err(|e| {
        log::error!("Failed to get DB client from pool: {}", e);
        ServiceError::InternalServerError("Database connection error".to_string())
    })?;

    upsert_reading_history(&client, user_id, reading_data).await
        .map_err(|e| {
            log::error!("Failed to record reading history: {}", e);
            ServiceError::InternalServerError("Failed to record reading history".to_string())
        })
}

// 获取用户反馈历史
pub async fn get_user_feedback_history_service(
    pool: &DbPool,
    user_id: Uuid,
    page: i64,
    limit: i64,
) -> Result<UserFeedbackHistory, ServiceError> {
    let client = pool.get().await.map_err(|e| {
        log::error!("Failed to get DB client from pool: {}", e);
        ServiceError::InternalServerError("Database connection error".to_string())
    })?;

    get_user_feedback_history(&client, user_id, page, limit).await
        .map_err(|e| {
            log::error!("Failed to get user feedback history: {}", e);
            ServiceError::InternalServerError("Failed to get user feedback history".to_string())
        })
} 