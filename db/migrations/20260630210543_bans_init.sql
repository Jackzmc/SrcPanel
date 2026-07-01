-- migrate:up
CREATE TABLE `bans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `steamid` varchar(32) NOT NULL,
  `reason` varchar(255) NOT NULL,
  `public_message` varchar(255) DEFAULT NULL,
  `ip` varchar(32) DEFAULT NULL,
  `expires` bigint(20) DEFAULT NULL,
  `timestamp` bigint(20) DEFAULT unix_timestamp(),
  `flags` smallint(6) NOT NULL DEFAULT 0,
  `expired` tinyint(1) GENERATED ALWAYS AS (
    ifnull(`expires`, 0) > 1
    and unix_timestamp() >= `expires`
  ) VIRTUAL,
  `times_tried` smallint(6) NOT NULL DEFAULT 0,
  `executor` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ip` (`ip`),
  KEY `steamid` (`steamid`)
);
CREATE TABLE `ban_appeals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ban_id` int(11) DEFAULT NULL,
  `state` smallint(6) DEFAULT 0,
  `message` varchar(255) NOT NULL,
  `ip` varchar(32) DEFAULT NULL,
  `created` bigint(20) NOT NULL DEFAULT unix_timestamp(),
  `reject_reason` varchar(255) DEFAULT NULL,
  `rejecter_id` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ban_appeals_bans_id_fk` (`ban_id`),
  CONSTRAINT `ban_appeals_bans_id_fk` FOREIGN KEY (`ban_id`) REFERENCES `bans` (`id`)
);
-- migrate:down

