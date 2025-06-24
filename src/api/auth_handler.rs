use actix_web::{web, post, HttpResponse, Responder};
use crate::services::auth_service::{register_user_service, login_user_service};
use crate::models::user::{CreateUserSchema, LoginUserSchema, TokenResponse};
use crate::db::connection::DbPool;
use crate::errors::ServiceError;
use crate::errors::ErrorResponse;
use uuid::Uuid;

// Placeholder for JWT extraction - in a real app, this would be middleware
// For now, we'll simulate it or pass a dummy user_id if needed for other handlers
#[derive(Debug)]
pub struct AuthenticatedUser {
    pub user_id: Uuid,
}

impl actix_web::FromRequest for AuthenticatedUser {
    type Error = ServiceError;
    type Future = futures_util::future::Ready<Result<Self, Self::Error>>;

    fn from_request(req: &actix_web::HttpRequest, _payload: &mut actix_web::dev::Payload) -> Self::Future {
        if let Some(auth_header) = req.headers().get("Authorization") {
            if let Ok(auth_str) = auth_header.to_str() {
                if auth_str.starts_with("Bearer ") {
                    let token = &auth_str[7..];
                    
                    // Use the JWT decode function to verify and extract claims
                    match crate::utils::jwt::decode_jwt(token) {
                        Ok(token_data) => {
                            return futures_util::future::ready(Ok(AuthenticatedUser { 
                                user_id: token_data.claims.sub 
                            }));
                        }
                        Err(e) => {
                            log::warn!("JWT verification failed: {}", e);
                            return futures_util::future::ready(Err(ServiceError::Unauthorized("Invalid token".to_string())));
                        }
                    }
                }
            }
        }
        futures_util::future::ready(Err(ServiceError::Unauthorized("Missing or invalid Authorization header".to_string())))
    }
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/register",
    request_body = CreateUserSchema,
    responses(
        (status = 201, description = "User registered successfully", body = TokenResponse),
        (status = 400, description = "Invalid input", body = ErrorResponse),
        (status = 409, description = "User already exists", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    )
)]
#[post("/register")]
pub async fn register_user_handler(
    pool: web::Data<DbPool>,
    body: web::Json<CreateUserSchema>,
) -> Result<impl Responder, ServiceError> {
    match register_user_service(&pool, body.into_inner()).await {
        Ok(token_response) => Ok(HttpResponse::Created().json(token_response)),
        Err(e) => Err(e),
    }
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/login",
    request_body = LoginUserSchema,
    responses(
        (status = 200, description = "User logged in successfully", body = TokenResponse),
        (status = 400, description = "Invalid input", body = ErrorResponse),
        (status = 401, description = "Invalid credentials", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    )
)]
#[post("/login")]
pub async fn login_user_handler(
    pool: web::Data<DbPool>,
    body: web::Json<LoginUserSchema>,
) -> Result<impl Responder, ServiceError> {
    match login_user_service(&pool, body.into_inner()).await {
        Ok(token_response) => Ok(HttpResponse::Ok().json(token_response)),
        Err(e) => Err(e),
    }
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/test-token",
    responses(
        (status = 200, description = "Test token generated", body = TokenResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    )
)]
#[post("/test-token")]
pub async fn generate_test_token_handler() -> Result<impl Responder, ServiceError> {
    // Generate a test token for the user "wanhuasong"
    let user_id = uuid::Uuid::parse_str("052272b9-6066-4a8a-9ecd-37d8686213bb").unwrap();
    let username = "wanhuasong";
    
    match crate::utils::jwt::create_jwt(user_id, username) {
        Ok(token) => {
                    let response = TokenResponse {
            token,
        };
            Ok(HttpResponse::Ok().json(response))
        }
        Err(_) => Err(ServiceError::InternalServerError("Failed to generate test token".to_string())),
    }
}

pub fn init_auth_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1/auth")
            .service(register_user_handler)
            .service(login_user_handler)
            .service(generate_test_token_handler),
    );
}
