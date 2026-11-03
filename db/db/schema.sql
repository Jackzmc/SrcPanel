/*M!999999\- enable the sandbox mode */
-- MariaDB dump 10.19-11.8.8-MariaDB, for Linux (x86_64)
--
-- Host: localhost    Database: left4dead2
-- ------------------------------------------------------
-- Server version	11.8.8-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `activity_log`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_log` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `timestamp` bigint(20) NOT NULL,
  `server` varchar(64) DEFAULT NULL,
  `type` varchar(64) DEFAULT NULL,
  `client` varchar(32) DEFAULT NULL,
  `target` varchar(32) DEFAULT NULL,
  `message` varchar(256) DEFAULT NULL,
  `metadata` longtext DEFAULT NULL,
  PRIMARY KEY (`id`,`timestamp`),
  KEY `activity_log_type_id_index` (`type`,`id`),
  KEY `activity_log_server_id_index` (`server`,`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
 PARTITION BY RANGE (`timestamp`)
(PARTITION `p2026` VALUES LESS THAN (1798783200) ENGINE = InnoDB);
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ban_appeals`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ban_appeals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ban_id` int(11) DEFAULT NULL,
  `state` smallint(6) DEFAULT 0,
  `message` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `ip` varchar(32) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `created` bigint(20) NOT NULL DEFAULT unix_timestamp(),
  `reject_reason` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `rejecter_id` varchar(32) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ban_appeals_bans_id_fk` (`ban_id`),
  CONSTRAINT `ban_appeals_bans_id_fk` FOREIGN KEY (`ban_id`) REFERENCES `bans` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bans`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `steamid` varchar(32) NOT NULL,
  `reason` varchar(255) NOT NULL,
  `public_message` varchar(255) DEFAULT NULL,
  `ip` varchar(32) DEFAULT NULL,
  `expires` bigint(20) DEFAULT NULL,
  `timestamp` bigint(20) DEFAULT unix_timestamp(),
  `flags` smallint(6) NOT NULL DEFAULT 0,
  `expired` tinyint(1) GENERATED ALWAYS AS (ifnull(`expires`,0) > 1 and unix_timestamp() >= `expires`) VIRTUAL,
  `times_tried` smallint(6) NOT NULL DEFAULT 0,
  `executor` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ip` (`ip`),
  KEY `steamid` (`steamid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dash_sessions`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `dash_sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int(11) unsigned NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notes`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `createdAt` int(11) NOT NULL DEFAULT unix_timestamp(),
  `steamid` varchar(32) NOT NULL,
  `markedBy` varchar(32) DEFAULT NULL,
  `content` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `panel_apikeys`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `panel_apikeys` (
  `id` varchar(64) NOT NULL DEFAULT uuid(),
  `steamid` varchar(32) NOT NULL,
  `perms` smallint(6) NOT NULL,
  `created` bigint(20) DEFAULT unix_timestamp(),
  `lastUsed` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `panel_discussion_comments`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `panel_discussion_comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `discussion_id` int(11) NOT NULL,
  `creator` varchar(32) DEFAULT NULL COMMENT 'anonymous if null',
  `content` text NOT NULL,
  `timestamp` int(11) NOT NULL DEFAULT unix_timestamp(),
  PRIMARY KEY (`id`),
  KEY `dash_discussion_comments_dash_discussions_id_fk` (`discussion_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `panel_discussion_options`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `panel_discussion_options` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `discussion_id` int(11) NOT NULL,
  `label` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `dash_discussion_options_dash_discussions_id_fk` (`discussion_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `panel_discussion_responses`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `panel_discussion_responses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `discussion_id` int(11) NOT NULL,
  `steamid` varchar(32) NOT NULL,
  `choice_id` int(11) DEFAULT NULL,
  `text` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `dash_discussion_responses_dash_discussions_id_fk` (`discussion_id`),
  KEY `panel_discussion_responses_panel_discussion_options_id_fk` (`choice_id`),
  CONSTRAINT `panel_discussion_responses_panel_discussion_options_id_fk` FOREIGN KEY (`choice_id`) REFERENCES `panel_discussion_options` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `panel_discussions`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `panel_discussions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `type` tinyint(4) NOT NULL,
  `timestamp` bigint(20) NOT NULL DEFAULT unix_timestamp() COMMENT 'unix seconds',
  `closed_at` bigint(20) DEFAULT NULL COMMENT 'unix seconds',
  `flags` tinyint(4) NOT NULL DEFAULT 0,
  `creator` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `panel_event_responses`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `panel_event_responses` (
  `event_id` int(11) NOT NULL,
  `steamid` varchar(32) NOT NULL,
  `week_start` int(11) NOT NULL,
  `week_end` int(11) GENERATED ALWAYS AS (unix_timestamp(from_unixtime(`week_start`) + interval 7 day) - 1) VIRTUAL,
  `days` binary(21) NOT NULL COMMENT 'JS BigInt where .toString(2) is binary representation',
  `submitted_date` int(11) NOT NULL DEFAULT unix_timestamp(),
  PRIMARY KEY (`event_id`,`week_start`,`steamid`),
  CONSTRAINT `dash_event_responses_dash_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `panel_events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `panel_events`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `panel_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `creator_id` varchar(32) DEFAULT NULL,
  `created_date` int(11) NOT NULL,
  `name` varchar(64) NOT NULL,
  `description` text DEFAULT NULL,
  `min_date` int(11) DEFAULT NULL,
  `max_date` int(11) DEFAULT NULL,
  `min_hour` tinyint(4) DEFAULT 0,
  `max_hour` tinyint(4) NOT NULL DEFAULT 23,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `panel_permissions`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `panel_permissions` (
  `admin_id` int(10) unsigned NOT NULL,
  `code` varchar(64) NOT NULL,
  PRIMARY KEY (`admin_id`,`code`),
  CONSTRAINT `dash_permissions_sm_admins_id_fk` FOREIGN KEY (`admin_id`) REFERENCES `sm_admins` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `panel_perms`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `panel_perms` (
  `steamid` varchar(32) NOT NULL,
  `role` smallint(6) DEFAULT 0,
  `flags` smallint(6) DEFAULT 0,
  PRIMARY KEY (`steamid`),
  UNIQUE KEY `dash_perms_steamid_uindex` (`steamid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `panel_privileges`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `panel_privileges` (
  `steamid` varchar(32) NOT NULL,
  `service` varchar(64) NOT NULL,
  `privilege` tinyint(4) NOT NULL,
  PRIMARY KEY (`steamid`,`service`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `panel_providers`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `panel_providers` (
  `steamid` varchar(32) NOT NULL,
  `provider` varchar(32) NOT NULL,
  `provider_id` varchar(128) NOT NULL,
  `refresh_token` varchar(255) DEFAULT NULL,
  `refresh_token_expired` tinyint(1) NOT NULL DEFAULT 0,
  `access_token` varchar(32) DEFAULT NULL,
  `access_token_expires` int(11) DEFAULT NULL COMMENT 'timestamp',
  `username` varchar(128) DEFAULT NULL,
  `avatar_url` tinytext DEFAULT NULL,
  PRIMARY KEY (`steamid`,`provider`),
  UNIQUE KEY `index_name` (`provider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `panel_sessions`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `panel_sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int(11) unsigned NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `panel_user`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `panel_user` (
  `account_id` varchar(16) NOT NULL,
  `create_time` int(11) NOT NULL DEFAULT unix_timestamp(),
  `last_join_time` int(11) DEFAULT NULL,
  `last_ip` varchar(64) DEFAULT NULL,
  `last_country` varchar(255) DEFAULT NULL,
  `last_region` varchar(255) DEFAULT NULL,
  `avatar_hash` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `panel_user_data`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `panel_user_data` (
  `steamid` varchar(32) NOT NULL,
  `birth_date` tinyint(4) DEFAULT NULL,
  `birth_month` tinyint(4) DEFAULT NULL,
  PRIMARY KEY (`steamid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `panel_user_names`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `panel_user_names` (
  `account_id` varchar(16) NOT NULL,
  `name` varchar(64) NOT NULL,
  `name_update_time` int(11) NOT NULL DEFAULT unix_timestamp(),
  PRIMARY KEY (`account_id`,`name_update_time`),
  CONSTRAINT `panel_user_names_panel_user_account_id_fk` FOREIGN KEY (`account_id`) REFERENCES `panel_user` (`account_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `panel_user_notifications`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `panel_user_notifications` (
  `steamid` varchar(32) NOT NULL,
  `timestamp` int(11) NOT NULL DEFAULT unix_timestamp(),
  `message` varchar(255) NOT NULL,
  `link` varchar(255) DEFAULT NULL,
  `subject_steamid` varchar(32) DEFAULT NULL,
  `level` tinyint(4) NOT NULL DEFAULT 0,
  PRIMARY KEY (`steamid`,`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `schema_migrations`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `schema_migrations` (
  `version` varchar(128) NOT NULL,
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sm_admins`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sm_admins` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `authtype` enum('steam','name','ip') NOT NULL,
  `identity` varchar(65) NOT NULL,
  `password` varchar(65) DEFAULT NULL,
  `flags` varchar(30) NOT NULL,
  `name` varchar(65) NOT NULL,
  `immunity` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_identity` (`identity`),
  UNIQUE KEY `sm_admins_authtype_identity_uindex` (`authtype`,`identity`),
  KEY `sm_admins_dash_perms_steamid_fk` (`identity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sm_admins_groups`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sm_admins_groups` (
  `admin_id` int(10) unsigned NOT NULL,
  `group_id` int(10) unsigned NOT NULL,
  `inherit_order` int(10) NOT NULL,
  PRIMARY KEY (`admin_id`,`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sm_config`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sm_config` (
  `cfg_key` varchar(32) NOT NULL,
  `cfg_value` varchar(255) NOT NULL,
  PRIMARY KEY (`cfg_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sm_group_immunity`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sm_group_immunity` (
  `group_id` int(10) unsigned NOT NULL,
  `other_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`group_id`,`other_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sm_group_overrides`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sm_group_overrides` (
  `group_id` int(10) unsigned NOT NULL,
  `type` enum('command','group') NOT NULL,
  `name` varchar(32) NOT NULL,
  `access` enum('allow','deny') NOT NULL,
  PRIMARY KEY (`group_id`,`type`,`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sm_group_permissions`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sm_group_permissions` (
  `group_id` int(10) unsigned NOT NULL,
  `code` varchar(64) NOT NULL,
  PRIMARY KEY (`group_id`,`code`),
  CONSTRAINT `sm_group_permissions_sm_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `sm_groups` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sm_group_privileges`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sm_group_privileges` (
  `group_id` int(10) unsigned DEFAULT NULL,
  `service` varchar(32) DEFAULT NULL,
  `privilege` tinyint(4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sm_groups`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sm_groups` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `flags` varchar(30) NOT NULL,
  `name` varchar(120) NOT NULL,
  `immunity_level` int(1) unsigned NOT NULL,
  `parent_id` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sm_groups_sm_groups_id_fk` (`parent_id`),
  CONSTRAINT `sm_groups_sm_groups_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `sm_groups` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sm_overrides`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sm_overrides` (
  `type` enum('command','group') NOT NULL,
  `name` varchar(32) NOT NULL,
  `flags` varchar(30) NOT NULL,
  PRIMARY KEY (`type`,`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stats_games`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `stats_games` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` uuid NOT NULL DEFAULT uuid() COMMENT 'legacy campaignID',
  `date_start` bigint(20) NOT NULL COMMENT 'unix timestamp',
  `date_start_finale` int(11) DEFAULT NULL COMMENT 'unix timestamp of finale',
  `date_end` bigint(20) DEFAULT NULL COMMENT 'unix timestamp',
  `duration_game` bigint(20) GENERATED ALWAYS AS (`date_end` - `date_start`) VIRTUAL COMMENT 'seconds of game',
  `duration_finale` bigint(20) GENERATED ALWAYS AS (`date_end` - `date_start_finale`) VIRTUAL COMMENT 'seconds of finale',
  `map_id` varchar(64) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL COMMENT 'map id of last chapter',
  `gamemode` varchar(64) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `difficulty` tinyint(4) DEFAULT NULL COMMENT '0=easy, 1=normal, 2=advanced, 3=expert',
  `server_tags` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL COMMENT 'comma separated list of tags',
  `stat_version` tinyint(3) unsigned NOT NULL COMMENT 'version of metrics',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `stats_games_gamemode_index` (`gamemode`),
  KEY `stats_games_map_id_index` (`map_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stats_games_bak`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `stats_games_bak` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `steamid` varchar(32) NOT NULL,
  `map` varchar(128) NOT NULL COMMENT 'the map id',
  `flags` tinyint(4) NOT NULL DEFAULT 0,
  `campaignID` uuid NOT NULL COMMENT 'unique campaign session id',
  `gamemode` varchar(30) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `difficulty` tinyint(2) NOT NULL DEFAULT 0,
  `duration` int(11) GENERATED ALWAYS AS ((`date_end` - `date_start`) / 60) VIRTUAL COMMENT 'in minutes',
  `join_time` bigint(20) unsigned NOT NULL COMMENT 'when user first joined game',
  `date_start` bigint(20) unsigned DEFAULT NULL COMMENT 'when campaign started',
  `date_end` bigint(20) NOT NULL,
  `finale_time` int(11) unsigned NOT NULL,
  `character_type` tinyint(3) unsigned DEFAULT NULL,
  `ping` tinyint(4) unsigned DEFAULT NULL,
  `server_tags` text DEFAULT NULL,
  `zombie_kills` int(10) unsigned NOT NULL DEFAULT 0,
  `melee_kills` smallint(10) unsigned NOT NULL DEFAULT 0,
  `SurvivorDamage` int(10) unsigned NOT NULL DEFAULT 0,
  `SurvivorFFCount` mediumint(8) unsigned NOT NULL DEFAULT 0,
  `SurvivorFFTakenCount` int(11) DEFAULT NULL,
  `SurvivorFFDamage` int(11) DEFAULT NULL,
  `SurvivorFFTakenDamage` int(11) DEFAULT NULL,
  `MedkitsUsed` tinyint(10) unsigned NOT NULL DEFAULT 0,
  `FirstAidShared` tinyint(10) unsigned NOT NULL DEFAULT 0,
  `PillsUsed` smallint(10) unsigned NOT NULL DEFAULT 0,
  `MolotovsUsed` smallint(10) unsigned NOT NULL DEFAULT 0,
  `PipebombsUsed` smallint(10) unsigned NOT NULL DEFAULT 0,
  `BoomerBilesUsed` smallint(10) unsigned NOT NULL DEFAULT 0,
  `AdrenalinesUsed` smallint(10) unsigned NOT NULL DEFAULT 0,
  `DefibrillatorsUsed` smallint(10) unsigned NOT NULL DEFAULT 0,
  `DamageTaken` int(10) unsigned NOT NULL DEFAULT 0,
  `ReviveOtherCount` smallint(10) unsigned NOT NULL DEFAULT 0,
  `Incaps` smallint(10) unsigned NOT NULL DEFAULT 0,
  `Deaths` tinyint(10) unsigned NOT NULL DEFAULT 0,
  `boomer_kills` smallint(10) unsigned DEFAULT NULL,
  `smoker_kills` smallint(10) unsigned DEFAULT NULL,
  `jockey_kills` smallint(10) unsigned DEFAULT NULL,
  `hunter_kills` smallint(10) unsigned DEFAULT NULL,
  `spitter_kills` smallint(10) unsigned DEFAULT NULL,
  `charger_kills` smallint(10) unsigned DEFAULT NULL,
  `SpecialInfectedKills` int(10) unsigned GENERATED ALWAYS AS (`boomer_kills` + `spitter_kills` + `jockey_kills` + `charger_kills` + `hunter_kills` + `smoker_kills`) VIRTUAL,
  `honks` smallint(5) unsigned DEFAULT 0,
  `top_weapon` varchar(64) DEFAULT NULL,
  `minutes_idle` mediumint(8) unsigned NOT NULL DEFAULT 0,
  `WitchesCrowned` mediumint(8) unsigned NOT NULL DEFAULT 0,
  `SmokersSelfCleared` mediumint(8) unsigned NOT NULL DEFAULT 0,
  `RocksHitBy` mediumint(8) unsigned NOT NULL DEFAULT 0,
  `RocksDodged` mediumint(8) unsigned NOT NULL DEFAULT 0,
  `HuntersDeadstopped` mediumint(8) unsigned NOT NULL DEFAULT 0,
  `TimesPinned` mediumint(8) unsigned NOT NULL DEFAULT 0,
  `ClearedPinned` mediumint(8) unsigned DEFAULT 0,
  `BoomedTeammates` smallint(5) unsigned NOT NULL DEFAULT 0,
  `TimesBoomed` mediumint(8) unsigned NOT NULL DEFAULT 0,
  `DamageToTank` mediumint(8) unsigned NOT NULL DEFAULT 0,
  `DamageToWitch` mediumint(8) unsigned NOT NULL DEFAULT 0,
  `DamageDealt` int(10) unsigned NOT NULL DEFAULT 0,
  `CarAlarmsActivated` tinyint(3) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `campaignID` (`campaignID`,`steamid`),
  KEY `stats_games_campaignID_index` (`campaignID`),
  KEY `stats_games_stats_users_steamid_fk` (`steamid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stats_map_info`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `stats_map_info` (
  `mission_id` varchar(64) DEFAULT NULL,
  `mapid` varchar(32) NOT NULL,
  `name` varchar(128) NOT NULL,
  `chapter_count` smallint(6) DEFAULT NULL,
  `flags` smallint(6) DEFAULT 0 COMMENT '1:official',
  PRIMARY KEY (`mapid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stats_map_ratings`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `stats_map_ratings` (
  `map_id` varchar(64) NOT NULL,
  `steamid` varchar(32) NOT NULL,
  `value` tinyint(4) NOT NULL,
  `comment` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`map_id`,`steamid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stats_points`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `stats_points` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `steamid` varchar(32) NOT NULL,
  `type` tinyint(3) unsigned NOT NULL,
  `amount` smallint(6) NOT NULL COMMENT 'point value',
  `timestamp` int(11) unsigned NOT NULL,
  `multiplier` tinyint(3) unsigned NOT NULL DEFAULT 1 COMMENT 'number of times to apply (merged record)',
  PRIMARY KEY (`id`),
  KEY `stats_points_stats_users_steamid_fk` (`steamid`),
  KEY `stats_points_timestamp_index` (`timestamp`),
  CONSTRAINT `stats_points_stats_users_steamid_fk` FOREIGN KEY (`steamid`) REFERENCES `stats_users` (`steamid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stats_points_history`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `stats_points_history` (
  `period_start` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'unix timestamp',
  `period_end` int(10) unsigned NOT NULL DEFAULT unix_timestamp() COMMENT 'unix timestamp',
  `steamid` varchar(32) NOT NULL,
  `points` int(10) unsigned NOT NULL,
  PRIMARY KEY (`period_end`,`steamid`),
  KEY `stats_points_history_stats_users_steamid_fk` (`steamid`),
  CONSTRAINT `stats_points_history_stats_users_steamid_fk` FOREIGN KEY (`steamid`) REFERENCES `stats_users` (`steamid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stats_sessions`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `stats_sessions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `game_id` int(10) unsigned NOT NULL,
  `steamid` varchar(32) NOT NULL,
  `flags` tinyint(4) NOT NULL DEFAULT 0,
  `join_time` bigint(20) unsigned NOT NULL COMMENT 'when user first joined game',
  `character_type` tinyint(3) unsigned DEFAULT NULL,
  `ping` tinyint(4) unsigned DEFAULT NULL,
  `kills_common` int(10) unsigned NOT NULL DEFAULT 0,
  `kills_melee` smallint(10) unsigned NOT NULL DEFAULT 0,
  `damage_dealt` int(10) unsigned NOT NULL DEFAULT 0,
  `damage_dealt_friendly_count` mediumint(8) unsigned NOT NULL DEFAULT 0,
  `damage_taken_friendly_count` int(11) DEFAULT NULL,
  `damage_dealt_friendly` int(11) DEFAULT NULL,
  `damage_taken_friendly` int(11) DEFAULT NULL,
  `used_kit_self` tinyint(10) unsigned NOT NULL DEFAULT 0 COMMENT 'heal self',
  `used_kit_other` tinyint(10) unsigned NOT NULL DEFAULT 0 COMMENT 'healed teammate',
  `used_pills` smallint(10) unsigned NOT NULL DEFAULT 0,
  `used_molotov` smallint(10) unsigned NOT NULL DEFAULT 0,
  `used_pipebomb` smallint(10) unsigned NOT NULL DEFAULT 0,
  `used_bile` smallint(10) unsigned NOT NULL DEFAULT 0,
  `used_adrenaline` smallint(10) unsigned NOT NULL DEFAULT 0,
  `used_defib` smallint(10) unsigned NOT NULL DEFAULT 0,
  `damage_taken` int(10) unsigned NOT NULL DEFAULT 0,
  `times_revived_other` smallint(10) unsigned NOT NULL DEFAULT 0,
  `times_hanging` smallint(5) unsigned DEFAULT 0,
  `times_incapped` smallint(10) unsigned NOT NULL DEFAULT 0,
  `deaths` tinyint(10) unsigned NOT NULL DEFAULT 0,
  `kills_boomer` smallint(10) unsigned NOT NULL,
  `kills_smoker` smallint(10) unsigned NOT NULL,
  `kills_jockey` smallint(10) unsigned NOT NULL,
  `kills_hunter` smallint(10) unsigned NOT NULL,
  `kills_spitter` smallint(10) unsigned NOT NULL,
  `kills_charger` smallint(10) unsigned NOT NULL,
  `kills_all_specials` int(10) unsigned GENERATED ALWAYS AS (`kills_boomer` + `kills_smoker` + `kills_jockey` + `kills_hunter` + `kills_spitter` + `kills_charger`) VIRTUAL,
  `kills_tank` smallint(5) unsigned DEFAULT NULL,
  `kills_witch` smallint(5) unsigned DEFAULT NULL,
  `kills_fire` smallint(5) unsigned DEFAULT NULL COMMENT 'gascan/molotov',
  `kills_pipebomb` smallint(5) unsigned DEFAULT NULL,
  `kills_minigun` smallint(5) unsigned DEFAULT NULL,
  `honks` smallint(5) unsigned DEFAULT 0 COMMENT 'clowns honked',
  `top_weapon` varchar(64) DEFAULT NULL,
  `witches_crowned` smallint(8) unsigned NOT NULL DEFAULT 0,
  `smokers_selfcleared` smallint(8) unsigned NOT NULL DEFAULT 0,
  `rocks_hitby` smallint(8) unsigned NOT NULL DEFAULT 0,
  `rocks_dodged` smallint(8) unsigned NOT NULL DEFAULT 0,
  `hunters_deadstopped` smallint(8) unsigned NOT NULL DEFAULT 0,
  `times_pinned` smallint(8) unsigned NOT NULL DEFAULT 0,
  `times_cleared_pinned` smallint(8) unsigned DEFAULT 0 COMMENT 'helped pinned teammate',
  `times_boomed_teammates` smallint(5) unsigned NOT NULL DEFAULT 0,
  `times_boomed` smallint(8) unsigned NOT NULL DEFAULT 0,
  `damage_dealt_tank` mediumint(8) unsigned NOT NULL DEFAULT 0 COMMENT 'dmg to tank',
  `damage_dealt_witch` mediumint(8) unsigned NOT NULL DEFAULT 0 COMMENT 'dmg to witch',
  `caralarms_activated` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `longest_shot_distance` float DEFAULT NULL,
  `seconds_alive` int(10) unsigned NOT NULL,
  `seconds_idle` int(10) unsigned NOT NULL,
  `seconds_dead` int(10) unsigned DEFAULT 0,
  `seconds_total` int(10) unsigned GENERATED ALWAYS AS (`seconds_alive` + `seconds_idle` + `seconds_dead`) VIRTUAL,
  PRIMARY KEY (`id`),
  KEY `stats_games_stats_users_steamid_fk` (`steamid`),
  KEY `stats_sessions_stats_games_id_fk` (`game_id`),
  CONSTRAINT `stats_games_stats_users_steamid_fk` FOREIGN KEY (`steamid`) REFERENCES `stats_users` (`steamid`) ON DELETE CASCADE,
  CONSTRAINT `stats_sessions_stats_games_id_fk` FOREIGN KEY (`game_id`) REFERENCES `stats_games` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stats_users`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `stats_users` (
  `steamid` varchar(32) NOT NULL COMMENT 'steamid2',
  `last_alias` varchar(32) NOT NULL COMMENT 'last known name',
  `last_join_date` bigint(11) NOT NULL,
  `created_date` bigint(11) NOT NULL,
  `connections` int(11) unsigned NOT NULL DEFAULT 1 COMMENT 'times joined server',
  `country` varchar(60) NOT NULL,
  `region` varchar(60) DEFAULT NULL,
  `points` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'current points earned',
  `points_start_time` int(10) unsigned NOT NULL DEFAULT unix_timestamp() COMMENT 'unix timestamp when current points had reset',
  `points_cuml` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'total points earned',
  `deaths` int(11) unsigned NOT NULL DEFAULT 0,
  `damage_taken` bigint(11) unsigned NOT NULL DEFAULT 0,
  `damage_dealt` bigint(11) unsigned NOT NULL DEFAULT 0,
  `pickups_molotov` int(11) unsigned NOT NULL DEFAULT 0,
  `pickups_bile` int(11) unsigned NOT NULL DEFAULT 0,
  `pickups_pipebomb` int(11) unsigned NOT NULL DEFAULT 0,
  `pickups_pills` int(11) unsigned NOT NULL DEFAULT 0,
  `times_incapped` int(11) unsigned NOT NULL DEFAULT 0,
  `times_hanging` int(11) unsigned NOT NULL DEFAULT 0 COMMENT 'ledge grabs',
  `used_pills` int(11) unsigned NOT NULL DEFAULT 0,
  `used_adrenaline` int(11) unsigned NOT NULL DEFAULT 0,
  `used_kit_self` int(11) unsigned NOT NULL DEFAULT 0 COMMENT 'healed self',
  `used_kit_other` int(11) unsigned NOT NULL DEFAULT 0 COMMENT 'healed teammate',
  `used_defib` int(11) unsigned NOT NULL DEFAULT 0,
  `times_revived` int(11) unsigned NOT NULL DEFAULT 0 COMMENT 'self got incapped',
  `times_revived_other` int(11) unsigned NOT NULL DEFAULT 0,
  `pickups_adrenaline` int(11) DEFAULT NULL,
  `kills_melee` int(11) unsigned NOT NULL DEFAULT 0 COMMENT 'kils with melee',
  `kills_tank` int(10) unsigned NOT NULL DEFAULT 0,
  `kills_tank_solo` int(10) unsigned NOT NULL DEFAULT 0,
  `kills_tank_melee` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'with melee',
  `damage_dealt_friendly` int(10) unsigned NOT NULL DEFAULT 0,
  `damage_taken_friendly` int(11) DEFAULT 0 COMMENT 'ff recv',
  `kills_common` int(10) unsigned DEFAULT 0,
  `kills_common_headshots` int(10) unsigned NOT NULL DEFAULT 0,
  `door_opens` int(10) unsigned NOT NULL DEFAULT 0,
  `damage_dealt_tank` int(10) unsigned DEFAULT 0,
  `damage_dealt_witch` int(10) unsigned NOT NULL DEFAULT 0,
  `finales_won` int(10) unsigned NOT NULL DEFAULT 0,
  `kills_smoker` int(10) unsigned NOT NULL DEFAULT 0,
  `kills_boomer` int(10) unsigned NOT NULL DEFAULT 0,
  `kills_hunter` int(10) unsigned NOT NULL DEFAULT 0,
  `kills_spitter` int(10) unsigned NOT NULL DEFAULT 0,
  `kills_jockey` int(10) unsigned NOT NULL DEFAULT 0,
  `kills_charger` int(10) unsigned NOT NULL DEFAULT 0,
  `kills_witch` int(10) unsigned NOT NULL DEFAULT 0,
  `used_ammo_packs` int(10) unsigned NOT NULL DEFAULT 0,
  `kills_friendly` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'teammates killed',
  `used_bile` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'throws',
  `used_molotov` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'throws',
  `used_pipebomb` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'throws',
  `damage_dealt_fire` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'gascan/molotov',
  `kills_fire` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'gascan/molotov',
  `kills_pipebomb` int(10) unsigned NOT NULL DEFAULT 0,
  `kills_minigun` int(10) unsigned NOT NULL DEFAULT 0,
  `caralarms_activated` smallint(5) unsigned NOT NULL DEFAULT 0,
  `witches_crowned` int(10) unsigned NOT NULL DEFAULT 0,
  `witches_crowned_angry` smallint(5) unsigned NOT NULL DEFAULT 0,
  `smokers_selfcleared` int(10) unsigned NOT NULL DEFAULT 0,
  `rocks_hitby` int(10) unsigned NOT NULL DEFAULT 0,
  `rocks_dodged` int(10) unsigned NOT NULL DEFAULT 0,
  `hunters_deadstopped` int(10) unsigned NOT NULL DEFAULT 0,
  `times_cleared_pinned` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'helped survivor that was pinned',
  `times_pinned` int(10) unsigned NOT NULL DEFAULT 0,
  `honks` smallint(5) unsigned NOT NULL DEFAULT 0 COMMENT 'clown honks',
  `times_boomed_teammates` int(11) DEFAULT 0 COMMENT 'popped boomer and got someone boomed',
  `times_boomed_self` smallint(6) DEFAULT 0 COMMENT 'popped boomer and got self boomed',
  `times_boomed` int(11) DEFAULT NULL,
  `forgot_kit_count` smallint(5) unsigned NOT NULL DEFAULT 0 COMMENT 'forgot kit in saferoom if some left',
  `total_distance_travelled` float DEFAULT 0,
  `kills_all_specials` int(11) GENERATED ALWAYS AS (`kills_boomer` + `kills_charger` + `kills_smoker` + `kills_jockey` + `kills_hunter` + `kills_spitter`) VIRTUAL,
  `kits_slapped` int(11) NOT NULL DEFAULT 0,
  `damage_dealt_friendly_count` mediumint(8) unsigned NOT NULL DEFAULT 0,
  `damage_taken_friendly_count` mediumint(8) unsigned DEFAULT 0,
  `used_kit` int(11) GENERATED ALWAYS AS (`used_kit_self` + `used_kit_other`) VIRTUAL COMMENT 'any usage',
  `seconds_alive` int(10) unsigned NOT NULL,
  `seconds_idle` int(10) unsigned NOT NULL,
  `seconds_dead` int(10) unsigned DEFAULT 0,
  `seconds_total` int(10) unsigned GENERATED ALWAYS AS (`seconds_alive` + `seconds_idle` + `seconds_dead`) VIRTUAL,
  PRIMARY KEY (`steamid`),
  KEY `points` (`steamid`),
  FULLTEXT KEY `last_alias` (`last_alias`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stats_weapon_names`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `stats_weapon_names` (
  `id` varchar(64) NOT NULL,
  `name` varchar(64) NOT NULL,
  `melee` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stats_weapon_usages`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `stats_weapon_usages` (
  `steamid` varchar(32) NOT NULL,
  `weapon` varchar(64) NOT NULL,
  `minutesUsed` float NOT NULL,
  `totalDamage` bigint(20) NOT NULL,
  `headshots` int(11) NOT NULL,
  `kills` int(11) NOT NULL,
  PRIMARY KEY (`steamid`,`weapon`),
  CONSTRAINT `stats_weapon_usages_stats_users_steamid_fk` FOREIGN KEY (`steamid`) REFERENCES `stats_users` (`steamid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `view_panel_user`
--

SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `view_panel_user` AS SELECT
 NULL AS `account_id`,
 NULL AS `create_time`,
 NULL AS `avatar_hash`,
 NULL AS `last_ip`,
 NULL AS `last_join_time`,
 NULL AS `last_country`,
 NULL AS `last_region`,
 NULL AS `last_name_update_time`,
 NULL AS `last_name` */;
SET character_set_client = @saved_cs_client;

--
-- Dumping routines for database 'left4dead2'
--

--
-- Final view structure for view `view_panel_user`
--

/*!50001 DROP VIEW IF EXISTS `view_panel_user`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`jackz`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `view_panel_user` AS select `u`.`account_id` AS `account_id`,`u`.`create_time` AS `create_time`,`u`.`avatar_hash` AS `avatar_hash`,`u`.`last_ip` AS `last_ip`,`u`.`last_join_time` AS `last_join_time`,`u`.`last_country` AS `last_country`,`u`.`last_region` AS `last_region`,`pun`.`name_update_time` AS `last_name_update_time`,`pun`.`name` AS `last_name` from ((`panel_user` `u` left join (select `panel_user_names`.`account_id` AS `account_id`,max(`panel_user_names`.`name_update_time`) AS `name_update_time` from `panel_user_names` group by `panel_user_names`.`account_id`) `latest` on(`u`.`account_id` = `latest`.`account_id`)) left join `panel_user_names` `pun` on(`latest`.`account_id` = `pun`.`account_id` and `latest`.`name_update_time` = `pun`.`name_update_time`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed

--
-- Dbmate schema migrations
--

LOCK TABLES `schema_migrations` WRITE;
INSERT INTO `schema_migrations` (version) VALUES
  ('0'),
  ('1'),
  ('20260630192111'),
  ('20260630210539'),
  ('20260630210543'),
  ('20260630210546'),
  ('20261103184914');
UNLOCK TABLES;
