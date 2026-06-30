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
create table sm_group_permissions
(
    group_id int unsigned not null,
    code     varchar(64)  not null,
    primary key (group_id, code),
    constraint sm_group_permissions_sm_groups_id_fk
        foreign key (group_id) references sm_groups (id)
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

CREATE TABLE `panel_user` (
  `account_id` varchar(16) NOT NULL,
  `create_time` int(11) NOT NULL DEFAULT unix_timestamp(),
  `last_join_time` int(11) DEFAULT NULL,
  `last_ip` varchar(64) DEFAULT NULL,
  `last_country` varchar(255) DEFAULT NULL,
  `last_region` varchar(255) DEFAULT NULL,
  `avatar_hash` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`account_id`)
);
CREATE TABLE `panel_user_names` (
  `account_id` varchar(16) NOT NULL,
  `name` varchar(64) NOT NULL,
  `name_update_time` int(11) NOT NULL DEFAULT unix_timestamp(),
  PRIMARY KEY (`account_id`, `name_update_time`),
  CONSTRAINT `panel_user_names_panel_user_account_id_fk` FOREIGN KEY (`account_id`) REFERENCES `panel_user` (`account_id`) ON DELETE CASCADE
);
CREATE VIEW `view_panel_user` AS
select
  `u`.`account_id` AS `account_id`,
  `u`.`create_time` AS `create_time`,
  `u`.`avatar_hash` AS `avatar_hash`,
  `u`.`last_ip` AS `last_ip`,
  `u`.`last_join_time` AS `last_join_time`,
  `u`.`last_country` AS `last_country`,
  `u`.`last_region` AS `last_region`,
  `pun`.`name_update_time` AS `last_name_update_time`,
  `pun`.`name` AS `last_name`
from
  (
    `panel_user` `u`
    join `panel_user_names` `pun` on (
      `u`.`account_id` = `pun`.`account_id`
      and `pun`.`name_update_time` = (
        select
          max(`z`.`name_update_time`)
        from
          `panel_user_names` `z`
        where
          `u`.`account_id` = `z`.`account_id`
      )
    )
  );
CREATE TABLE `panel_user_notifications` (
  `steamid` varchar(32) NOT NULL,
  `timestamp` int(11) NOT NULL DEFAULT unix_timestamp(),
  `message` varchar(255) NOT NULL,
  `link` varchar(255) DEFAULT NULL,
  `subject_steamid` varchar(32) DEFAULT NULL,
  `level` tinyint(4) NOT NULL DEFAULT 0,
  PRIMARY KEY (`steamid`, `timestamp`),
  CONSTRAINT `user_notifications_sm_admins_identity_fk` FOREIGN KEY (`steamid`) REFERENCES `sm_admins` (`identity`) ON DELETE CASCADE
)
CREATE TABLE `panel_apikeys` (
  `id` varchar(64) NOT NULL DEFAULT uuid(),
  `steamid` varchar(32) NOT NULL,
  `perms` smallint(6) NOT NULL,
  `created` bigint(20) DEFAULT unix_timestamp(),
  `lastUsed` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
);
-- migrate:down

