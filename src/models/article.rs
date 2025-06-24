use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, ToSchema)]
pub enum FeedbackType {
    Interested,
    NotInterested,
    Neutral,
}

impl FeedbackType {
    pub fn as_str(&self) -> &str {
        match self {
            FeedbackType::Interested => "interested",
            FeedbackType::NotInterested => "not_interested",
            FeedbackType::Neutral => "neutral",
        }
    }
}

impl From<&str> for FeedbackType {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "interested" => FeedbackType::Interested,
            "notinterested" | "not_interested" => FeedbackType::NotInterested,
            "neutral" => FeedbackType::Neutral,
            _ => FeedbackType::Neutral, // Default or handle error
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Feedback {
    pub id: Uuid,
    pub user_id: Uuid,
    pub article_id: Uuid,
    pub feedback_type: FeedbackType,
    pub created_at: DateTime<Utc>,
}

#[derive(Deserialize, Debug)]
pub struct CreateFeedbackSchema {
    // article_id will be part of the path
    pub feedback_type: String, // "interested", "not_interested", "neutral"
}

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
pub struct Comment {
    pub id: Uuid,
    pub user_id: Uuid,
    pub article_id: Uuid,
    pub username: String, // To display who made the comment
    pub content: String,
    pub parent_comment_id: Option<Uuid>, // For threaded comments
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Deserialize, Debug, ToSchema)]
pub struct CreateCommentSchema {
    // article_id will be part of the path
    pub content: String,
    pub parent_comment_id: Option<Uuid>,

    pub article_id: Uuid,
    pub username: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CommentResponse {
    pub id: Uuid,
    pub article_id: Uuid,
    pub user_id: Uuid,
    pub username: String,
    pub content: String,
    pub parent_comment_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<Comment> for CommentResponse {
    fn from(comment: Comment) -> Self {
        CommentResponse {
            id: comment.id,
            article_id: comment.article_id,
            user_id: comment.user_id,
            username: comment.username, // This needs to be populated, perhaps by a join or separate query
            content: comment.content,
            parent_comment_id: comment.parent_comment_id,
            created_at: comment.created_at,
            updated_at: comment.updated_at,
        }
    }
}

// Article model (basic for now, will be expanded in models/article.rs)
#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
pub struct Article {
    pub id: Uuid,
    pub title: String,
    pub content: String,
    pub url: String,
    pub source_name: Option<String>,
    pub published_at: Option<DateTime<Utc>>,
    pub crawled_at: DateTime<Utc>,
    pub categories: Option<Vec<String>>,
    pub like_count: Option<i32>,
    pub comment_count: Option<i32>,
    pub favorite_count: Option<i32>,
    // pub feature_vector: Option<Vec<f32>>, // Or bytea depending on DB storage
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NewsImage {
    pub id: i32,
    pub url: String,
    //pub image_data: Vec<u8>,
    pub content_type: String,
    pub file_path: String,
    // article_id: Uuid,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct FeedbackData {
    pub article_id: Uuid,
    pub feedback_type: FeedbackType,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UserFeedback {
    pub article_id: Uuid,
    pub user_id: Uuid,
    pub feedback_type: FeedbackType,
    pub created_at: DateTime<Utc>,
}

impl UserFeedback {
    pub fn from(feedback: Feedback) -> Self {
        UserFeedback {
            article_id: feedback.article_id,
            user_id: feedback.user_id,
            feedback_type: feedback.feedback_type,
            created_at: feedback.created_at,
        }
    }
}

// 用户互动模型
#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
pub struct UserInteraction {
    pub id: Uuid,
    pub user_id: Uuid,
    pub article_id: Uuid,
    pub interaction_type: String, // 'like', 'favorite', 'share'
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Deserialize, Debug, ToSchema)]
pub struct CreateInteractionSchema {
    pub article_id: Uuid,
    pub interaction_type: String,
    pub is_active: bool,
}

#[derive(Serialize, Deserialize, Debug, ToSchema)]
pub struct InteractionResponse {
    pub success: bool,
    pub message: String,
    pub interaction: Option<UserInteraction>,
}

// 文章互动统计
#[derive(Serialize, Deserialize, Debug, ToSchema)]
pub struct ArticleInteractionStats {
    pub article_id: Uuid,
    pub like_count: i32,
    pub comment_count: i32,
    pub favorite_count: i32,
    pub user_interaction: Option<UserInteractionSummary>,
}

#[derive(Serialize, Deserialize, Debug, ToSchema)]
pub struct UserInteractionSummary {
    pub liked: bool,
    pub favorited: bool,
    pub commented: bool,
}

// 用户收藏夹模型
#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
pub struct UserFavorite {
    pub id: Uuid,
    pub user_id: Uuid,
    pub article_id: Uuid,
    pub folder_name: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Deserialize, Debug, ToSchema)]
pub struct CreateFavoriteSchema {
    pub article_id: Uuid,
    pub folder_name: Option<String>,
}

// 阅读历史模型
#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
pub struct ReadingHistory {
    pub id: Uuid,
    pub user_id: Uuid,
    pub article_id: Uuid,
    pub read_duration: i32,
    pub read_percentage: f32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Deserialize, Debug, ToSchema)]
pub struct CreateReadingHistorySchema {
    pub article_id: Uuid,
    pub read_duration: i32,
    pub read_percentage: f32,
}

// 用户反馈历史响应
#[derive(Serialize, Deserialize, Debug, ToSchema)]
pub struct UserFeedbackHistory {
    pub feedbacks: Vec<UserFeedbackWithArticle>,
    pub comments: Vec<CommentWithArticle>,
    pub interactions: Vec<UserInteractionWithArticle>,
    pub total_count: i64,
}

#[derive(Serialize, Deserialize, Debug, ToSchema)]
pub struct UserFeedbackWithArticle {
    pub feedback: UserFeedback,
    pub article_title: String,
    pub article_url: String,
}

#[derive(Serialize, Deserialize, Debug, ToSchema)]
pub struct CommentWithArticle {
    pub comment: Comment,
    pub article_title: String,
    pub article_url: String,
}

#[derive(Serialize, Deserialize, Debug, ToSchema)]
pub struct UserInteractionWithArticle {
    pub interaction: UserInteraction,
    pub article_title: String,
    pub article_url: String,
}
