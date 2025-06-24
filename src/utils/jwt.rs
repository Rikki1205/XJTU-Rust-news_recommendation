use chrono::{Utc, Duration};
use jsonwebtoken::{encode, decode, Header, Algorithm, Validation, EncodingKey, DecodingKey, TokenData,errors::Error as JwtError};
use serde::{Serialize, Deserialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid, // Subject (user ID)
    pub exp: usize, // Expiration time (timestamp)
    pub iat: usize, // Issued at (timestamp)
    pub username: String,
}

// In a real application, load these from environment variables or a config file
const JWT_SECRET: &[u8] = b"your-secret-key-needs-to-be-long-and-secure"; // TODO: Move to config
const TOKEN_EXPIRATION_HOURS: i64 = 24; // Token valid for 24 hours

pub fn create_jwt(user_id: Uuid, username: &str) -> Result<String, JwtError> {
    let now = Utc::now();
    let expiration = now + Duration::hours(TOKEN_EXPIRATION_HOURS);

    let claims = Claims {
        sub: user_id,
        exp: expiration.timestamp() as usize,
        iat: now.timestamp() as usize,
        username: username.to_string(),
    };

    encode(&Header::default(), &claims, &EncodingKey::from_secret(JWT_SECRET))
}

pub fn decode_jwt(token: &str) -> Result<TokenData<Claims>, JwtError> {
    decode::<Claims>(token, &DecodingKey::from_secret(JWT_SECRET), &Validation::new(Algorithm::HS256))
}

