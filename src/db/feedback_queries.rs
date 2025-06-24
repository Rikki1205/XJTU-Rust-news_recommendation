use tokio_postgres::{Client, Error as PgError};
use uuid::Uuid;
use chrono::Utc;

//use crate::models::article::{Feedback, FeedbackType, CreateFeedbackSchema};
use crate::models::article::{Feedback, FeedbackType};

// Function to create or update feedback for an article by a user
pub async fn upsert_feedback(
    client: &Client,
    user_id: Uuid,
    article_id: Uuid,
    feedback_type: FeedbackType,
) -> Result<Feedback, PgError> {
    let feedback_id = Uuid::new_v4();
    let now = Utc::now();
    let feedback_type_str = feedback_type.as_str();

    // Using ON CONFLICT to update if feedback already exists for this user and article
    let row = client.query_one(
        "INSERT INTO feedback (id, user_id, article_id, feedback_type, created_at) \
         VALUES ($1, $2, $3, $4, $5) \
         ON CONFLICT (user_id, article_id) DO UPDATE \
         SET feedback_type = EXCLUDED.feedback_type, created_at = EXCLUDED.created_at \
         RETURNING id, user_id, article_id, feedback_type, created_at",
        &[&feedback_id, &user_id, &article_id, &feedback_type_str, &now]
    ).await?;

    Ok(Feedback {
        id: row.get(0),
        user_id: row.get(1),
        article_id: row.get(2),
        feedback_type: FeedbackType::from(row.get::<_, String>(3).as_str()), // Ensure correct conversion
        created_at: row.get(4),
    })
}

// Function to get feedback for an article by a user
pub async fn get_feedback_by_user_and_article(
    client: &Client,
    user_id: Uuid,
    article_id: Uuid,
) -> Result<Option<Feedback>, PgError> {
    let row_option = client.query_opt(
        "SELECT id, user_id, article_id, feedback_type, created_at FROM feedback WHERE user_id = $1 AND article_id = $2",
        &[&user_id, &article_id]
    ).await?;

    if let Some(row) = row_option {
        Ok(Some(Feedback {
            id: row.get(0),
            user_id: row.get(1),
            article_id: row.get(2),
            feedback_type: FeedbackType::from(row.get::<_, String>(3).as_str()),
            created_at: row.get(4),
        }))
    } else {
        Ok(None)
    }
}

// Function to get all feedback by a user (optional, if needed for user profile)
pub async fn get_feedback_by_user(client: &Client, user_id: Uuid) -> Result<Vec<Feedback>, PgError> {
    let rows = client.query(
        "SELECT id, user_id, article_id, feedback_type, created_at FROM feedback WHERE user_id = $1 ORDER BY created_at DESC",
        &[&user_id]
    ).await?;

    Ok(rows.into_iter().map(|row| Feedback {
        id: row.get(0),
        user_id: row.get(1),
        article_id: row.get(2),
        feedback_type: FeedbackType::from(row.get::<_, String>(3).as_str()),
        created_at: row.get(4),
    }).collect())
}

// Function to get all feedback for a given article
pub async fn get_feedback_by_article_id(
    client: &Client,
    article_id: Uuid,
) -> Result<Vec<Feedback>, PgError> {
    let rows = client.query(
        "SELECT id, user_id, article_id, feedback_type, created_at \
         FROM feedback WHERE article_id = $1 ORDER BY created_at DESC",
        &[&article_id]
    ).await?;

    Ok(rows.into_iter().map(|row| Feedback {
        id: row.get(0),
        user_id: row.get(1),
        article_id: row.get(2),
        feedback_type: FeedbackType::from(row.get::<_, String>(3).as_str()),
        created_at: row.get(4),
    }).collect())
}
