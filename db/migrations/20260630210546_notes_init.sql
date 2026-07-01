-- migrate:up
CREATE TABLE `notes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `createdAt` int(10) unsigned DEFAULT unix_timestamp(),
  `steamid` varchar(32) NOT NULL,
  `markedBy` varchar(32) DEFAULT NULL,
  `content` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
);
-- migrate:down

