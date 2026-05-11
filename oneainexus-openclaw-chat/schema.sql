-- OpenClaw Web Chat database schema

CREATE DATABASE IF NOT EXISTS `openclaw_chat`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `openclaw_chat`;

-- 1. Apps
CREATE TABLE `apps` (
  `id` VARCHAR(36) NOT NULL COMMENT 'App UUID',
  `client_id` VARCHAR(64) NOT NULL COMMENT 'Client ID',
  `client_secret` VARCHAR(128) NOT NULL COMMENT 'Client secret',
  `name` VARCHAR(100) NOT NULL COMMENT 'App name',
  `description` VARCHAR(500) DEFAULT NULL COMMENT 'App description',
  `owner_id` VARCHAR(36) NOT NULL COMMENT 'Owner ID',
  `status` ENUM('active', 'disabled') NOT NULL DEFAULT 'active' COMMENT 'App status',
  `callback_urls` JSON DEFAULT NULL COMMENT 'Callback URL allowlist',
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Soft delete flag',
  `deleted_at` DATETIME DEFAULT NULL COMMENT 'Deleted at',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created at',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated at',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_client_id` (`client_id`),
  KEY `idx_owner_id` (`owner_id`),
  KEY `idx_is_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Apps';

-- 2. SDK connections
CREATE TABLE `connections` (
  `id` VARCHAR(36) NOT NULL COMMENT 'Connection UUID',
  `app_id` VARCHAR(36) NOT NULL COMMENT 'Related app ID',
  `session_id` VARCHAR(36) NOT NULL COMMENT 'Session ID',
  `connection_type` ENUM('websocket', 'sse') NOT NULL COMMENT 'Connection type',
  `state` ENUM('connected', 'disconnected') NOT NULL DEFAULT 'connected' COMMENT 'Connection state',
  `ip_address` VARCHAR(45) DEFAULT NULL COMMENT 'Client IP',
  `connected_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Connected at',
  `disconnected_at` DATETIME DEFAULT NULL COMMENT 'Disconnected at',
  PRIMARY KEY (`id`),
  KEY `idx_app_id` (`app_id`),
  KEY `idx_session_id` (`session_id`),
  CONSTRAINT `fk_connections_app` FOREIGN KEY (`app_id`) REFERENCES `apps` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='SDK connections';

-- 3. Messages
CREATE TABLE `messages` (
  `id` VARCHAR(36) NOT NULL COMMENT 'Message UUID',
  `app_id` VARCHAR(36) NOT NULL COMMENT 'Related app ID',
  `session_id` VARCHAR(36) NOT NULL COMMENT 'Session ID',
  `role` VARCHAR(20) NOT NULL COMMENT 'Message role',
  `content` LONGTEXT NOT NULL COMMENT 'Message content',
  `parts_json` LONGTEXT DEFAULT NULL COMMENT 'Serialized message parts',
  `event_type` VARCHAR(50) DEFAULT NULL COMMENT 'Structured event type',
  `event_json` LONGTEXT DEFAULT NULL COMMENT 'Structured event payload',
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Soft delete flag',
  `deleted_at` DATETIME DEFAULT NULL COMMENT 'Deleted at',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created at',
  PRIMARY KEY (`id`),
  KEY `idx_app_id` (`app_id`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_is_deleted` (`is_deleted`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_messages_app` FOREIGN KEY (`app_id`) REFERENCES `apps` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Messages';
