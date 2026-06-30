-- migrate:up
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
);
CREATE TABLE `dash_discussion_responses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `discussion_id` int(11) NOT NULL,
  `steamid` varchar(32) NOT NULL,
  `choice` int(11) DEFAULT NULL,
  `text` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `dash_discussion_responses_dash_discussions_id_fk` (`discussion_id`),
  CONSTRAINT `dash_discussion_responses_dash_discussions_id_fk` FOREIGN KEY (`discussion_id`) REFERENCES `dash_discussions` (`id`)
);
CREATE TABLE `dash_discussion_options` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `discussion_id` int(11) NOT NULL,
  `label` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `dash_discussion_options_dash_discussions_id_fk` (`discussion_id`),
  CONSTRAINT `dash_discussion_options_dash_discussions_id_fk` FOREIGN KEY (`discussion_id`) REFERENCES `dash_discussions` (`id`) ON DELETE CASCADE
);
CREATE TABLE `dash_discussion_comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `discussion_id` int(11) NOT NULL,
  `creator` varchar(32) DEFAULT NULL COMMENT 'anonymous if null',
  `content` text NOT NULL,
  `timestamp` int(11) NOT NULL DEFAULT unix_timestamp(),
  PRIMARY KEY (`id`),
  KEY `dash_discussion_comments_dash_discussions_id_fk` (`discussion_id`),
  CONSTRAINT `dash_discussion_comments_dash_discussions_id_fk` FOREIGN KEY (`discussion_id`) REFERENCES `dash_discussions` (`id`) ON DELETE CASCADE
);
create table dash_permissions
(
    admin_id int unsigned not null,
    code     varchar(64)  not null,
    primary key (admin_id, code),
    constraint dash_permissions_sm_admins_id_fk
        foreign key (admin_id) references sm_admins (id)
);
create table dash_providers
(
    steamid               varchar(32)          not null,
    provider              varchar(32)          not null,
    provider_id           varchar(128)         not null,
    refresh_token         varchar(255)         null,
    refresh_token_expired tinyint(1) default 0 not null,
    access_token          varchar(32)          null,
    access_token_expires  int                  null comment 'timestamp',
    username              varchar(128)         null,
    avatar_url            tinytext             null,
    primary key (steamid, provider),
    constraint index_name
        unique (provider_id)
);
create table panel_user_data
(
    steamid     varchar(32) not null
        primary key,
    birth_date  tinyint     null,
    birth_month tinyint     null
);
-- migrate:down

