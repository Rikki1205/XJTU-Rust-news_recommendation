pub mod app_config {
    use serde::Deserialize;
    use std::env;
    use anyhow::Result;

    #[derive(Debug, Deserialize, Clone)]
    pub struct Config {
        pub server_address: String,
        pub server_port: u16,
        pub database_url: String,
        pub jwt_secret: String,
        pub jwt_expiration_hours: i64,
        pub crawler_cron_expression: String,
        // pub crawler_sources_config_path: Option<String>, // If you load sources from a file
    }

    impl Config {
        pub fn from_env() -> Result<Self> {
            dotenv::dotenv().ok(); // Load .env file if present

            let server_address = env::var("SERVER_ADDRESS").unwrap_or_else(|_| "0.0.0.0".to_string());
            let server_port = env::var("SERVER_PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse::<u16>()?;
            
            let database_url = env::var("DATABASE_URL")
                .map_err(|e| anyhow::anyhow!("DATABASE_URL must be set: {}", e))?;
            
            let jwt_secret = env::var("JWT_SECRET")
                .map_err(|e| anyhow::anyhow!("JWT_SECRET must be set: {}", e))?;
            
            let jwt_expiration_hours = env::var("JWT_EXPIRATION_HOURS")
                .unwrap_or_else(|_| "24".to_string())
                .parse::<i64>()?;

            let crawler_cron_expression = env::var("CRAWLER_CRON_EXPRESSION")
                //.unwrap_or_else(|_| "0 */30 * * * *".to_string()); // Default: every 30 minutes

                .unwrap_or_else(|_| "*/5 * * * * *".to_string());
            // let crawler_sources_config_path = env::var("CRAWLER_SOURCES_CONFIG_PATH").ok();

            Ok(Config {
                server_address,
                server_port,
                database_url,
                jwt_secret,
                jwt_expiration_hours,
                crawler_cron_expression,
                // crawler_sources_config_path,
            })
        }
    }
}
