-- migrate:up
CREATE TABLE `activity_log` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `timestamp` bigint(20) NOT NULL,
  `server` varchar(64) DEFAULT NULL,
  `type` varchar(64) DEFAULT NULL,
  `client` varchar(32) DEFAULT NULL,
  `target` varchar(32) DEFAULT NULL,
  `message` varchar(256) DEFAULT NULL,
  `metadata` longtext DEFAULT NULL,
  PRIMARY KEY (`id`, `timestamp`),
  KEY `activity_log_server_index` (`server`),
  KEY `activity_log_type_index` (`type`),
  FULLTEXT KEY `activity_log_message_index` (`message`)
);
-- migrate:down

