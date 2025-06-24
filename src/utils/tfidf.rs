use std::collections::{HashMap, HashSet};
use rust_stemmers::{Algorithm, Stemmer};

pub struct TfIdf {
    documents: HashMap<String, Vec<String>>, // doc_id -> stemmed tokens
    df: HashMap<String, usize>,              // term -> document frequency
    tfidf_matrix: HashMap<String, HashMap<String, f64>>, // doc_id -> term -> tf-idf
}

impl TfIdf {
    pub fn new() -> Self {
        TfIdf {
            documents: HashMap::new(),
            df: HashMap::new(),
            tfidf_matrix: HashMap::new(),
        }
    }

    pub fn add_document(&mut self, doc_id: &str, text: &str, stemmer: &Stemmer) {
        let tokens = tokenize_and_stem(text, stemmer);
        let unique_terms: HashSet<_> = tokens.iter().cloned().collect();
        for term in &unique_terms {
            *self.df.entry(term.clone()).or_insert(0) += 1;
        }
        self.documents.insert(doc_id.to_string(), tokens);
    }

    pub fn compute(&mut self) {
        let total_docs = self.documents.len();
        for (doc_id, tokens) in &self.documents {
            let mut tf_map = HashMap::new();
            for term in tokens {
                *tf_map.entry(term.clone()).or_insert(0) += 1;
            }
            let doc_len = tokens.len() as f64;
            let mut tfidf_terms = HashMap::new();
            for (term, tf) in tf_map {
                let df = self.df.get(&term).cloned().unwrap_or(1);
                let idf = (total_docs as f64 / df as f64).ln();
                tfidf_terms.insert(term, (tf as f64 / doc_len) * idf);
            }
            self.tfidf_matrix.insert(doc_id.clone(), tfidf_terms);
        }
    }

    pub fn cosine_similarity(&self, doc_a: &str, doc_b: &str) -> f64 {
        let vec_a = self.tfidf_matrix.get(doc_a);
        let vec_b = self.tfidf_matrix.get(doc_b);
        if let (Some(a), Some(b)) = (vec_a, vec_b) {
            let mut dot_product = 0.0;
            let mut norm_a = 0.0;
            let mut norm_b = 0.0;
            let all_keys: HashSet<_> = a.keys().chain(b.keys()).collect();
            for key in all_keys {
                let val_a = *a.get(key).unwrap_or(&0.0);
                let val_b = *b.get(key).unwrap_or(&0.0);
                dot_product += val_a * val_b;
                norm_a += val_a * val_a;
                norm_b += val_b * val_b;
            }
            if norm_a == 0.0 || norm_b == 0.0 {
                return 0.0;
            }
            dot_product / (norm_a.sqrt() * norm_b.sqrt())
        } else {
            0.0
        }
    }
}

pub fn tokenize_and_stem(text: &str, stemmer: &Stemmer) -> Vec<String> {
    text.split_whitespace()
        .map(|token| token.trim_matches(|c: char| !c.is_alphanumeric()).to_lowercase())
        .filter(|t| !t.is_empty())
        .map(|t| stemmer.stem(&t).to_string())
        .collect()
}


