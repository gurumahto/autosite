CREATE TABLE users (
    user_id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone_no TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE templates (
    template_id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    version TEXT NOT NULL,
    location TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (name, version)
);

CREATE TABLE user_data (
    user_data_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_type TEXT NOT NULL,
    business_description TEXT NOT NULL,
    business_logo_key TEXT,
    business_cover_image_key TEXT,
    gallery_image_keys JSONB NOT NULL DEFAULT '[]'::JSONB,
    social_media_links JSONB NOT NULL DEFAULT '{}'::JSONB,
    business_address JSONB NOT NULL DEFAULT '{}'::JSONB,
    working_hours JSONB NOT NULL DEFAULT '{}'::JSONB,
    template_id BIGINT NOT NULL REFERENCES templates (template_id) ON DELETE RESTRICT,
    template_content JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (jsonb_typeof(gallery_image_keys) = 'array'),
    CHECK (jsonb_typeof(social_media_links) = 'object'),
    CHECK (jsonb_typeof(business_address) = 'object'),
    CHECK (jsonb_typeof(working_hours) = 'object'),
    CHECK (jsonb_typeof(template_content) = 'object')
);

CREATE TABLE websites (
    website_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    user_data_id BIGINT NOT NULL REFERENCES user_data (user_data_id) ON DELETE RESTRICT,
    template_id BIGINT NOT NULL REFERENCES templates (template_id) ON DELETE RESTRICT,
    artifact_key TEXT,
    vercel_project_id TEXT,
    vercel_deployment_id TEXT,
    website_url TEXT,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (
        status IN ('Draft', 'Building', 'Ready', 'Deploying', 'Published', 'Failed')
    ),
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMPTZ,
    build_started_at TIMESTAMPTZ,
    build_completed_at TIMESTAMPTZ,
    deployment_started_at TIMESTAMPTZ,
    deployment_completed_at TIMESTAMPTZ,
    UNIQUE (user_data_id)
);

CREATE TABLE generation_jobs (
    generation_job_id BIGSERIAL PRIMARY KEY,
    website_id BIGINT NOT NULL REFERENCES websites (website_id) ON DELETE CASCADE,
    idempotency_key TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'Queued' CHECK (status IN ('Queued', 'Running', 'Succeeded', 'Failed')),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    correlation_id TEXT NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE TABLE deployment_jobs (
    deployment_job_id BIGSERIAL PRIMARY KEY,
    website_id BIGINT NOT NULL REFERENCES websites (website_id) ON DELETE CASCADE,
    idempotency_key TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'Queued' CHECK (status IN ('Queued', 'Running', 'Succeeded', 'Failed')),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    correlation_id TEXT NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX user_data_user_id_idx ON user_data (user_id);
CREATE INDEX websites_user_id_idx ON websites (user_id);
CREATE INDEX websites_status_idx ON websites (status);
CREATE INDEX generation_jobs_status_idx ON generation_jobs (status);
CREATE INDEX deployment_jobs_status_idx ON deployment_jobs (status);
CREATE INDEX generation_jobs_website_id_idx ON generation_jobs (website_id);
CREATE INDEX deployment_jobs_website_id_idx ON deployment_jobs (website_id);
