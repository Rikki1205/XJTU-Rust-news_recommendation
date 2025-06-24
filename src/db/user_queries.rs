//use tokio_postgres::{Client, Error as EgError};
use tokio_postgres::{Client};
use uuid::Uuid;
use chrono::Utc;

use crate::models::user::{User, CreateUserSchema, UpdateUserProfileSchema};
use crate::utils::hasher::hash_password;
//use std::io::{Error, ErrorKind};
use crate::errors::ServiceError;
// Function to create a new user (from auth_service.rs, kept for context if user_queries is standalone)
// pub async fn create_user(client: &Client, user_data: &CreateUserSchema) -> Result<User, PgError> {  }
pub async fn create_user(client: &Client, user_data: &CreateUserSchema) -> Result<User, ServiceError> {
    // Password is already hashed when passed from auth service
    let now = Utc::now();
    let user_id = Uuid::new_v4();

    let row = client
        .query_one(
            "INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, username, email, password_hash, created_at, updated_at",
            &[&user_id, &user_data.username, &user_data.email, &user_data.password, &now, &now],
        )
        .await
        .map_err(|e| ServiceError::InternalServerError(format!("Database insert error: {}", e)))?;

    Ok(User {
        id: row.get(0),
        username: row.get(1),
        email: row.get(2),
        password_hash: row.get(3),
        created_at: row.get(4),
        updated_at: row.get(5),
    })
}
// Function to find a user by username (from auth_service.rs, kept for context)
// pub async fn find_user_by_username(client: &Client, username: &str) -> Result<Option<User>, PgError> {  }
pub async fn find_user_by_username(client: &Client, username: &str) -> Result<Option<User>, ServiceError> {
    let row_option = client
        .query_opt(
            "SELECT id, username, email, password_hash, created_at, updated_at
             FROM users WHERE username = $1",
            &[&username],
        )
        .await
        .map_err(|e| ServiceError::InternalServerError(format!("Database query error: {}", e)))?;

    if let Some(row) = row_option {
        Ok(Some(User {
            id: row.get(0),
            username: row.get(1),
            email: row.get(2),
            password_hash: row.get(3),
            created_at: row.get(4),
            updated_at: row.get(5),
        }))
    } else {
        Ok(None)
    }
}

// Function to find a user by email
pub async fn find_user_by_email(client: &Client, email: &str) -> Result<Option<User>, ServiceError> {
    let row_option = client.query_opt(
        "SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE email = $1",
        &[&email]
    ).await?;

    if let Some(row) = row_option {
        Ok(Some(User {
            id: row.get(0),
            username: row.get(1),
            email: row.get(2),
            password_hash: row.get(3),
            created_at: row.get(4),
            updated_at: row.get(5),
        }))
    } else {
        Ok(None)
    }
}

// Function to find a user by ID
pub async fn find_user_by_id(client: &Client, user_id: Uuid) -> Result<Option<User>, ServiceError> {
    let row_option = client.query_opt(
        "SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE id = $1",
        &[&user_id]
    ).await?;

    if let Some(row) = row_option {
        Ok(Some(User {
            id: row.get(0),
            username: row.get(1),
            email: row.get(2),
            password_hash: row.get(3),
            created_at: row.get(4),
            updated_at: row.get(5),
        }))
    } else {
        Ok(None)
    }
}

// Function to update a user's profile
// Only email and password can be updated for now. Username is fixed.
pub async fn update_user_profile(
    client: &Client,
    user_id: Uuid,
    profile_data: &UpdateUserProfileSchema,
) -> Result<User, ServiceError> {
    let mut set_clauses = Vec::new();
    let mut params: Vec<&(dyn tokio_postgres::types::ToSql + Sync)> = Vec::new();
    let mut param_idx = 1;

    // Add user_id to params for WHERE clause later
    params.push(&user_id);
    //let user_id_param_idx = param_idx;
    param_idx += 1;

    if let Some(email) = &profile_data.email {
        set_clauses.push(format!("email = ${}", param_idx));
        params.push(email);
        param_idx += 1;
    }

    if let Some(password) = &profile_data.password {
        let hashed_password = hash_password(password).map_err(|e| ServiceError::InternalServerError(format!("Hashing failed: {}", e)))?;
        set_clauses.push(format!("password_hash = ${}", param_idx));
        params.push(&hashed_password);
        // param_idx += 1; // Not needed as it's the last one for now
    }

    if set_clauses.is_empty() {
        // No fields to update, just fetch the user
        return find_user_by_id(client, user_id).await.map(|opt_user| opt_user.unwrap()); // Should exist
    }

    set_clauses.push(format!("updated_at = ${}", param_idx +1)); // +1 because hashed_password might not be the last one if more fields are added
    let now = Utc::now();
    // This is tricky because params needs to live long enough. Store hashed_password and now if they are used.
    // Let's reconstruct params carefully.
    
    let mut final_params: Vec<&(dyn tokio_postgres::types::ToSql + Sync)> = Vec::new();
    let mut query_parts: Vec<String> = Vec::new();
    let mut current_idx = 1;

    if let Some(email_val) = &profile_data.email {
        query_parts.push(format!("email = ${}", current_idx));
        final_params.push(email_val);
        current_idx += 1;
    }

    let mut new_hashed_password_storage = String::new(); // To hold the hashed password string
    if let Some(password_val) = &profile_data.password {
        new_hashed_password_storage = hash_password(password_val).map_err(|e| ServiceError::InternalServerError(format!("Hashing failed: {}", e)))?;
        query_parts.push(format!("password_hash = ${}", current_idx));
        final_params.push(&new_hashed_password_storage);
        current_idx += 1;
    }
    
    query_parts.push(format!("updated_at = ${}", current_idx));
    final_params.push(&now);
    current_idx +=1;

    final_params.push(&user_id); // For WHERE id = $N

    let query = format!(
        "UPDATE users SET {} WHERE id = ${} RETURNING id, username, email, password_hash, created_at, updated_at",
        query_parts.join(", "),
        current_idx
    );

    let row = client.query_one(&query, &final_params[..]).await?;

    Ok(User {
        id: row.get(0),
        username: row.get(1),
        email: row.get(2),
        password_hash: row.get(3),
        created_at: row.get(4),
        updated_at: row.get(5),
    })
}


