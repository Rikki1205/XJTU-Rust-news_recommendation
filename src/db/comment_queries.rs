use tokio_postgres::{Client, Error as PgError};
use uuid::Uuid;
use chrono::Utc;

use crate::models::article::{Comment, CreateCommentSchema};

// Function to create a new comment
pub async fn create_comment(
    client: &Client,
    user_id: Uuid,
    article_id: Uuid,
    username: &str, // Denormalized for easier retrieval, or join with users table
    comment_data: CreateCommentSchema,
) -> Result<Comment, PgError> {
    let comment_id = Uuid::new_v4();
    let now = Utc::now();

    let row = client.query_one(
        "INSERT INTO comments (id, user_id, article_id, username, content, parent_comment_id, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) \
         RETURNING id, user_id, article_id, username, content, parent_comment_id, created_at, updated_at",
        &[
            &comment_id,
            &user_id,
            &article_id,
            &username, // Store username directly for now
            &comment_data.content,
            &comment_data.parent_comment_id,
            &now,
            &now,
        ]
    ).await?;

    Ok(Comment {
        id: row.get(0),
        user_id: row.get(1),
        article_id: row.get(2),
        username: row.get(3),
        content: row.get(4),
        parent_comment_id: row.get(5),
        created_at: row.get(6),
        updated_at: row.get(7),
    })
}

// Function to get comments for an article (supports basic pagination)
pub async fn get_comments_by_article_id(
    client: &Client,
    article_id: Uuid,
    page: i64, // 1-based page number
    limit: i64,
) -> Result<Vec<Comment>, PgError> {
    let offset = (page - 1) * limit;
    let rows = client.query(
        "SELECT id, user_id, article_id, username, content, parent_comment_id, created_at, updated_at \
         FROM comments \
         WHERE article_id = $1 \
         ORDER BY created_at DESC \
         LIMIT $2 OFFSET $3",
        &[&article_id, &limit, &offset]
    ).await?;

    Ok(rows.into_iter().map(|row| Comment {
        id: row.get(0),
        user_id: row.get(1),
        article_id: row.get(2),
        username: row.get(3),
        content: row.get(4),
        parent_comment_id: row.get(5),
        created_at: row.get(6),
        updated_at: row.get(7),
    }).collect())
}

// Function to count comments for an article (for pagination metadata)
pub async fn count_comments_by_article_id(client: &Client, article_id: Uuid) -> Result<i64, PgError> {
    let row = client.query_one("SELECT COUNT(*) FROM comments WHERE article_id = $1", &[&article_id]).await?;
    Ok(row.get(0))
}


// Function to delete a comment (only by owner or admin)
pub async fn delete_comment(
    client: &Client,
    comment_id: Uuid,
    user_id: Uuid, // To verify ownership
) -> Result<u64, PgError> { // Returns the number of rows deleted
    client.execute(
        "DELETE FROM comments WHERE id = $1 AND user_id = $2",
        &[&comment_id, &user_id]
    ).await
}

// Function to get a single comment by ID (e.g., to check parent comment existence or ownership)
pub async fn get_comment_by_id(client: &Client, comment_id: Uuid) -> Result<Option<Comment>, PgError> {
    let row_option = client.query_opt(
        "SELECT id, user_id, article_id, username, content, parent_comment_id, created_at, updated_at FROM comments WHERE id = $1",
        &[&comment_id]
    ).await?;

    if let Some(row) = row_option {
        Ok(Some(Comment {
            id: row.get(0),
            user_id: row.get(1),
            article_id: row.get(2),
            username: row.get(3),
            content: row.get(4),
            parent_comment_id: row.get(5),
            created_at: row.get(6),
            updated_at: row.get(7),
        }))
    } else {
        Ok(None)
    }
}

// Function to get comments by user ID (supports pagination)
pub async fn get_comments_by_user_id(
    client: &Client,
    user_id: Uuid,
    page: i64, // 1-based page number
    limit: i64,
) -> Result<Vec<Comment>, PgError> {
    let offset = (page - 1) * limit;
    let rows = client.query(
        "SELECT c.id, c.user_id, c.article_id, c.username, c.content, c.parent_comment_id, c.created_at, c.updated_at \
         FROM comments c \
         WHERE c.user_id = $1 \
         ORDER BY c.created_at DESC \
         LIMIT $2 OFFSET $3",
        &[&user_id, &limit, &offset]
    ).await?;

    Ok(rows.into_iter().map(|row| Comment {
        id: row.get(0),
        user_id: row.get(1),
        article_id: row.get(2),
        username: row.get(3),
        content: row.get(4),
        parent_comment_id: row.get(5),
        created_at: row.get(6),
        updated_at: row.get(7),
    }).collect())
}

// Function to count comments by user ID (for pagination metadata)
pub async fn count_comments_by_user_id(client: &Client, user_id: Uuid) -> Result<i64, PgError> {
    let row = client.query_one("SELECT COUNT(*) FROM comments WHERE user_id = $1", &[&user_id]).await?;
    Ok(row.get(0))
}

