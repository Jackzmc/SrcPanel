
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

-- Migrate all old chapter_id column entries to metadata
UPDATE addoncache
SET metadata = json_set(
  COALESCE(metadata, '{}'),
  '$.chapterIds',
  (SELECT json_group_array(trim(value))
   FROM json_each('["' || replace(chapter_ids, ',', '","') || '"]'))
)
WHERE chapter_ids IS NOT NULL
  AND chapter_ids <> '';

ALTER TABLE addoncache DROP COLUMN collection_name;
ALTER TABLE addoncache DROP COLUMN chapter_ids; 

-- Different migration system
DROP TABLE IF EXISTS migrations;
DROP TABLE IF EXISTS meta;

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

