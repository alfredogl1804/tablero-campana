CREATE TABLE `board_incidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nodeId` varchar(128) NOT NULL,
	`snapshotId` int,
	`reporter` varchar(128) NOT NULL DEFAULT 'system',
	`kind` enum('BUG','IDEA','RIESGO','OBSERVACION') NOT NULL,
	`severity` enum('low','med','high') NOT NULL DEFAULT 'med',
	`message` text NOT NULL,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `board_incidents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `board_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nodeId` varchar(128) NOT NULL,
	`statusOverride` enum('ACTIVE','DEGRADED','SPRINT','FUTURE') NOT NULL,
	`note` text,
	`reporter` varchar(128) NOT NULL DEFAULT 'system',
	`expiresAt` timestamp,
	`clearedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `board_overrides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `board_incidents` ADD CONSTRAINT `board_incidents_snapshotId_board_snapshots_id_fk` FOREIGN KEY (`snapshotId`) REFERENCES `board_snapshots`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `board_incidents_nodeId_idx` ON `board_incidents` (`nodeId`);--> statement-breakpoint
CREATE INDEX `board_incidents_createdAt_idx` ON `board_incidents` (`createdAt`);--> statement-breakpoint
CREATE INDEX `board_incidents_kind_idx` ON `board_incidents` (`kind`);--> statement-breakpoint
CREATE INDEX `board_overrides_nodeId_idx` ON `board_overrides` (`nodeId`);--> statement-breakpoint
CREATE INDEX `board_overrides_createdAt_idx` ON `board_overrides` (`createdAt`);