use uuid::Uuid;
// use actix_web::web; // Not directly used here, but often in handlers calling this

use crate::db::connection::DbPool;
use crate::db::user_queries::{find_user_by_id as db_find_user_by_id, update_user_profile as db_update_user_profile, find_user_by_email as db_find_user_by_email};
use crate::models::user::{UserProfileResponse, UpdateUserProfileSchema};
use crate::errors::ServiceError;

// Service to get user profile information
pub async fn get_user_profile_service(pool: &DbPool, user_id: Uuid) -> Result<UserProfileResponse, ServiceError> {
    let client = pool.get().await.map_err(|e| {
        log::error!("Failed to get DB client from pool: {}", e);
        ServiceError::InternalServerError("Database connection error".to_string())
    })?;

    match db_find_user_by_id(&client, user_id).await {
        Ok(Some(user)) => Ok(user.into()), // Convert User to UserProfileResponse
        Ok(None) => Err(ServiceError::NotFound("User not found".to_string())),
        Err(e) => {
            log::error!("Failed to find user by ID in DB: {}", e);
            Err(ServiceError::InternalServerError("Failed to retrieve user profile".to_string()))
        }
    }
}

// Service to update user profile information
pub async fn update_user_profile_service(
    pool: &DbPool,
    user_id: Uuid,
    profile_data: UpdateUserProfileSchema,
) -> Result<UserProfileResponse, ServiceError> {
    if profile_data.email.is_none() && profile_data.password.is_none() {
        return Err(ServiceError::BadRequest("No update information provided. Please provide email or password to update.".to_string()));
    }

    let client = pool.get().await.map_err(|e| {
        log::error!("Failed to get DB client from pool: {}", e);
        ServiceError::InternalServerError("Database connection error".to_string())
    })?;

    // If email is being updated, check if the new email is already taken by another user.
    if let Some(new_email) = &profile_data.email {
        if let Some(existing_user_with_email) = db_find_user_by_email(&client, new_email).await? {
            if existing_user_with_email.id != user_id {
                return Err(ServiceError::Conflict("Email is already in use by another account.".to_string()));
            }
        }
    }

    match db_update_user_profile(&client, user_id, &profile_data).await {
        Ok(updated_user) => Ok(updated_user.into()),
        Err(e) => {
            log::error!("Failed to update user profile in DB: {}", e);
            Err(ServiceError::InternalServerError("Failed to update user profile".to_string()))
        }
    }
}
