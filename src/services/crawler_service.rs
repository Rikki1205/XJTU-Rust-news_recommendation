use reqwest::Client as HttpClient;
use scraper::{Html, Selector};
use tokio_cron_scheduler::{Job, JobScheduler, JobSchedulerError};
use tokio::task;

use uuid::Uuid;
use chrono::Utc;
use std::time::Duration;
use rand::Rng;

use crate::db::connection::DbPool;
use crate::db::article_queries::insert_article;
use crate::db::article_queries::save_image_to_db;
use crate::db::article_queries::load_image_from_db;
use crate::models::article::Article;
use crate::models::article::NewsImage;
use crate::config::app_config::Config; // To get cron expression if needed here, or pass it

use url::Url;
use anyhow::{anyhow, Context};

use std::collections::HashMap;
use std::sync::Arc;
use once_cell::sync::Lazy;
use std::path::{Path, PathBuf};
use tokio::fs::{self, File};
use tokio::io::AsyncWriteExt;

struct NewsClassifier {
    keyword_map: HashMap<&'static str, &'static str>,
}

impl NewsClassifier {
    fn new() -> Self {
        let mut keyword_map = HashMap::new();
        
        // 政治类关键词
        keyword_map.insert("政治", "政治");
        keyword_map.insert("政府", "政治");
        keyword_map.insert("选举", "政治");
        keyword_map.insert("政策", "政治");
        keyword_map.insert("外交", "政治");
        
        // 经济类关键词
        keyword_map.insert("经济", "经济");
        keyword_map.insert("金融", "经济");
        keyword_map.insert("股市", "经济");
        keyword_map.insert("贸易", "经济");
        keyword_map.insert("GDP", "经济");
        
        // 科技类关键词
        keyword_map.insert("科技", "科技");
        keyword_map.insert("人工智能", "科技");
        keyword_map.insert("互联网", "科技");
        keyword_map.insert("5G", "科技");
        keyword_map.insert("量子", "科技");
        
        // 体育类关键词
        keyword_map.insert("体育", "体育");
        keyword_map.insert("足球", "体育");
        keyword_map.insert("篮球", "体育");
        keyword_map.insert("奥运会", "体育");
        keyword_map.insert("冠军", "体育");
        
        // 娱乐类关键词
        keyword_map.insert("娱乐", "娱乐");
        keyword_map.insert("电影", "娱乐");
        keyword_map.insert("明星", "娱乐");
        keyword_map.insert("音乐", "娱乐");
        keyword_map.insert("综艺", "娱乐");
        
        // 健康类关键词
        keyword_map.insert("健康", "健康");
        keyword_map.insert("医疗", "健康");
        keyword_map.insert("疫苗", "健康");
        keyword_map.insert("养生", "健康");
        keyword_map.insert("疾病", "健康");
        
        // 教育类关键词
        keyword_map.insert("教育", "教育");
        keyword_map.insert("学校", "教育");
        keyword_map.insert("学生", "教育");
        keyword_map.insert("高考", "教育");
        keyword_map.insert("教师", "教育");
        
        // 环境类关键词
        keyword_map.insert("环境", "环境");
        keyword_map.insert("气候", "环境");
        keyword_map.insert("污染", "环境");
        keyword_map.insert("环保", "环境");
        keyword_map.insert("碳中和", "环境");
        
        // 国际类关键词
        keyword_map.insert("国际", "国际");
        keyword_map.insert("联合国", "国际");
        keyword_map.insert("外交", "国际");
        keyword_map.insert("全球", "国际");
        keyword_map.insert("世界", "国际");
        
        // 社会类关键词
        keyword_map.insert("社会", "社会");
        keyword_map.insert("民生", "社会");
        keyword_map.insert("社区", "社会");
        keyword_map.insert("公共", "社会");
        keyword_map.insert("公民", "社会");

        NewsClassifier { keyword_map }
    }
    
    fn classify(&self, content: &str) -> &'static str {
        let mut category_counts: HashMap<&'static str, u32> = HashMap::new();
        
        for (keyword, category) in &self.keyword_map {
            if content.contains(keyword) {
                *category_counts.entry(category).or_insert(0) += 1;
            }
        }
        
        category_counts
            .into_iter()
            .max_by_key(|&(_, count)| count)
            .map(|(category, _)| category)
            .unwrap_or("其他")
    }
}

static CLASSIFIER: Lazy<Arc<NewsClassifier>> = Lazy::new(|| {
    Arc::new(NewsClassifier::new())
});

pub fn get_classifier() -> Arc<NewsClassifier> {
    Arc::clone(&CLASSIFIER)
}

// Basic structure for a news source configuration
#[derive(Debug, Clone)]
struct NewsSource {
    name: String,
    url: String,
    article_selector: String,       // CSS selector for individual article links/blocks
    link_selector: String,          // CSS selector for the href within an article block
    title_selector: String,         // CSS selector for the title within an article page
    content_selector: String,       // CSS selector for the content within an article page
    // category_selector: Option(String), // Optional: selector for category
    // date_selector: Option<String>,     // Optional: selector for publish date
    image_selector:String,
    // catelabel:String,
}

// Hardcoded list of news sources for now. Ideally, this would come from a config file or DB.
fn get_news_sources() -> Vec<NewsSource> {
    vec![
        // Example: A generic news site structure (replace with actual selectors for target sites)
        // This is highly dependent on the target website's HTML structure.
        // These selectors are placeholders and WILL NOT WORK on a real news site without adjustment.
        // NewsSource {
        //     name: "ExampleNews".to_string(),
        //     url: "https://example-news-site.com/latest".to_string() , // URL to a page listing multiple articles
        //     article_selector: "div.article-item".to_string(),
        //     link_selector: "a.article-link".to_string(),
        //     title_selector: "h1.article-title".to_string(),
        //     content_selector: "div.article-content p".to_string(),
        // },
        // Add more sources here

        //联合早报
        NewsSource {
            name: "lianhezaobao".to_string(),
            url: "https://www.zaobao.com/".to_string() , // URL to a page listing multiple articles
            article_selector: "div.article-item".to_string(),
            link_selector: "div.row.justify-content-center div.col-12.col-xl-4.col-lg-4.reset-row-margin div.pdb10.relative.real-article a".to_string(),
            title_selector: "div.row.reset-row-margin h1.article-title".to_string(),
            content_selector: "div.row.reset-row-margin article.article-body".to_string(),
            image_selector:"div.row.reset-row-margin div.article-banner img".to_string(),
            // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        },
        NewsSource {
            name: "lianhezaobao".to_string(),
            url: "https://www.zaobao.com/".to_string() , // URL to a page listing multiple articles
            article_selector: "div.article-item".to_string(),
            link_selector: "div.row.justify-content-center div.summary-list-wrapper.line-lg.after-line a".to_string(),
            title_selector: "div.row.reset-row-margin h1.article-title".to_string(),
            content_selector: "div.row.reset-row-margin article.article-body".to_string(),
            image_selector:"div.row.reset-row-margin div.article-banner img".to_string(),
            // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        },
        NewsSource {
            name: "lianhezaobao".to_string(),
            url: "https://www.zaobao.com/".to_string() , // URL to a page listing multiple articles
            article_selector: "div.article-item".to_string(),
            link_selector: "div.float-lg-left.float-none.col-xl-8.col-lg-8.col-12.order-6 div.category.after-line.pdb15-lg div.normal-item a".to_string(),
            title_selector: "div.row.reset-row-margin h1.article-title".to_string(),
            content_selector: "div.row.reset-row-margin article.article-body".to_string(),
            image_selector:"div.row.reset-row-margin div.article-banner img".to_string(),
            // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        },

        //新浪新闻
        // NewsSource {
        //     name: "xinlang".to_string(),
        //     url: "https://news.sina.com.cn/".to_string() , // URL to a page listing multiple articles
        //     article_selector: "div.part_01.clearfix h1 a".to_string(),
        //     link_selector: "dl a".to_string(),
        //     title_selector: "div.layout.rm_txt.cf h1".to_string(),
        //     content_selector: "div.rm_txt_con.cf p".to_string(),
        //     image_selector:"div.layout.rm_txt.cf div.col.col-1.fl div.rm_txt_con.cf img".to_string(),
        //     // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        // },

        //环球时报
        NewsSource {
            name: "huanqiu".to_string(),
            url: "https://www.huanqiu.com/".to_string() , // URL to a page listing multiple articles
            article_selector: "div.article-item".to_string(),
            link_selector: "dl a".to_string(),
            title_selector: "div.layout.rm_txt.cf h1".to_string(),
            content_selector: "div.rm_txt_con.cf p".to_string(),
            image_selector:"div.layout.rm_txt.cf div.col.col-1.fl div.rm_txt_con.cf img".to_string(),
            // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        },

        //人民网
        // NewsSource {
        //     name: "people".to_string(),
        //     url: "http://www.people.com.cn/".to_string() , // URL to a page listing multiple articles
        //     article_selector: "div.article-item".to_string(),
        //     link_selector: "li a".to_string(),
        //     title_selector: "div.layout.rm_txt.cf h1".to_string(),
        //     content_selector: "div.rm_txt_con.cf p".to_string(),
        //     image_selector:"div.layout.rm_txt.cf div.col.col-1.fl div.rm_txt_con.cf img".to_string(),
        //     // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        // },
        NewsSource {
            name: "people".to_string(),
            url: "http://www.people.com.cn/".to_string() , // URL to a page listing multiple articles
            article_selector: "div.article-item".to_string(),
            link_selector: "div.layout.section_Comment.cf h3 a".to_string(),
            title_selector: "div.layout.rm_txt.cf h1".to_string(),
            content_selector: "div.rm_txt_con.cf p".to_string(),
            image_selector:"div.layout.rm_txt.cf div.col.col-1.fl div.rm_txt_con.cf img".to_string(),
            // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        },
        NewsSource {
            name: "people".to_string(),
            url: "http://www.people.com.cn/".to_string() , // URL to a page listing multiple articles
            article_selector: "div.article-item".to_string(),
            link_selector: "div.layout.section_Comment.cf h4 a".to_string(),
            title_selector: "div.layout.rm_txt.cf h1".to_string(),
            content_selector: "div.rm_txt_con.cf p".to_string(),
            image_selector:"div.layout.rm_txt.cf div.col.col-1.fl div.rm_txt_con.cf img".to_string(),
            // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        },
        NewsSource {
            name: "people".to_string(),
            url: "http://www.people.com.cn/".to_string() , // URL to a page listing multiple articles
            article_selector: "div.article-item".to_string(),
            link_selector: "div.layout.Finance.cf.pdao1 li a".to_string(),
            title_selector: "div.layout.rm_txt.cf h1".to_string(),
            content_selector: "div.rm_txt_con.cf p".to_string(),
            image_selector:"div.layout.rm_txt.cf div.col.col-1.fl div.rm_txt_con.cf img".to_string(),
            // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        },
        NewsSource {
            name: "people".to_string(),
            url: "http://www.people.com.cn/".to_string() , // URL to a page listing multiple articles
            article_selector: "div.article-item".to_string(),
            link_selector: "div.layout.Finance.cf.pdao1 p a".to_string(),
            title_selector: "div.layout.rm_txt.cf h1".to_string(),
            content_selector: "div.rm_txt_con.cf p".to_string(),
            image_selector:"div.layout.rm_txt.cf div.col.col-1.fl div.rm_txt_con.cf img".to_string(),
            // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        },
        NewsSource {
            name: "people".to_string(),
            url: "http://www.people.com.cn/".to_string() , // URL to a page listing multiple articles
            article_selector: "div.article-item".to_string(),
            link_selector: "div.layout.science.cf.pdao2 li a".to_string(),
            title_selector: "div.layout.rm_txt.cf h1".to_string(),
            content_selector: "div.rm_txt_con.cf p".to_string(),
            image_selector:"div.layout.rm_txt.cf div.col.col-1.fl div.rm_txt_con.cf img".to_string(),
            // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        },
        NewsSource {
            name: "people".to_string(),
            url: "http://www.people.com.cn/".to_string() , // URL to a page listing multiple articles
            article_selector: "div.article-item".to_string(),
            link_selector: "div.layout.science.cf.pdao2 p a".to_string(),
            title_selector: "div.layout.rm_txt.cf h1".to_string(),
            content_selector: "div.rm_txt_con.cf p".to_string(),
            image_selector:"div.layout.rm_txt.cf div.col.col-1.fl div.rm_txt_con.cf img".to_string(),
            // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        },
        NewsSource {
            name: "people".to_string(),
            url: "http://www.people.com.cn/".to_string() , // URL to a page listing multiple articles
            article_selector: "div.article-item".to_string(),
            link_selector: "div.layout.International_Military.cf.pdao3 li a".to_string(),
            title_selector: "div.layout.rm_txt.cf h1".to_string(),
            content_selector: "div.rm_txt_con.cf p".to_string(),
            image_selector:"div.layout.rm_txt.cf div.col.col-1.fl div.rm_txt_con.cf img".to_string(),
            // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        },
        NewsSource {
            name: "people".to_string(),
            url: "http://www.people.com.cn/".to_string() , // URL to a page listing multiple articles
            article_selector: "div.article-item".to_string(),
            link_selector: "div.layout.International_Military.cf.pdao3 p a".to_string(),
            title_selector: "div.layout.rm_txt.cf h1".to_string(),
            content_selector: "div.rm_txt_con.cf p".to_string(),
            image_selector:"div.layout.rm_txt.cf div.col.col-1.fl div.rm_txt_con.cf img".to_string(),
            // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        },
        NewsSource {
            name: "people".to_string(),
            url: "http://www.people.com.cn/".to_string() , // URL to a page listing multiple articles
            article_selector: "div.article-item".to_string(),
            link_selector: "div.layout.Local_interview.cf.pdao4 li a".to_string(),
            title_selector: "div.layout.rm_txt.cf h1".to_string(),
            content_selector: "div.rm_txt_con.cf p".to_string(),
            image_selector:"div.layout.rm_txt.cf div.col.col-1.fl div.rm_txt_con.cf img".to_string(),
            // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        },
        NewsSource {
            name: "people".to_string(),
            url: "http://www.people.com.cn/".to_string() , // URL to a page listing multiple articles
            article_selector: "div.article-item".to_string(),
            link_selector: "div.div.layout.Local_interview.cf.pdao4 p a".to_string(),
            title_selector: "div.layout.rm_txt.cf h1".to_string(),
            content_selector: "div.rm_txt_con.cf p".to_string(),
            image_selector:"div.layout.rm_txt.cf div.col.col-1.fl div.rm_txt_con.cf img".to_string(),
            // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        },
        NewsSource {
            name: "people".to_string(),
            url: "http://www.people.com.cn/".to_string() , // URL to a page listing multiple articles
            article_selector: "div.article-item".to_string(),
            link_selector: "div.layout.Local_interview.cf.pdao5 li a".to_string(),
            title_selector: "div.layout.rm_txt.cf h1".to_string(),
            content_selector: "div.rm_txt_con.cf p".to_string(),
            image_selector:"div.layout.rm_txt.cf div.col.col-1.fl div.rm_txt_con.cf img".to_string(),
            // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        },
        NewsSource {
            name: "people".to_string(),
            url: "http://www.people.com.cn/".to_string() , // URL to a page listing multiple articles
            article_selector: "div.article-item".to_string(),
            link_selector: "div.layout.Local_interview.cf.pdao5 p a".to_string(),
            title_selector: "div.layout.rm_txt.cf h1".to_string(),
            content_selector: "div.rm_txt_con.cf p".to_string(),
            image_selector:"div.layout.rm_txt.cf div.col.col-1.fl div.rm_txt_con.cf img".to_string(),
            // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        },
        NewsSource {
            name: "people".to_string(),
            url: "http://www.people.com.cn/".to_string() , // URL to a page listing multiple articles
            article_selector: "div.article-item".to_string(),
            link_selector: "div.layout.Local_interview.cf.pdao6 li a".to_string(),
            title_selector: "div.layout.rm_txt.cf h1".to_string(),
            content_selector: "div.rm_txt_con.cf p".to_string(),
            image_selector:"div.layout.rm_txt.cf div.col.col-1.fl div.rm_txt_con.cf img".to_string(),
            // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        },
        NewsSource {
            name: "people".to_string(),
            url: "http://www.people.com.cn/".to_string() , // URL to a page listing multiple articles
            article_selector: "div.article-item".to_string(),
            link_selector: "div.layout.Local_interview.cf.pdao6 p a".to_string(),
            title_selector: "div.layout.rm_txt.cf h1".to_string(),
            content_selector: "div.rm_txt_con.cf p".to_string(),
            image_selector:"div.layout.rm_txt.cf div.col.col-1.fl div.rm_txt_con.cf img".to_string(),
            // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        },
        // NewsSource {
        //     name: "people".to_string(),
        //     url: "http://www.people.com.cn/".to_string() , // URL to a page listing multiple articles
        //     article_selector: "div.article-item".to_string(),
        //     link_selector: "div.Comment.fl div.col.col-2.fr h3 a".to_string(),
        //     title_selector: "div.layout.rm_txt.cf h1".to_string(),
        //     content_selector: "div.rm_txt_con.cf p".to_string(),
        //     image_selector:"div.layout.rm_txt.cf div.col.col-1.fl div.rm_txt_con.cf img".to_string(),
        //     // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        // },
        // NewsSource {
        //     name: "people".to_string(),
        //     url: "http://www.people.com.cn/".to_string() , // URL to a page listing multiple articles
        //     article_selector: "div.article-item".to_string(),
        //     link_selector: "div.layout.section_main.cf li a".to_string(),
        //     title_selector: "div.layout.rm_txt.cf h1".to_string(),
        //     content_selector: "div.rm_txt_con.cf p".to_string(),
        //     image_selector:"div.layout.rm_txt.cf div.col.col-1.fl div.rm_txt_con.cf img".to_string(),
        //     // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        // },
        // NewsSource {
        //     name: "people".to_string(),
        //     url: "http://www.people.com.cn/".to_string() , // URL to a page listing multiple articles
        //     article_selector: "div.article-item".to_string(),
        //     link_selector: "div.layout.International_Military.cf.pdao3 li a".to_string(),
        //     title_selector: "div.layout.rm_txt.cf h1".to_string(),
        //     content_selector: "div.rm_txt_con.cf p".to_string(),
        //     image_selector:"div.layout.rm_txt.cf div.col.col-1.fl div.rm_txt_con.cf img".to_string(),
        //     // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        // },
        // NewsSource {
        //     name: "people".to_string(),
        //     url: "http://sc.people.com.cn/".to_string() , // URL to a page listing multiple articles
        //     article_selector: "div.article-item".to_string(),
        //     link_selector: "div.column_3.mt20.clear.clearfix div.right.w380 li a".to_string(),
        //     title_selector: "div.layout.rm_txt.cf h1".to_string(),
        //     content_selector: "div.rm_txt_con.cf p".to_string(),
        //     image_selector:"div.layout.rm_txt.cf div.col.col-1.fl div.rm_txt_con.cf img".to_string(),
        //     // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        // },

        //百度新闻
        // NewsSource {
        //     name: "baidu".to_string(),
        //     url: "https://news.baidu.com/".to_string() , // URL to a page listing multiple articles
        //     article_selector: "div.article-item".to_string(),
        //     // link_selector: "div#body div.MilitaryNews div.l-left-col.col-mod li a".to_string(),
        //     link_selector: "ul.ulist.focuslistnews li a".to_string(),
        //     // link_selector: "div.MilitaryNews".to_string(),
        //     // link_selector: "div.SportNews".to_string(),
        //     title_selector: "div.sKHSJ".to_string(),
        //     content_selector: "div._18p7x".to_string(),
        //     image_selector:"div.l_1NCGf img".to_string(),
        //     // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        // },//军事新闻
        // NewsSource {
        //     name: "baidu".to_string(),
        //     url: "https://news.baidu.com/".to_string() , // URL to a page listing multiple articles
        //     article_selector: "div.article-item".to_string(),
        //     link_selector: "div.TechNews div.l-left-col.col-mod ul.ulist.focuslistnews li a".to_string(),
        //     // link_selector: "div.TechNews div.l-left-col.col-mod li a".to_string(),
        //     title_selector: "div.sKHSJ".to_string(),
        //     content_selector: "div._18p7x".to_string(),
        //     image_selector:"div.l_1NCGf img".to_string(),
        //     // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        // },//科技新闻
        // NewsSource {
        //     name: "baidu".to_string(),
        //     url: "https://news.baidu.com/".to_string() , // URL to a page listing multiple articles
        //     article_selector: "div.article-item".to_string(),
        //     link_selector: "div.mod-localnews.column.clearfix div.l-left-col.col-mod ul.ulist.focuslistnews li a".to_string(),
        //     title_selector: "div.sKHSJ".to_string(),
        //     content_selector: "div._18p7x".to_string(),
        //     image_selector:"div.l_1NCGf img".to_string(),
        //     // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        // },//本地新闻

        // 腾讯新闻
        // NewsSource {
        //     name: "people".to_string(),
        //     url: "https://news.qq.com/".to_string() , // URL to a page listing multiple articles
        //     // article_selector: "div.article-item".to_string(),
        //     link_selector: "div.channel-feed-list ".to_string(),
        //     title_selector: "div.layout.rm_txt.cf h1".to_string(),
        //     content_selector: "div.rm_txt_con.cf p".to_string(),
        //     image_selector:"div.layout.rm_txt.cf div.col.col-1.fl div.rm_txt_con.cf img".to_string(),
        //     // catelabel:" ".to_string(),
        //     // category_selector:"div.layout.route.cf a:nth-child(2)".to_string(),
        // },
    ]
}


async fn fetch_article_urls(client: &HttpClient, source: &NewsSource) -> Result<Vec<String>, anyhow::Error> {
    log::info!("Fetching article URLs from: {}", source.url);
    let response = client.get(&source.url).send().await?.text().await?;
    let document = Html::parse_document(&response);

    // for line in document.html().lines() {
    // println!("{}", line);
    // // 可以添加延迟，避免刷屏太快
    // std::thread::sleep(std::time::Duration::from_millis(100));
    // }

    // let article_item_selector = Selector::parse(&source.article_selector).unwrap();
    // println!("Start :{}",&source.link_selector);
    let link_selector = Selector::parse(&source.link_selector).unwrap();
    let mut urls = Vec::new();

    let mut count=0;
    // println!("Start :{}",count);
    for link_element in document.select(&link_selector) {
        // println!("Start :{}",count);
        // if let Some(link_element) = element.select(&link_selector).next() {
            if let Some(href) = link_element.value().attr("href") {
                // println!("{}",href.to_string());
                // Ensure the URL is absolute
                let absolute_url = if href.starts_with("http")  {
                    href.to_string()
                } else {
                    // Attempt to join with base URL (simplistic)
                    // let base_url = url::Url::parse(&source.url).map_err(|_| reqwest::Error::custom("Invalid base URL"))?;
                    let base_url = url::Url::parse(&source.url)
                        .with_context(|| format!("Invalid base URL: {}", source.url))?;
                    // base_url.join(href).map_err(|_| reqwest::Error::custom("Failed to join URL"))?.to_string()
                    base_url.join(href).with_context(|| format!("Invalid base URL: {}", source.url))?.to_string()
                };
                urls.push(absolute_url);

                count=count+1;
            }
        // }
        if count>=6
        {
            //break;
        }
    }
    log::info!("Found {} article URLs from {}", urls.len(), source.name);
    Ok(urls)
}

async fn download_image(http_client: &HttpClient, url: &str, base_url: &str) -> Result<NewsImage, anyhow::Error> {
    let dir_path = Path::new(".")
        .join("storage")
        .join("img");

    fs::create_dir_all(&dir_path).await?;

    log::info!("Downloading image from: {}", url);
    log::info!("Downloading image from base_url: {}", base_url);
    let response = http_client.get(url).send().await?;
    
    if !response.status().is_success() {
        return Err(anyhow!("Failed to download image: {}", response.status()));
    }
    
    let content_type = response.headers()
        .get("content-type")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("application/octet-stream")
        .to_string();

    let file_ext = match content_type.split('/').last() {
        Some("jpeg") | Some("jpg") => "jpg",
        Some("png") => "png",
        Some("gif") => "gif",
        Some("webp") => "webp",
        _ => {
            log::warn!("Unknown content type: {}, defaulting to jpg", content_type);
            "jpg"
        }
    };
    let filename = format!(
        "{}.{}",
        chrono::Local::now().format("%H%M%S"),
        //md5::compute(url),
        //hash,
        file_ext
    );
    let filepath = dir_path.join(&filename);
    filepath.display();

    let image_data = response.bytes().await?.to_vec();
    let mut file = File::create(&filepath).await?;
    file.write_all(&image_data).await?;
    log::info!("Image saved to: {}", filepath.display());

    Ok(NewsImage {
        id: 0,  // 将由数据库分配
        url: base_url.to_string(),
        // image_data,
        content_type: content_type,
        file_path: filepath.display().to_string(),
        // article_id: Uuid::nil(),  // 将在保存时设置
    })
}

async fn fetch_and_parse_article(
    http_client: &HttpClient,
    db_pool: &DbPool,
    article_url: &str,
    source: &NewsSource,
)  -> Result<(), anyhow::Error> {
    log::info!("Fetching article content from: {}", article_url);
    let response_text = http_client.get(article_url) .send().await?.text().await?;
    let document = Html::parse_document(&response_text);

    let title_selector = Selector::parse(&source.title_selector).map_err(|e| anyhow::anyhow!("Invalid title selector: {}",e))?;
    let content_selector = Selector::parse(&source.content_selector).map_err(|e| anyhow::anyhow!("Invalid content selector: {}",e))?;
    // let cate_selector = Selector::parse(&source.category_selector).map_err(|e| anyhow!("Invalid cate selector: {}", e))?;
    
    let title = document
        .select(&title_selector)
        .next()
        .map(|el| el.text().collect::<String>().trim().to_string())
        .unwrap_or_else(|| "Title not found".to_string());

    // let cate = document
    //     .select(&cate_selector)
    //     .next()
    //     .map(|el| el.text().collect::<String>().trim().to_string())
    //     .unwrap_or_else(|| "Cate not found".to_string());

    let mut content_parts = Vec::new();
    for element in document.select(&content_selector) {
        content_parts.push(element.text().collect::<String>());
    }
    let content = content_parts.join("\n").trim().to_string();

    if title == "Title not found" || content.is_empty() {
        log::warn!("Could not parse title or content for URL: {}", article_url);
        return Ok(()); // Skip if essential parts are missing
    }

    let classifier=get_classifier();
    let kind=classifier.classify(&content);
    // println!("{}",&kind);

    let article = Article {
        id: Uuid::new_v4(),
        title,
        content,
        url: article_url.to_string(),
        source_name: Some(source.name.clone()),
        categories: Some(vec![kind.to_string()]), // Placeholder, implement category extraction if needed
        published_at: Some(Utc::now()), // Placeholder, implement date extraction if needed
        crawled_at: Utc::now(),
        like_count: Some(0),
        comment_count: Some(0),
        favorite_count: Some(0),
    };

    let client = db_pool.get().await.map_err(|e| anyhow::anyhow!("DB Pool error: {}", e))?;
    match insert_article(&client, &article).await {
        Ok(_) => log::info!("Successfully inserted article: {}", article.title),
        Err(e) => {
            if e.to_string().contains("duplicate key value violates unique constraint") {
                log::warn!("Article already exists (based on URL or title): {} - {}", article.url, article.title);
            } else {
                log::error!("Failed to insert article \"{}\": {}", article.title, e);
            }
        }
    }

    // 提取并保存图片
    // let title_selector = Selector::parse(&source.title_selector).map_err(|e| anyhow::anyhow!("Invalid title selector: {}",e))?;
    let image_selector = Selector::parse(&source.image_selector).map_err(|e| anyhow::anyhow!("Invalid image selector: {}",e))?;
    let mut image_urls = Vec::new();

    // log::info!("Fetching article content from: {}", article_url);
    // 每个url仅保存一张图片
    let mut img_num = 1;
    let mut img_i = 0;
    // 收集所有图片URL
    for img_element in document.select(&image_selector) {
        if img_i >= img_num
        {
            break;
        }
        img_i=img_i+1;
        if let Some(src) = img_element.value().attr("src") {
            let absolute_url = if src.starts_with("http") {
                src.to_string()
            } else {
                let base_url = Url::parse(article_url)?;
                base_url.join(src)?.to_string()
            };
            image_urls.push(absolute_url);
        }
    }

    // 下载并保存图片
    for image_url in image_urls {
        match load_image_from_db(&client, &article_url).await
        {
            Ok(Some(_)) => {break;},
            Ok(None) => {},
            Err(_) => todo!(),
        }
        match download_image(http_client, &image_url,&article_url).await {
            Ok(mut news_image) => {
                // news_image.article_id = article.id;
                match save_image_to_db(&client, &news_image).await {
                    Ok(_) => {
                        //log::info!("Load test:");
                        // match load_image_from_db(&client, &article_url).await {
                        // Ok(Some(img)) => {
                        //     log::info!("✅ Loaded image: ID={}", 
                        //         img.id);
                        // },
                        // Ok(None) => log::warn!("⚠️ Image not found in DB"),
                        // Err(e) => log::error!("❌ Load failed: {}", e),
                        // }
                        log::info!("Saved image for article: {}", article.title)},
                    Err(e) => {
                        load_image_from_db(&client, &article_url);
                        log::error!("Failed to save image: {}", e)},
                }
                // log::info!("Load test:");
                // load_image_from_db(&client, &article_url);
            }
            Err(e) => log::error!("Failed to download image {}: {}", image_url, e),
        }
        
        // 添加延迟以避免被封锁
        let delay_ms = rand::thread_rng().gen_range(1000..3000);
        tokio::time::sleep(Duration::from_millis(delay_ms)).await;
    }

    Ok(())
}

async fn run_crawler_once(db_pool: DbPool) {
    log::info!("Crawler job started.");
    let http_client = HttpClient::builder() 
        .timeout(Duration::from_secs(30))
        // .user_agent(format!("NewsBot/1.0 (+{}; {}@example.com)", روسيا_VERSION, "bot_admin")) // Be a good bot
        .user_agent(format!("NewsBot/1.0 (+{}; {}@example.com)", "1.0", "bot_admin")) // Be a good bot
        .build()
        .expect("Failed to build HTTP client");

    let sources = get_news_sources();
    for source in sources {
        log::info!("Processing source: {}", source.name);
        match fetch_article_urls(&http_client, &source) .await {
            Ok(urls) => {
                for (i, url) in urls.iter().enumerate() {
                    if i > 0 { // Add delay between fetching individual articles from the same source
                        let delay_ms = rand::thread_rng().gen_range(1000..5000); // 1-5 seconds
                        tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                    }
                    if let Err(e) = fetch_and_parse_article(&http_client, &db_pool, url, &source) .await {
                        log::error!("Error processing article {}: {}", url, e);
                    }
                }
            }
            Err(e) => {
                log::error!("Failed to fetch article URLs for source {}: {}", source.name, e);
            }
        }
        // Add a longer delay between processing different sources
        let source_delay_ms = rand::thread_rng().gen_range(5000..15000); // 5-15 seconds
        tokio::time::sleep(Duration::from_millis(source_delay_ms)).await;
    }
    log::info!("Crawler job finished.");
}

pub async fn init_crawler_scheduler(pool: DbPool, cron_expression: &str) -> Result<(), JobSchedulerError> {
    let sched = JobScheduler::new().await?;
    let job_pool = pool.clone();

    let job = Job::new_async(cron_expression, move |_uuid, _l| {
        let current_pool = job_pool.clone();
        Box::pin(async move {
            // 使用 spawn_blocking + block_on 来规避 Non-Send 问题
            task::spawn_blocking(move || {
                let rt = tokio::runtime::Runtime::new().expect("Failed to create Tokio runtime");

                // 显式忽略返回值以满足返回类型为 ()
                let _ = rt.block_on(async move {
                    run_crawler_once(current_pool).await
                });
            });
            // 必须显式返回 unit 类型
            ()
        })
    })?;

    sched.add(job).await?;
    log::info!(
        "Crawler scheduler initialized. Job added with cron: {}",
        cron_expression
    );
    sched.start().await?;
    Ok(())
}
