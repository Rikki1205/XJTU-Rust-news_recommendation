use tokio_postgres::{NoTls, Error as PgError, Client, Config as PgConfig};
use std::str::FromStr;
use std::env;
use dotenv::dotenv;
use deadpool_postgres::Manager;


// Define a type alias for the connection pool if using a pooling library like bb8 or deadpool
// For simplicity, this example will show a single client connection setup.
// In a real Actix app, you'd use a pool (e.g., deadpool-postgres or bb8-postgres).
// For now, we'll focus on the direct client for `opengauss` crate compatibility.

// Assuming `opengauss` crate provides a similar interface to `tokio-postgres`
// or is a direct wrapper. If it has its own connection manager, that should be used.
// For this example, we'll use `tokio_postgres::Config` and `Client` directly,
// as the `opengauss` crate on crates.io is described as a fork of rust-postgres.

pub type DbPool = deadpool_postgres::Pool; // Example if using deadpool

// Function to establish a database connection (or pool)
pub async fn establish_connection() -> Result<Client, PgError> {
    dotenv().ok(); // Load .env file

    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set in .env file");

    // Parse the connection string
    // Example: "postgresql://user:password@host:port/database"
    // or "opengauss://user:password@host:port/database"
    // The `opengauss` crate might require a specific scheme or handle it internally.
    // We assume `tokio_postgres::Config` can parse it or `opengauss` provides its own config.
    let config = PgConfig::from_str(&database_url)?;

    // Connect to the database
    let (client, connection) = config.connect(NoTls).await?;

    // The connection object performs the actual communication with the database,
    // so spawn it off to run on its own.
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("Database connection error: {}", e);
        }
    });

    Ok(client)
}

// Example of setting up a Deadpool pool (recommended for Actix)
// This would replace the simple `establish_connection` for a real app.
pub async fn create_pool(database_url: &str) -> Result<DbPool, Box<dyn std::error::Error>> {
    // 不再调用 dotenv()，由调用者负责环境变量加载

    let config = PgConfig::from_str(database_url)?;
    let manager = Manager::new(config, NoTls);

    let pool = DbPool::builder(manager)
        .max_size(10)
        .build()?;

    Ok(pool)
}

// Placeholder for AppState if we integrate the pool into Actix state
// pub struct AppState {
//     pub db_pool: DbPool,
// }

