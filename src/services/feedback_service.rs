use uuid::Uuid;

use crate::db::connection::DbPool;
use crate::db::feedback_queries::{upsert_feedback, get_feedback_by_article_id};

use crate::models::article::{FeedbackData, UserFeedback};
use crate::models::article::Feedback;
use crate::errors::ServiceError;

pub async fn submit_feedback_service(
    pool: &DbPool,
    user_id: Uuid,
    feedback_data: FeedbackData,
) -> Result<(), ServiceError> {
    let client = pool.get().await.map_err(|e| {
        log::error!("Failed to get DB client from pool: {}", e);
        ServiceError::InternalServerError("Database connection error".to_string())
    })?;

    upsert_feedback(&client, user_id, feedback_data.article_id, feedback_data.feedback_type).await
    .map(|_| ())
    .map_err(|e| {
        log::error!("Failed to submit feedback to DB: {}", e);
        ServiceError::InternalServerError("Failed to submit feedback".to_string())
    })
}

pub async fn get_feedback_for_article_service(
    pool: &DbPool,
    article_id: Uuid,
) -> Result<Vec<UserFeedback>, ServiceError> {
    let client = pool.get().await.map_err(|e| {
        log::error!("Failed to get DB client from pool: {}", e);
        ServiceError::InternalServerError("Database connection error".to_string())
    })?;

    let feedback_list: Vec<Feedback> = get_feedback_by_article_id(&client, article_id)
        .await
        .map_err(|e| {
            log::error!("Failed to get feedback from DB: {}", e);
            ServiceError::InternalServerError("Failed to retrieve feedback".to_string())
        })?;

    let user_feedback_list: Vec<UserFeedback> = feedback_list.into_iter()
        .map(|f| UserFeedback {
            article_id: f.article_id,
            user_id: f.user_id,
            feedback_type: f.feedback_type,
            created_at: f.created_at,
        })
        .collect();

    Ok(user_feedback_list)
}

