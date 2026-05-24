CREATE TABLE `board_nodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`snapshotId` int NOT NULL,
	`nodeId` varchar(128) NOT NULL,
	`district` varchar(64) NOT NULL,
	`label` text NOT NULL,
	`status` varchar(32) NOT NULL,
	`loc` int NOT NULL DEFAULT 0,
	`lastUpdated` varchar(32),
	`raw` json NOT NULL,
	CONSTRAINT `board_nodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `board_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	`sourceCommit` varchar(64),
	`sourceMode` varchar(64) NOT NULL,
	`totalNodes` int NOT NULL,
	`systemHealth` int NOT NULL,
	`payload` json NOT NULL,
	CONSTRAINT `board_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `board_nodes` ADD CONSTRAINT `board_nodes_snapshotId_board_snapshots_id_fk` FOREIGN KEY (`snapshotId`) REFERENCES `board_snapshots`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `board_nodes_snapshotId_idx` ON `board_nodes` (`snapshotId`);--> statement-breakpoint
CREATE INDEX `board_nodes_nodeId_idx` ON `board_nodes` (`nodeId`);--> statement-breakpoint
CREATE INDEX `board_nodes_status_idx` ON `board_nodes` (`status`);--> statement-breakpoint
CREATE INDEX `board_snapshots_capturedAt_idx` ON `board_snapshots` (`capturedAt`);