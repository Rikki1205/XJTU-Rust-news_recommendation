CREATE TABLE IF NOT EXISTS news_images (
    id SERIAL,
    url TEXT NOT NULL PRIMARY KEY,
    content_type VARCHAR(100) NOT NULL,
    storage_path TEXT NOT NULL
);