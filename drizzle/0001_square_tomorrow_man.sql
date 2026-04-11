CREATE TABLE `admin_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`username` varchar(100) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `auto_close_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`linkId` int NOT NULL,
	`linkNome` varchar(500) NOT NULL,
	`closedAt` timestamp NOT NULL DEFAULT (now()),
	`scheduledCloseTime` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auto_close_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `column_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`encerramentoLink` boolean NOT NULL DEFAULT true,
	`conferenciaEstoque` boolean NOT NULL DEFAULT true,
	`romaneiosClientes` boolean NOT NULL DEFAULT true,
	`postadoFornecedor` boolean NOT NULL DEFAULT true,
	`dataInicioSeparacao` boolean NOT NULL DEFAULT true,
	`liberadoEnvio` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `column_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `link_departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `link_departments_id` PRIMARY KEY(`id`),
	CONSTRAINT `link_departments_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `link_statuses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(30) NOT NULL DEFAULT '#b8a060',
	`bgColor` varchar(30) NOT NULL DEFAULT 'rgba(184,160,96,0.15)',
	`sortOrder` int NOT NULL DEFAULT 0,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `link_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `link_statuses_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numero` int NOT NULL,
	`nome` varchar(500) NOT NULL,
	`status` varchar(100) NOT NULL DEFAULT 'Link Aberto',
	`departamento` varchar(200) NOT NULL DEFAULT '',
	`observacoes` text,
	`encerramentoLink` varchar(50),
	`encerramentoHorario` varchar(10) DEFAULT '00:00',
	`conferenciaEstoque` varchar(100),
	`romaneiosClientes` varchar(100),
	`postadoFornecedor` varchar(100),
	`dataInicioSeparacao` varchar(100),
	`prazoMaxFinalizar` varchar(100),
	`liberadoEnvio` varchar(100),
	`seeded` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shipments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierId` int NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`galvanica` varchar(255) DEFAULT '',
	`galvanicaEnvio` varchar(255),
	`supplier` enum('sp','limeira') NOT NULL,
	`proofImageUrl` text NOT NULL,
	`status` enum('Pendente','Processado','Enviado') NOT NULL DEFAULT 'Pendente',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shipments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shipments_archived` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierId` int NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`galvanica` varchar(255) DEFAULT '',
	`galvanicaEnvio` varchar(255),
	`supplier` enum('sp','limeira') NOT NULL,
	`proofImageUrl` text NOT NULL,
	`status` enum('Pendente','Processado','Enviado') NOT NULL DEFAULT 'Pendente',
	`notes` text,
	`createdAt` timestamp NOT NULL,
	`updatedAt` timestamp NOT NULL,
	`archivedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shipments_archived_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`username` varchar(100) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`email` varchar(320),
	`panel` enum('sp','limeira') NOT NULL DEFAULT 'sp',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`),
	CONSTRAINT `suppliers_name_unique` UNIQUE(`name`),
	CONSTRAINT `suppliers_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
ALTER TABLE `auto_close_history` ADD CONSTRAINT `auto_close_history_linkId_links_id_fk` FOREIGN KEY (`linkId`) REFERENCES `links`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;