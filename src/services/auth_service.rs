use crate::db::connection::DbPool;
use crate::db::user_queries::{create_user as db_create_user, find_user_by_username as db_find_user_by_username, find_user_by_email as db_find_user_by_email};
use crate::models::user::{CreateUserSchema, LoginUserSchema, TokenResponse};
use crate::utils::hasher::{hash_password, verify_password};
use crate::utils::jwt::create_jwt;
use crate::errors::ServiceError;

pub async fn register_user_service(pool: &DbPool, user_data: CreateUserSchema) -> Result<TokenResponse, ServiceError> {
    let client = pool.get().await.map_err(|e| {
        log::error!("Failed to get DB client from pool: {}", e);
        ServiceError::InternalServerError("Database connection error".to_string())
    })?;

    // Check if username or email already exists
    if db_find_user_by_username(&client, &user_data.username).await?.is_some() {
        return Err(ServiceError::Conflict("Username already exists".to_string()));
    }
    if db_find_user_by_email(&client, &user_data.email).await?.is_some() {
        return Err(ServiceError::Conflict("Email already exists".to_string()));
    }

    let hashed_password = hash_password(&user_data.password)?;
    
    let new_user_db_data = CreateUserSchema {
        username: user_data.username,
        email: user_data.email,
        password: hashed_password, // Store hashed password
    };

    let user = db_create_user(&client, &new_user_db_data).await.map_err(|e| {
        log::error!("Failed to create user in DB: {}", e);
        ServiceError::InternalServerError("Failed to register user".to_string())
    })?;

    let token = create_jwt(user.id, &user.username)?;
    Ok(TokenResponse { token })
}

pub async fn login_user_service(pool: &DbPool, login_data: LoginUserSchema) -> Result<TokenResponse, ServiceError> {
    let client = pool.get().await.map_err(|e| {
        log::error!("Failed to get DB client from pool: {}", e);
        ServiceError::InternalServerError("Database connection error".to_string())
    })?;

    let user = db_find_user_by_username(&client, &login_data.username).await?
        .ok_or_else(|| ServiceError::Unauthorized("Invalid username or password".to_string()))?;

    if !verify_password(&login_data.password, &user.password_hash)? {
        return Err(ServiceError::Unauthorized("Invalid username or password".to_string()));
    }

    let token = create_jwt(user.id, &user.username)?;
    Ok(TokenResponse { token })
}
