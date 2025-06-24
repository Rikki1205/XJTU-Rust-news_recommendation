-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 创建文章表
CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    url TEXT NOT NULL UNIQUE,
    source_name TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    crawled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    categories TEXT[],
    feature_vector BYTEA,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0
);

-- 创建文章索引
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
CREATE INDEX IF NOT EXISTS idx_articles_source_name ON articles(source_name);
CREATE INDEX IF NOT EXISTS idx_articles_crawled_at ON articles(crawled_at);

-- 创建用户互动表（点赞、收藏等）
CREATE TABLE IF NOT EXISTS user_interactions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    interaction_type VARCHAR(20) NOT NULL, -- 'like', 'favorite', 'share'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, article_id, interaction_type)
);

-- 创建用户互动索引
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_article_id ON user_interactions(article_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_interactions(interaction_type);

-- 创建评论表
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建评论索引
CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments(article_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- 创建用户阅读历史表
CREATE TABLE IF NOT EXISTS reading_history (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    read_duration INTEGER DEFAULT 0, -- 阅读时长（秒）
    read_percentage FLOAT DEFAULT 0.0, -- 阅读百分比
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, article_id)
);

-- 创建阅读历史索引
CREATE INDEX IF NOT EXISTS idx_reading_history_user_id ON reading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_article_id ON reading_history(article_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_created_at ON reading_history(created_at);

-- 创建用户收藏夹表
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    folder_name VARCHAR(100) DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, article_id)
);

-- 创建收藏夹索引
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_article_id ON user_favorites(article_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_folder ON user_favorites(folder_name);

-- 创建触发器函数来更新文章统计数据
CREATE OR REPLACE FUNCTION update_article_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'user_interactions' THEN
        IF TG_OP = 'INSERT' AND NEW.interaction_type = 'like' AND NEW.is_active = TRUE THEN
            UPDATE articles SET like_count = like_count + 1 WHERE id = NEW.article_id;
        ELSIF TG_OP = 'UPDATE' AND NEW.interaction_type = 'like' THEN
            IF OLD.is_active = FALSE AND NEW.is_active = TRUE THEN
                UPDATE articles SET like_count = like_count + 1 WHERE id = NEW.article_id;
            ELSIF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
                UPDATE articles SET like_count = like_count - 1 WHERE id = NEW.article_id;
            END IF;
        ELSIF TG_OP = 'DELETE' AND OLD.interaction_type = 'like' AND OLD.is_active = TRUE THEN
            UPDATE articles SET like_count = like_count - 1 WHERE id = OLD.article_id;
        END IF;
        
        IF TG_OP = 'INSERT' AND NEW.interaction_type = 'favorite' AND NEW.is_active = TRUE THEN
            UPDATE articles SET favorite_count = favorite_count + 1 WHERE id = NEW.article_id;
        ELSIF TG_OP = 'UPDATE' AND NEW.interaction_type = 'favorite' THEN
            IF OLD.is_active = FALSE AND NEW.is_active = TRUE THEN
                UPDATE articles SET favorite_count = favorite_count + 1 WHERE id = NEW.article_id;
            ELSIF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
                UPDATE articles SET favorite_count = favorite_count - 1 WHERE id = NEW.article_id;
            END IF;
        ELSIF TG_OP = 'DELETE' AND OLD.interaction_type = 'favorite' AND OLD.is_active = TRUE THEN
            UPDATE articles SET favorite_count = favorite_count - 1 WHERE id = OLD.article_id;
        END IF;
    END IF;
    
    IF TG_TABLE_NAME = 'comments' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE articles SET comment_count = comment_count + 1 WHERE id = NEW.article_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE articles SET comment_count = comment_count - 1 WHERE id = OLD.article_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trigger_update_article_stats_interactions
    AFTER INSERT OR UPDATE OR DELETE ON user_interactions
    FOR EACH ROW EXECUTE FUNCTION update_article_stats();

CREATE TRIGGER trigger_update_article_stats_comments
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_article_stats();