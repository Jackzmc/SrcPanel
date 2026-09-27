
--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

CREATE TABLE workshop_collections (
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

-- Different migration system
DROP TABLE IF EXISTS migrations;

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------
DROP TABLE workshop_collections;
