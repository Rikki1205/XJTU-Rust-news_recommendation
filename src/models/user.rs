use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
#[schema(example = json!(
    {
        "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
        "username": "johndoe",
        "email": "johndoe@example.com",
        "created_at": "2023-01-01T12:00:00Z",
        "updated_at": "2023-01-01T12:00:00Z"
    }
))]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    #[serde(skip_serializing)] // Usually, we don't send the password hash back
    pub password_hash: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!(
    {
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "password123"
    }
))]
pub struct CreateUserSchema {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!(
    {
        "username": "existinguser",
        "password": "password123"
    }
))]
pub struct LoginUserSchema {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, ToSchema)]
#[schema(example = json!(
    {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
))]
pub struct TokenResponse {
    pub token: String,
}

#[derive(Debug, Serialize, ToSchema)]
#[schema(example = json!(
    {
        "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
        "username": "johndoe",
        "email": "johndoe@example.com"
    }
))]
pub struct UserProfileResponse {
    pub id: Uuid,
    pub username: String,
    pub email: String,
}

// Convert User to UserProfileResponse
impl From<User> for UserProfileResponse {
    fn from(user: User) -> Self {
        UserProfileResponse {
            id: user.id,
            username: user.username,
            email: user.email,
        }
    }
}

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!(
    {
        "email": "newemail@example.com",
        "password": "newpassword123"
    }
))]
pub struct UpdateUserProfileSchema {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub password: Option<String>, // For changing password
}
