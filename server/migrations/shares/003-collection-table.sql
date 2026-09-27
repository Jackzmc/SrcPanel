
--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workshop_collections (
    id VARCHAR(64) NOT NULL,
    name VARCHAR(128) NOT NULL,
    PRIMARY KEY (id)
);

-- Migrate all ids and names to table
INSERT INTO workshop_collections (id, name) 
SELECT collection_id, collection_name 
FROM addoncache 
WHERE collection_id IS NOT NULL
GROUP BY collection_id;

ALTER TABLE addoncache DROP COLUMN collection_name;

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------
