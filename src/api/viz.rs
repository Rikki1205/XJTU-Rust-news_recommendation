use actix_web::{get, HttpResponse, Responder};
use serde::Serialize;
use std::collections::HashMap;
use chrono::{Local, Duration};
use rand::Rng;

/// 保留指定小数位
trait Round3 {
    fn round_to(self, digits: u32) -> f64;
}
impl Round3 for f64 {
    fn round_to(self, digits: u32) -> f64 {
        let factor = 10_f64.powi(digits as i32);
        (self * factor).round() / factor
    }
}

#[derive(Serialize)]
struct CategoryPoint {
    date: String,
    counts: HashMap<String, u32>,
}

/// 各类别新闻热度（最近 7 天）
#[get("/viz/category_heat")] 
pub async fn category_heat() -> impl Responder {
    let categories = vec!["财经", "科技", "体育", "娱乐", "社会"];
    let mut data = Vec::with_capacity(7);
    let mut rng = rand::thread_rng();
    
    for i in 0..7 {
        let date = Local::today()
            .naive_local()
            .checked_sub_signed(Duration::days((6 - i) as i64))
            .unwrap()
            .format("%m-%d")
            .to_string();
        let mut counts = HashMap::new();
        for &cat in &categories {
            counts.insert(cat.to_string(), rng.gen_range(20..200));
        }
        data.push(CategoryPoint { date, counts });
    }

    HttpResponse::Ok().json(data)
}

#[derive(Serialize)]
struct ModelPerf {
    model: String,
    accuracy: f64,
    precision: f64,
    recall: f64,
}

/// 机器学习模型性能对比
#[get("/viz/model_performance")] 
pub async fn model_performance() -> impl Responder {
    let models = vec!["LR", "决策树", "SVM", "随机森林"];
    let mut rng = rand::thread_rng();

    let results: Vec<ModelPerf> = models.into_iter().map(|m| {
        ModelPerf {
            model: m.to_string(),
            accuracy: (0.7 + rng.gen::<f64>() * 0.2).round_to(3),
            precision: (0.6 + rng.gen::<f64>() * 0.3).round_to(3),
            recall: (0.5 + rng.gen::<f64>() * 0.4).round_to(3),
        }
    }).collect();

    HttpResponse::Ok().json(results)
}

#[derive(Serialize)]
struct UserInterest {
    user_segment: String,
    heat: Vec<f64>,
}

/// 用户兴趣热力数据
#[get("/viz/user_interest")] 
pub async fn user_interest() -> impl Responder {
    let segments = vec!["老用户", "新用户", "潜在用户"];
    let mut rng = rand::thread_rng();

    let data: Vec<UserInterest> = segments.into_iter().map(|seg| {
        let heat = (0..5).map(|_| (rng.gen::<f64>() * 100.0).round_to(2)).collect();
        UserInterest {
            user_segment: seg.to_string(),
            heat,
        }
    }).collect();

    HttpResponse::Ok().json(data)
}
