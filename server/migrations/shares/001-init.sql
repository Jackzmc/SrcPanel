
--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS meta (
    key VARCHAR(128) NOT  NULL,
    value VARCHAR(128) NOT NULL,
    PRIMARY KEY(key)
);
CREATE TABLE IF NOT EXISTS addoncache (
    filename VARCHAR(128) NOT NULL,
    filesize INT,
    lastModified INT,
    ws_info TEXT,
    collection_id VARCHAR(32),
    collection_name VARCHAR(64),
    chapter_ids TEXT,
    metadata TEXT,
    PRIMARY KEY (filename)
);

CREATE TABLE IF NOT EXISTS meta (
    key VARCHAR(128) NOT NULL,
    value VARCHAR(128) NOT NULL,
    PRIMARY KEY (key)
);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------
