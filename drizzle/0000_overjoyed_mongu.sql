CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`request` text,
	`kind` text NOT NULL,
	`mime` text NOT NULL,
	FOREIGN KEY (`owner`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`request`) REFERENCES `requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `providers` (
	`id` text PRIMARY KEY NOT NULL,
	`trade` text NOT NULL,
	`experience` text NOT NULL,
	`zone` text NOT NULL,
	`description` text NOT NULL,
	`photo` text NOT NULL,
	`document` text NOT NULL,
	`status` text DEFAULT 'Pendiente' NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`request` text NOT NULL,
	`provider` text NOT NULL,
	`price` real NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'Pendiente' NOT NULL,
	FOREIGN KEY (`request`) REFERENCES `requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`provider`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`trade` text NOT NULL,
	`description` text NOT NULL,
	`date` text NOT NULL,
	`status` text DEFAULT 'Activa' NOT NULL,
	`provider` text,
	`quote` text,
	`created` text NOT NULL,
	FOREIGN KEY (`owner`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`provider`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`request` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`owner` text NOT NULL,
	`stars` integer,
	`comment` text,
	FOREIGN KEY (`request`) REFERENCES `requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`provider`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`hash` text NOT NULL,
	`salt` text NOT NULL,
	`role` text DEFAULT 'cliente' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);