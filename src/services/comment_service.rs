use uuid::Uuid;

use crate::db::connection::DbPool;
// use crate::db::comment_queries::{insert_comment, get_comments_by_article_id, delete_comment_by_id_and_user, find_comment_by_id};
use crate::db::comment_queries::{create_comment, get_comments_by_article_id, delete_comment, get_comment_by_id, get_comments_by_user_id};

use crate::models::article::{CreateCommentSchema, Comment};
use crate::errors::ServiceError;

pub async fn post_comment_service(
    pool: &DbPool,
    user_id: Uuid,
    comment_data: CreateCommentSchema,
) -> Result<Comment, ServiceError> {
    let client = pool.get().await.map_err(|e| {
        log::error!("Failed to get DB client from pool: {}", e);
        ServiceError::InternalServerError("Database connection error".to_string())
    })?;

    // Optionally, first check if the article_id exists in the articles table
    // match crate::db::article_queries::find_article_by_id(&client, comment_data.article_id).await? {
    //     Some(_) => { /* Article exists, proceed */ }
    //     None => return Err(ServiceError::NotFound("Article to comment on not found".to_string())),
    // }

    // insert_comment(&client, user_id, comment_data.article_id, &comment_data.content).await
    create_comment(&client, user_id, comment_data.article_id, &(comment_data.username.clone()),comment_data).await
        .map_err(|e| {
            log::error!("Failed to post comment to DB: {}", e);
            ServiceError::InternalServerError("Failed to post comment".to_string())
        })
}

pub async fn get_comments_for_article_service(
    pool: &DbPool,
    article_id: Uuid,
) -> Result<Vec<Comment>, ServiceError> {
    let client = pool.get().await.map_err(|e| {
        log::error!("Failed to get DB client from pool: {}", e);
        ServiceError::InternalServerError("Database connection error".to_string())
    })?;
    
    // 设置默认分页参数（例如：第1页，每页10条）
    let page = 1;
    let limit = 10;
    
    get_comments_by_article_id(&client, article_id, page, limit).await.map_err(|e| {
        log::error!("Failed to get comments from DB: {}", e);
        ServiceError::InternalServerError("Failed to retrieve comments".to_string())
    })
}

pub async fn get_user_comments_service(
    pool: &DbPool,
    user_id: Uuid,
    page: i64,
    limit: i64,
) -> Result<Vec<Comment>, ServiceError> {
    let client = pool.get().await.map_err(|e| {
        log::error!("Failed to get DB client from pool: {}", e);
        ServiceError::InternalServerError("Database connection error".to_string())
    })?;
    
    get_comments_by_user_id(&client, user_id, page, limit).await.map_err(|e| {
        log::error!("Failed to get user comments from DB: {}", e);
        ServiceError::InternalServerError("Failed to retrieve user comments".to_string())
    })
}

pub async fn delete_comment_service(
    pool: &DbPool,
    user_id: Uuid, // ID of the user requesting deletion
    comment_id: Uuid,
) -> Result<(), ServiceError> {
    let client = pool.get().await.map_err(|e| {
        log::error!("Failed to get DB client from pool: {}", e);
        ServiceError::InternalServerError("Database connection error".to_string())
    })?;

    // Optional: Check if the comment exists and if the user owns it or is an admin
    // This logic can be more complex depending on your permission model.
    // For simplicity, we assume the DB query handles ownership or admin rights.
    // match find_comment_by_id(&client, comment_id).await? {
    match get_comment_by_id(&client, comment_id).await? {
        Some(comment) => {
            if comment.user_id != user_id {
                // Add admin check here if needed: e.g., check if user_id has admin role
                return Err(ServiceError::Forbidden("You do not have permission to delete this comment".to_string()));
            }
        }
        None => return Err(ServiceError::NotFound("Comment not found".to_string())),
    }

    // let rows_affected = delete_comment_by_id_and_user(&client, comment_id, user_id).await.map_err(|e| {
    let rows_affected = delete_comment(&client, comment_id, user_id).await.map_err(|e| {
        log::error!("Failed to delete comment from DB: {}", e);
        ServiceError::InternalServerError("Failed to delete comment".to_string())
    })?;

    if rows_affected == 0 {
        // This could mean the comment didn't exist or the user_id didn't match (if query includes user_id check for deletion)
        Err(ServiceError::NotFound("Comment not found or permission denied for deletion".to_string()))
    } else {
        Ok(())
    }
}
