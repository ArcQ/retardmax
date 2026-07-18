ALTER TABLE `payments` ADD `credits_purchased` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `payments` ADD `stripe_subscription_id` text;
--> statement-breakpoint
CREATE TABLE `subscriptions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `stripe_subscription_id` text NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `last_credited_on` text NOT NULL,
  `credits_issued_this_period` integer DEFAULT 1 NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_user_id_unique` ON `subscriptions` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_stripe_subscription_id_unique` ON `subscriptions` (`stripe_subscription_id`);
