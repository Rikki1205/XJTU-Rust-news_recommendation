use tokio_postgres::{Client, Error as PgError};
use uuid::Uuid;
use chrono::Utc;

use crate::models::article::{
    UserInteraction, CreateInteractionSchema, ArticleInteractionStats, 
    UserInteractionSummary, UserFavorite, CreateFavoriteSchema,
    ReadingHistory, CreateReadingHistorySchema, UserFeedbackHistory,
    UserFeedbackWithArticle, CommentWithArticle, UserInteractionWithArticle,
    UserFeedback, Comment
};

// 创建或更新用户互动
pub async fn upsert_user_interaction(
    client: &Client,
    user_id: Uuid,
    interaction_data: CreateInteractionSchema,
) -> Result<UserInteraction, PgError> {
    let interaction_id = Uuid::new_v4();
    let now = Utc::now();

    let row = client.query_one(
        "INSERT INTO user_interactions (id, user_id, article_id, interaction_type, is_active, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7) \
         ON CONFLICT (user_id, article_id, interaction_type) DO UPDATE \
         SET is_active = EXCLUDED.is_active, updated_at = EXCLUDED.updated_at \
         RETURNING id, user_id, article_id, interaction_type, is_active, created_at, updated_at",
        &[
            &interaction_id,
            &user_id,
            &interaction_data.article_id,
            &interaction_data.interaction_type,
            &interaction_data.is_active,
            &now,
            &now,
        ]
    ).await?;

    Ok(UserInteraction {
        id: row.get(0),
        user_id: row.get(1),
        article_id: row.get(2),
        interaction_type: row.get(3),
        is_active: row.get(4),
        created_at: row.get(5),
        updated_at: row.get(6),
    })
}

// 获取文章的互动统计
pub async fn get_article_interaction_stats(
    client: &Client,
    article_id: Uuid,
    user_id: Option<Uuid>,
) -> Result<ArticleInteractionStats, PgError> {
    // 获取文章统计数据
    let stats_row = client.query_one(
        "SELECT like_count, comment_count, favorite_count FROM articles WHERE id = $1",
        &[&article_id]
    ).await?;

    let like_count: i32 = stats_row.get(0);
    let comment_count: i32 = stats_row.get(1);
    let favorite_count: i32 = stats_row.get(2);

    // 如果提供了用户ID，获取用户的互动状态
    let user_interaction = if let Some(uid) = user_id {
        let interaction_rows = client.query(
            "SELECT interaction_type, is_active FROM user_interactions \
             WHERE user_id = $1 AND article_id = $2 AND is_active = TRUE",
            &[&uid, &article_id]
        ).await?;

        let mut liked = false;
        let mut favorited = false;

        for row in interaction_rows {
            let interaction_type: String = row.get(0);
            let is_active: bool = row.get(1);
            
            if is_active {
                match interaction_type.as_str() {
                    "like" => liked = true,
                    "favorite" => favorited = true,
                    _ => {}
                }
            }
        }

        // 检查是否有评论
        let comment_count_row = client.query_one(
            "SELECT COUNT(*) FROM comments WHERE user_id = $1 AND article_id = $2",
            &[&uid, &article_id]
        ).await?;
        let commented: i64 = comment_count_row.get(0);

        Some(UserInteractionSummary {
            liked,
            favorited,
            commented: commented > 0,
        })
    } else {
        None
    };

    Ok(ArticleInteractionStats {
        article_id,
        like_count,
        comment_count,
        favorite_count,
        user_interaction,
    })
}

// 获取用户的互动记录
pub async fn get_user_interactions(
    client: &Client,
    user_id: Uuid,
    interaction_type: Option<String>,
    page: i64,
    limit: i64,
) -> Result<Vec<UserInteraction>, PgError> {
    let offset = (page - 1) * limit;
    
    let (query, params): (String, Vec<&(dyn tokio_postgres::types::ToSql + Sync)>) = if let Some(itype) = &interaction_type {
        (
            "SELECT id, user_id, article_id, interaction_type, is_active, created_at, updated_at \
             FROM user_interactions \
             WHERE user_id = $1 AND interaction_type = $2 AND is_active = TRUE \
             ORDER BY updated_at DESC \
             LIMIT $3 OFFSET $4".to_string(),
            vec![&user_id, itype, &limit, &offset]
        )
    } else {
        (
            "SELECT id, user_id, article_id, interaction_type, is_active, created_at, updated_at \
             FROM user_interactions \
             WHERE user_id = $1 AND is_active = TRUE \
             ORDER BY updated_at DESC \
             LIMIT $2 OFFSET $3".to_string(),
            vec![&user_id, &limit, &offset]
        )
    };

    let rows = client.query(&query, &params).await?;

    Ok(rows.into_iter().map(|row| UserInteraction {
        id: row.get(0),
        user_id: row.get(1),
        article_id: row.get(2),
        interaction_type: row.get(3),
        is_active: row.get(4),
        created_at: row.get(5),
        updated_at: row.get(6),
    }).collect())
}

// 添加到收藏夹
pub async fn add_to_favorites(
    client: &Client,
    user_id: Uuid,
    favorite_data: CreateFavoriteSchema,
) -> Result<UserFavorite, PgError> {
    let favorite_id = Uuid::new_v4();
    let now = Utc::now();
    let folder_name = favorite_data.folder_name.unwrap_or_else(|| "default".to_string());

    let row = client.query_one(
        "INSERT INTO user_favorites (id, user_id, article_id, folder_name, created_at) \
         VALUES ($1, $2, $3, $4, $5) \
         ON CONFLICT (user_id, article_id) DO UPDATE \
         SET folder_name = EXCLUDED.folder_name \
         RETURNING id, user_id, article_id, folder_name, created_at",
        &[&favorite_id, &user_id, &favorite_data.article_id, &folder_name, &now]
    ).await?;

    Ok(UserFavorite {
        id: row.get(0),
        user_id: row.get(1),
        article_id: row.get(2),
        folder_name: row.get(3),
        created_at: row.get(4),
    })
}

// 从收藏夹移除
pub async fn remove_from_favorites(
    client: &Client,
    user_id: Uuid,
    article_id: Uuid,
) -> Result<u64, PgError> {
    client.execute(
        "DELETE FROM user_favorites WHERE user_id = $1 AND article_id = $2",
        &[&user_id, &article_id]
    ).await
}

// 获取用户收藏夹
pub async fn get_user_favorites(
    client: &Client,
    user_id: Uuid,
    folder_name: Option<String>,
    page: i64,
    limit: i64,
) -> Result<Vec<UserFavorite>, PgError> {
    let offset = (page - 1) * limit;
    
    let (query, params): (String, Vec<&(dyn tokio_postgres::types::ToSql + Sync)>) = if let Some(folder) = &folder_name {
        (
            "SELECT id, user_id, article_id, folder_name, created_at \
             FROM user_favorites \
             WHERE user_id = $1 AND folder_name = $2 \
             ORDER BY created_at DESC \
             LIMIT $3 OFFSET $4".to_string(),
            vec![&user_id, folder, &limit, &offset]
        )
    } else {
        (
            "SELECT id, user_id, article_id, folder_name, created_at \
             FROM user_favorites \
             WHERE user_id = $1 \
             ORDER BY created_at DESC \
             LIMIT $2 OFFSET $3".to_string(),
            vec![&user_id, &limit, &offset]
        )
    };

    let rows = client.query(&query, &params).await?;

    Ok(rows.into_iter().map(|row| UserFavorite {
        id: row.get(0),
        user_id: row.get(1),
        article_id: row.get(2),
        folder_name: row.get(3),
        created_at: row.get(4),
    }).collect())
}

// 记录阅读历史
pub async fn upsert_reading_history(
    client: &Client,
    user_id: Uuid,
    reading_data: CreateReadingHistorySchema,
) -> Result<ReadingHistory, PgError> {
    let history_id = Uuid::new_v4();
    let now = Utc::now();

    let row = client.query_one(
        "INSERT INTO reading_history (id, user_id, article_id, read_duration, read_percentage, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7) \
         ON CONFLICT (user_id, article_id) DO UPDATE \
         SET read_duration = GREATEST(reading_history.read_duration, EXCLUDED.read_duration), \
             read_percentage = GREATEST(reading_history.read_percentage, EXCLUDED.read_percentage), \
             updated_at = EXCLUDED.updated_at \
         RETURNING id, user_id, article_id, read_duration, read_percentage, created_at, updated_at",
        &[
            &history_id,
            &user_id,
            &reading_data.article_id,
            &reading_data.read_duration,
            &reading_data.read_percentage,
            &now,
            &now,
        ]
    ).await?;

    Ok(ReadingHistory {
        id: row.get(0),
        user_id: row.get(1),
        article_id: row.get(2),
        read_duration: row.get(3),
        read_percentage: row.get(4),
        created_at: row.get(5),
        updated_at: row.get(6),
    })
}

// 获取用户反馈历史（包括反馈、评论、互动）
pub async fn get_user_feedback_history(
    client: &Client,
    user_id: Uuid,
    page: i64,
    limit: i64,
) -> Result<UserFeedbackHistory, PgError> {
    let offset = (page - 1) * limit;

    // 获取反馈历史
    let feedback_rows = client.query(
        "SELECT f.id, f.user_id, f.article_id, f.feedback_type, f.created_at, a.title, a.url \
         FROM feedback f \
         JOIN articles a ON f.article_id = a.id \
         WHERE f.user_id = $1 \
         ORDER BY f.created_at DESC \
         LIMIT $2 OFFSET $3",
        &[&user_id, &limit, &offset]
    ).await?;

    let feedbacks: Vec<UserFeedbackWithArticle> = feedback_rows.into_iter().map(|row| {
        UserFeedbackWithArticle {
            feedback: UserFeedback {
                article_id: row.get(2),
                user_id: row.get(1),
                feedback_type: crate::models::article::FeedbackType::from(row.get::<_, String>(3).as_str()),
                created_at: row.get(4),
            },
            article_title: row.get(5),
            article_url: row.get(6),
        }
    }).collect();

    // 获取评论历史
    let comment_rows = client.query(
        "SELECT c.id, c.user_id, c.article_id, c.username, c.content, c.parent_comment_id, \
                c.created_at, c.updated_at, a.title, a.url \
         FROM comments c \
         JOIN articles a ON c.article_id = a.id \
         WHERE c.user_id = $1 \
         ORDER BY c.created_at DESC \
         LIMIT $2 OFFSET $3",
        &[&user_id, &limit, &offset]
    ).await?;

    let comments: Vec<CommentWithArticle> = comment_rows.into_iter().map(|row| {
        CommentWithArticle {
            comment: Comment {
                id: row.get(0),
                user_id: row.get(1),
                article_id: row.get(2),
                username: row.get(3),
                content: row.get(4),
                parent_comment_id: row.get(5),
                created_at: row.get(6),
                updated_at: row.get(7),
            },
            article_title: row.get(8),
            article_url: row.get(9),
        }
    }).collect();

    // 获取互动历史
    let interaction_rows = client.query(
        "SELECT i.id, i.user_id, i.article_id, i.interaction_type, i.is_active, \
                i.created_at, i.updated_at, a.title, a.url \
         FROM user_interactions i \
         JOIN articles a ON i.article_id = a.id \
         WHERE i.user_id = $1 AND i.is_active = TRUE \
         ORDER BY i.updated_at DESC \
         LIMIT $2 OFFSET $3",
        &[&user_id, &limit, &offset]
    ).await?;

    let interactions: Vec<UserInteractionWithArticle> = interaction_rows.into_iter().map(|row| {
        UserInteractionWithArticle {
            interaction: UserInteraction {
                id: row.get(0),
                user_id: row.get(1),
                article_id: row.get(2),
                interaction_type: row.get(3),
                is_active: row.get(4),
                created_at: row.get(5),
                updated_at: row.get(6),
            },
            article_title: row.get(7),
            article_url: row.get(8),
        }
    }).collect();

    // 计算总数
    let total_count_row = client.query_one(
        "SELECT (SELECT COUNT(*) FROM feedback WHERE user_id = $1) + \
                (SELECT COUNT(*) FROM comments WHERE user_id = $1) + \
                (SELECT COUNT(*) FROM user_interactions WHERE user_id = $1 AND is_active = TRUE)",
        &[&user_id]
    ).await?;
    let total_count: i64 = total_count_row.get(0);

    Ok(UserFeedbackHistory {
        feedbacks,
        comments,
        interactions,
        total_count,
    })
} 