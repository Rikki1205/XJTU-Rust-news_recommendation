use actix_web::error::ResponseError;
use actix_web::http::{StatusCode, header::ContentType};
use actix_web::HttpResponse;
use serde::Serialize;
use std::fmt;
use utoipa::ToSchema;

#[derive(Debug, Serialize, ToSchema) ]
pub struct ErrorResponse {
    pub status_code: u16,
    pub error: String,
    pub message: String,
}

#[derive(Debug)]
pub enum ServiceError {
    InternalServerError(String),
    BadRequest(String),
    Unauthorized(String),
    NotFound(String),
    Conflict(String), // For duplicate entries, etc.
    Forbidden(String), // For permission denied
    DatabaseError(tokio_postgres::Error),
    PoolError(deadpool_postgres::PoolError),
    JwtError(jsonwebtoken::errors::Error),
    HashingError(String),
}

impl fmt::Display for ServiceError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ServiceError::InternalServerError(msg) => write!(f, "Internal Server Error: {}", msg),
            ServiceError::BadRequest(msg) => write!(f, "Bad Request: {}", msg),
            ServiceError::Unauthorized(msg) => write!(f, "Unauthorized: {}", msg),
            ServiceError::NotFound(msg) => write!(f, "Not Found: {}", msg),
            ServiceError::Conflict(msg) => write!(f, "Conflict: {}", msg),
            ServiceError::Forbidden(msg) => write!(f, "Forbidden: {}", msg),
            ServiceError::DatabaseError(err) => write!(f, "Database Error: {}", err),
            ServiceError::PoolError(err) => write!(f, "Database Pool Error: {}", err),
            ServiceError::JwtError(err) => write!(f, "JWT Error: {}", err),
            ServiceError::HashingError(msg) => write!(f, "Password Hashing Error: {}", msg),
        }
    }
}

impl ResponseError for ServiceError {
    fn status_code(&self) -> StatusCode {
        match self {
            ServiceError::InternalServerError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            ServiceError::BadRequest(_) => StatusCode::BAD_REQUEST,
            ServiceError::Unauthorized(_) => StatusCode::UNAUTHORIZED,
            ServiceError::NotFound(_) => StatusCode::NOT_FOUND,
            ServiceError::Conflict(_) => StatusCode::CONFLICT,
            ServiceError::Forbidden(_) => StatusCode::FORBIDDEN,
            ServiceError::DatabaseError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            ServiceError::PoolError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            ServiceError::JwtError(_) => StatusCode::UNAUTHORIZED, // Or Bad Request depending on context
            ServiceError::HashingError(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse {
        let status_code = self.status_code();
        let error_message = self.to_string(); // Get the detailed message from Display impl
        let error_type = match self {
            ServiceError::InternalServerError(_) => "InternalServerError",
            ServiceError::BadRequest(_) => "BadRequest",
            ServiceError::Unauthorized(_) => "Unauthorized",
            ServiceError::NotFound(_) => "NotFound",
            ServiceError::Conflict(_) => "Conflict",
            ServiceError::Forbidden(_) => "Forbidden",
            ServiceError::DatabaseError(_) => "DatabaseError",
            ServiceError::PoolError(_) => "PoolError",
            ServiceError::JwtError(_) => "JwtError",
            ServiceError::HashingError(_) => "HashingError",
        };

        let error_response = ErrorResponse {
            status_code: status_code.as_u16(),
            error: error_type.to_string(),
            message: error_message,
        };

        HttpResponse::build(status_code)
            .insert_header(ContentType::json())
            .json(error_response)
    }
}

// Implement From for common error types to ServiceError
impl From<tokio_postgres::Error> for ServiceError {
    fn from(err: tokio_postgres::Error) -> Self {
        ServiceError::DatabaseError(err)
    }
}

impl From<deadpool_postgres::PoolError> for ServiceError {
    fn from(err: deadpool_postgres::PoolError) -> Self {
        ServiceError::PoolError(err)
    }
}

impl From<jsonwebtoken::errors::Error> for ServiceError {
    fn from(err: jsonwebtoken::errors::Error) -> Self {
        ServiceError::JwtError(err)
    }
}

impl From<bcrypt::BcryptError> for ServiceError {
    fn from(err: bcrypt::BcryptError) -> Self {
        ServiceError::HashingError(format!("Password hashing failed: {}", err))
    }
}
