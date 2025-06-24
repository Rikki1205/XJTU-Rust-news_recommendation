use tokio_postgres::{Client, Error as PgError};
use uuid::Uuid;

use crate::models::article::Article; // Assuming Article struct is defined
use crate::models::article::NewsImage;

// Function to insert a new article into the database
// It should handle potential conflicts if an article with the same URL already exists.
pub async fn insert_article(client: &Client, article: &Article) -> Result<Article, PgError> {
    // Using ON CONFLICT (url) DO NOTHING to avoid inserting duplicate articles based on URL
    // Alternatively, ON CONFLICT (url) DO UPDATE SET ... if we want to update existing articles.
    // For now, we'll just skip duplicates.
    let row_option = client.query_opt(
        "INSERT INTO articles (id, title, content, url, source_name, published_at, crawled_at, categories, feature_vector) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) \
         ON CONFLICT (url) DO NOTHING \
         RETURNING id, title, content, url, source_name, published_at, crawled_at, categories, feature_vector",
        &[
            &article.id,
            &article.title,
            &article.content,
            &article.url,
            &article.source_name,
            &article.published_at,
            &article.crawled_at,
            &article.categories,
            &None::<Vec<u8>> // Placeholder for feature_vector
        ]
    ).await?;

    if let Some(row) = row_option {
        Ok(Article {
            id: row.get(0),
            title: row.get(1),
            content: row.get(2),
            url: row.get(3),
            source_name: row.get(4),
            published_at: row.get(5),
            crawled_at: row.get(6),
            categories: row.get(7),
            like_count: Some(0),
            comment_count: Some(0),
            favorite_count: Some(0),
            // feature_vector: row.get(8), // Assuming it's Option<Vec<u8>>
        })
    } else {
        // Article with this URL already exists and was skipped
        // We might want to fetch the existing one or return an indicator
        // For now, returning the input article might be misleading. Let's return an error or a specific type.
        // Or, fetch the existing article by URL.
        // For simplicity, if insert was skipped, we can indicate it.
        // Let's try to fetch the existing one if insert was skipped.
        get_article_by_url(client, &article.url).await.map(|opt_art| opt_art.unwrap_or_else(|| article.clone()))
        // This unwrap_or_else is a bit of a hack. A better way is to return an enum: Inserted(Article) or Existed(Article)
    }
}

pub async fn save_image_to_db(
    client: &deadpool_postgres::Client,
    image: &NewsImage,
) -> Result<(), anyhow::Error> {
    //println!("c_url:{}",&image.url);
    client.execute(
        "INSERT INTO news_images (url, content_type, storage_path) 
         VALUES ($1, $2, $3)",
        &[&image.url, &image.content_type, &image.file_path]
    ).await?;
    
    Ok(())
}

pub async fn load_image_from_db(
    client: &deadpool_postgres::Client,
    url: &str
) -> Result<Option<NewsImage>, PgError> {
    // println!("c_url:{}",&url);
    // log::info!("load start:");

    let row_option=
    client.query_opt(
        "SELECT id, url, content_type, storage_path
        FROM news_images
        WHERE url = $1",
        &[&url]
    ).await?;

    if let Some(row) = row_option{
        // log::info!("Load Fin!");
        Ok(Some(NewsImage{
            id:row.get(0),
            url:row.get(1),
            content_type:row.get(2),
            file_path:row.get(3),
        }))
    } else{
        // log::info!("Load Failed!");
        Ok(None)
    }
}

// Function to get an article by its URL
pub async fn get_article_by_url(client: &Client, url: &str) -> Result<Option<Article>, PgError> {
    let row_option = client.query_opt(
        "SELECT id, title, content, url, source_name, published_at, crawled_at, categories, like_count, comment_count, favorite_count FROM articles WHERE url = $1",
        &[&url]
    ).await?;

    if let Some(row) = row_option {
        Ok(Some(Article {
            id: row.get(0),
            title: row.get(1),
            content: row.get(2),
            url: row.get(3),
            source_name: row.get(4),
            published_at: row.get(5),
            crawled_at: row.get(6),
            categories: row.get(7),
            like_count: row.get(8),
            comment_count: row.get(9),
            favorite_count: row.get(10),
            // feature_vector: row.get(11), // If selected
        }))
    } else {
        Ok(None)
    }
}

// Function to get articles (e.g., for display, with pagination)
pub async fn get_articles(
    client: &Client,
    page: i64, // 1-based page number
    limit: i64,
    sort_by_published_at_desc: bool,
) -> Result<Vec<Article>, PgError> {
    let offset = (page - 1) * limit;
    let order_by_clause = if sort_by_published_at_desc {
        "ORDER BY published_at DESC NULLS LAST, crawled_at DESC"
    } else {
        "ORDER BY crawled_at DESC"
    };

    let query_string = format!(
        "SELECT id, title, content, url, source_name, published_at, crawled_at, categories, like_count, comment_count, favorite_count \
         FROM articles \
         {} \
         LIMIT $1 OFFSET $2",
        order_by_clause
    );

    let rows = client.query(&query_string, &[&limit, &offset]).await?;

    Ok(rows.into_iter().map(|row| Article {
        id: row.get(0),
        title: row.get(1),
        content: row.get(2),
        url: row.get(3),
        source_name: row.get(4),
        published_at: row.get(5),
        crawled_at: row.get(6),
        categories: row.get(7),
        like_count: row.get(8),
        comment_count: row.get(9),
        favorite_count: row.get(10),
        // feature_vector: None, // Not fetching for general list view
    }).collect())
}

// Function to count total articles (for pagination metadata)
pub async fn count_total_articles(client: &Client) -> Result<i64, PgError> {
    let row = client.query_one("SELECT COUNT(*) FROM articles", &[]).await?;
    Ok(row.get(0))
}

pub async fn find_article_by_id(client: &Client, article_id: Uuid) -> Result<Option<Article>, PgError> {
    let row_option = client
        .query_opt(
            "SELECT id, title, content, url, source_name, published_at, crawled_at, categories, like_count, comment_count, favorite_count FROM articles WHERE id = $1",
            &[&article_id],
        )
        .await?;

    if let Some(row) = row_option {
        Ok(Some(Article {
            id: row.get(0),
            title: row.get(1),
            content: row.get(2),
            url: row.get(3),
            source_name: row.get(4),
            published_at: row.get(5),
            crawled_at: row.get(6),
            categories: row.get(7),
            like_count: row.get(8),
            comment_count: row.get(9),
            favorite_count: row.get(10),
        }))
    } else {
        Ok(None)
    }
}

pub async fn get_recent_articles(client: &Client, limit: Option<i64>, page: Option<i64>) -> Result<Vec<Article>, PgError> {
    let limit = limit.unwrap_or(10);
    let page = page.unwrap_or(0); // 默认从第 0 页开始（偏移 0）

    let offset = page * limit;

    let rows = client
        .query(
            "SELECT id, title, content, url, source_name, published_at, crawled_at, categories, like_count, comment_count, favorite_count \
             FROM articles \
             ORDER BY crawled_at DESC \
             LIMIT $1 OFFSET $2",
            &[&limit, &offset],
        )
        .await?;

    Ok(rows
        .into_iter()
        .map(|row| Article {
            id: row.get(0),
            title: row.get(1),
            content: row.get(2),
            url: row.get(3),
            source_name: row.get(4),
            published_at: row.get(5),
            crawled_at: row.get(6),
            categories: row.get(7),
            like_count: row.get(8),
            comment_count: row.get(9),
            favorite_count: row.get(10),
        })
        .collect())
}

