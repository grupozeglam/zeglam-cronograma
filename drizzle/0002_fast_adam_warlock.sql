CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`keyPrefix` varchar(16) NOT NULL,
	`keyHash` varchar(128) NOT NULL,
	`scopes` varchar(500) NOT NULL DEFAULT 'read',
	`ativo` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_keys_keyHash_unique` UNIQUE(`keyHash`)
);
