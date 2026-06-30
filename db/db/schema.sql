/*M!999999\- enable the sandbox mode */
-- MariaDB dump 10.19  Distrib 10.11.18-MariaDB, for Linux (x86_64)
--
-- Host: localhost    Database: demo
-- ------------------------------------------------------
-- Server version	10.11.18-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `dash_discussion_comments`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `dash_discussion_comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `discussion_id` int(11) NOT NULL,
  `creator` varchar(32) DEFAULT NULL COMMENT 'anonymous if null',
  `content` text NOT NULL,
  `timestamp` int(11) NOT NULL DEFAULT unix_timestamp(),
  PRIMARY KEY (`id`),
  KEY `dash_discussion_comments_dash_discussions_id_fk` (`discussion_id`),
  CONSTRAINT `dash_discussion_comments_dash_discussions_id_fk` FOREIGN KEY (`discussion_id`) REFERENCES `dash_discussions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dash_discussion_options`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `dash_discussion_options` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `discussion_id` int(11) NOT NULL,
  `label` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `dash_discussion_options_dash_discussions_id_fk` (`discussion_id`),
  CONSTRAINT `dash_discussion_options_dash_discussions_id_fk` FOREIGN KEY (`discussion_id`) REFERENCES `dash_discussions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dash_discussion_responses`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `dash_discussion_responses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `discussion_id` int(11) NOT NULL,
  `steamid` varchar(32) NOT NULL,
  `choice` int(11) DEFAULT NULL,
  `text` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `dash_discussion_responses_dash_discussions_id_fk` (`discussion_id`),
  CONSTRAINT `dash_discussion_responses_dash_discussions_id_fk` FOREIGN KEY (`discussion_id`) REFERENCES `dash_discussions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dash_discussions`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `dash_discussions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `type` tinyint(4) NOT NULL,
  `timestamp` bigint(20) NOT NULL DEFAULT unix_timestamp() COMMENT 'unix seconds',
  `closed_at` bigint(20) DEFAULT NULL COMMENT 'unix seconds',
  `flags` tinyint(4) NOT NULL DEFAULT 0,
  `creator` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dash_permissions`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `dash_permissions` (
  `admin_id` int(10) unsigned NOT NULL,
  `code` varchar(64) NOT NULL,
  PRIMARY KEY (`admin_id`,`code`),
  CONSTRAINT `dash_permissions_sm_admins_id_fk` FOREIGN KEY (`admin_id`) REFERENCES `sm_admins` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dash_providers`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `dash_providers` (
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `schema_migrations`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `schema_migrations` (
  `version` varchar(128) NOT NULL,
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
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
-- Dumping routines for database 'demo'
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
/*!50001 VIEW `view_panel_user` AS select `u`.`account_id` AS `account_id`,`u`.`create_time` AS `create_time`,`u`.`avatar_hash` AS `avatar_hash`,`u`.`last_ip` AS `last_ip`,`u`.`last_join_time` AS `last_join_time`,`u`.`last_country` AS `last_country`,`u`.`last_region` AS `last_region`,`pun`.`name_update_time` AS `last_name_update_time`,`pun`.`name` AS `last_name` from (`panel_user` `u` join `panel_user_names` `pun` on(`u`.`account_id` = `pun`.`account_id` and `pun`.`name_update_time` = (select max(`z`.`name_update_time`) from `panel_user_names` `z` where `u`.`account_id` = `z`.`account_id`))) */;
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
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed

--
-- Dbmate schema migrations
--

LOCK TABLES `schema_migrations` WRITE;
INSERT INTO `schema_migrations` (version) VALUES
  ('0'),
  ('20260630192111');
UNLOCK TABLES;
