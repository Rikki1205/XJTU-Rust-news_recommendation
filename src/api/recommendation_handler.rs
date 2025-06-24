// src/api/recommendation_handler.rs

use actix_web::{get, web, HttpResponse, Responder};
use rust_stemmers::{Algorithm, Stemmer};
use std::collections::{HashMap, HashSet};

use crate::db::connection::DbPool;
use crate::models::article::Article;
use crate::api::auth_handler::AuthenticatedUser;
use crate::errors::ServiceError;

#[utoipa::path(
    get,
    path = "/api/v1/recommendations",
    responses(
        (status = 200, description = "Successfully retrieved recommendations", body = Vec<Article>),
        (status = 401, description = "Unauthorized", body = crate::errors::ErrorResponse),
        (status = 500, description = "Internal server error", body = crate::errors::ErrorResponse)
    ),
    security(("bearer_auth" = []))
)]
#[get("")]
pub async fn get_recommendations_handler(
    pool: web::Data<DbPool>,
    auth_user: AuthenticatedUser,
) -> Result<impl Responder, ServiceError> {
    let limit = 10;

    let client = pool.get().await.map_err(ServiceError::from)?;

    // 获取最近的一些文章（模拟用户相关推荐）
    let articles = crate::db::article_queries::get_articles(&client, 1, 20, true)
        .await
        .map_err(ServiceError::from)?;

    if articles.is_empty() {
        return Ok(HttpResponse::Ok().json(Vec::<Article>::new()));
    }

    // ------------------ TF-IDF 相似度推荐逻辑 ------------------

    let stemmer = Stemmer::create(Algorithm::English);
    let docs: Vec<Vec<String>> = articles
        .iter()
        .map(|article| tokenize_and_stem(&article.content, &stemmer))
        .collect();

    let tfidf_vecs = compute_tfidf(&docs);
    let base_vector = &tfidf_vecs[0]; // 假设第 1 篇文章为参考

    let mut scores: Vec<(usize, f64)> = tfidf_vecs
        .iter()
        .enumerate()
        .skip(1)
        .map(|(i, vec)| (i, cosine_similarity(base_vector, vec)))
        .collect();

    scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    let recommended_articles: Vec<Article> = scores
        .into_iter()
        .take(limit as usize)
        .map(|(i, _)| articles[i].clone())
        .collect();

    Ok(HttpResponse::Ok().json(recommended_articles))
}

// ------------------ TF-IDF 工具函数 ------------------

fn tokenize_and_stem(text: &str, stemmer: &Stemmer) -> Vec<String> {
    text.split(|c: char| !c.is_alphanumeric())
        .filter(|token| !token.is_empty())
        .map(|token| token.to_lowercase())
        .map(|token| stemmer.stem(&token).to_string())
        .collect()
}

fn compute_tfidf(docs: &[Vec<String>]) -> Vec<HashMap<String, f64>> {
    let mut df: HashMap<String, usize> = HashMap::new();
    for doc in docs {
        let mut seen = HashSet::new();
        for term in doc {
            if seen.insert(term) {
                *df.entry(term.clone()).or_insert(0) += 1;
            }
        }
    }

    let total_docs = docs.len() as f64;
    let mut tfidf_vecs = Vec::new();

    for doc in docs {
        let mut tf: HashMap<String, usize> = HashMap::new();
        for term in doc {
            *tf.entry(term.clone()).or_insert(0) += 1;
        }

        let mut tfidf: HashMap<String, f64> = HashMap::new();
        for (term, count) in tf {
            let tf_score = count as f64 / doc.len() as f64;
            let idf_score = (total_docs / (*df.get(&term).unwrap_or(&1) as f64)).ln();
            tfidf.insert(term.clone(), tf_score * idf_score);
        }
        tfidf_vecs.push(tfidf);
    }

    tfidf_vecs
}

fn cosine_similarity(a: &HashMap<String, f64>, b: &HashMap<String, f64>) -> f64 {
    let mut dot_product = 0.0;
    let mut norm_a = 0.0;
    let mut norm_b = 0.0;

    for (key, val_a) in a {
        let val_b = b.get(key).cloned().unwrap_or(0.0);
        dot_product += val_a * val_b;
        norm_a += val_a * val_a;
    }

    for val in b.values() {
        norm_b += val * val;
    }

    if norm_a == 0.0 || norm_b == 0.0 {
        0.0
    } else {
        dot_product / (norm_a.sqrt() * norm_b.sqrt())
    }
}

// 初始化推荐模块路由
pub fn init_recommendation_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1/recommendations")
            .service(get_recommendations_handler)
    );
}
