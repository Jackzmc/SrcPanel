-- migrate:up

-- add new columns
ALTER TABLE panel_user
    ADD COLUMN steamid_part VARCHAR(12) NOT NULL first;
ALTER TABLE panel_user_names
    ADD COLUMN steamid_part VARCHAR(12) NOT NULL first,
    DROP CONSTRAINT panel_user_names_panel_user_account_id_fk;

-- pull names from stats_user. uncoment if you use l4d2 stats to pull data from
-- UPDATE panel_user p
-- INNER JOIN stats_users s ON p.account_id = SUBSTRING(s.steamid, 11)
--     SET p.steamid_part = SUBSTRING(s.steamid, 9);

-- UPDATE panel_user_names n
-- INNER JOIN panel_user p ON p.account_id = n.account_id
--     SET n.steamid_part = p.steamid_part;

-- update view to reflect steamid_part instead
drop view view_panel_user;
create view view_panel_user AS
SELECT
    u.steamid_part,
    u.create_time,
    u.avatar_hash,
    u.last_ip,
    u.last_join_time,
    u.last_country,
    u.last_region,
    n.name                                AS last_name,
    n.name_update_time                    AS last_name_update_time,
    COALESCE(n.name_change_count - 1, 0)      AS name_change_count
FROM panel_user u
LEFT JOIN (
    SELECT
        steamid_part,
        name,
        name_update_time,
        COUNT(*) OVER (PARTITION BY steamid_part) AS name_change_count,
        ROW_NUMBER() OVER (
            PARTITION BY steamid_part
            ORDER BY name_update_time DESC, steamid_part DESC
        ) AS rn
    FROM panel_user_names
) n
  ON  n.steamid_part = u.steamid_part
  AND n.rn = 1
ORDER BY create_time;

-- cleanup any bad queries
DELETE FROM panel_user WHERE account_id = '' OR steamid_part = '';
DELETE FROM panel_user_names WHERE account_id = '' OR steamid_part = '';

-- swap primary keys
ALTER TABLE panel_user
    DROP PRIMARY KEY,
    ADD PRIMARY KEY (steamid_part);
ALTER TABLE panel_user_names
    DROP PRIMARY KEY,
    ADD PRIMARY KEY (steamid_part, name_update_time);
ALTER TABLE panel_user_names
    ADD CONSTRAINT panel_user_names__panel_user_account_id_fk
        FOREIGN KEY (steamid_part) REFERENCES panel_user (steamid_part)
        ON UPDATE CASCADE ON DELETE CASCADE;

-- finally change account_id to be computed from steamid_part
ALTER TABLE panel_user
    DROP COLUMN account_id,
    ADD COLUMN account_id VARCHAR(16) AS (SUBSTRING(steamid_part, 3)) VIRTUAL COMMENT 'deprecated, legacy';
ALTER TABLE panel_user_names
    DROP COLUMN account_id,
    ADD COLUMN account_id VARCHAR(16) AS (SUBSTRING(steamid_part, 3)) VIRTUAL COMMENT 'deprecated, legacy';
-- migrate:down

