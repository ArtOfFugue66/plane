import {
  integer,
  jsonb,
  uuid,
  text,
  boolean,
  pgTable,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users, workspaces } from "./base.schema";

export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey(),
  title: text("title"),
  provider: text("provider"),
  network: integer("network"),
  description: jsonb("description"),
  author: text("author"),
  webhookUrl: text("webhook_url"),
  webhookSecret: text("webhook_secret"),
  redirectUrl: text("redirect_url"),
  metadata: jsonb("metadata"),
});

export const workspaceIntegrations = pgTable("workspace_integrations", {
  id: uuid("id").primaryKey(),
  metadata: jsonb("metadata"),
  config: jsonb("config"),
  actorId: uuid("actor_id"),
  apiTokenId: uuid("api_token_id"),
  integrationId: uuid("integration_id"),
  workspaceId: uuid("workspace_id"),
});

export const apiTokens = pgTable("api_tokens", {
  id: uuid("id").primaryKey(),
  token: text("token"),
  label: text("label"),
  userType: integer("user_type"),
  createdById: uuid("created_by_id"),
  updatedById: uuid("updated_by_id"),
  userId: uuid("user_id"),
  workspaceId: uuid("workspace_id"),
  description: text("description"),
  isActive: boolean("is_active"),
});

export const workspaceIntegrationsRelations = relations(
  workspaceIntegrations,
  ({ one }) => ({
    actor: one(users, {
      fields: [workspaceIntegrations.actorId],
      references: [users.id],
    }),
    apiToken: one(apiTokens, {
      fields: [workspaceIntegrations.apiTokenId],
      references: [apiTokens.id],
    }),
    integration: one(integrations, {
      fields: [workspaceIntegrations.integrationId],
      references: [integrations.id],
    }),
    workspace: one(workspaces, {
      fields: [workspaceIntegrations.workspaceId],
      references: [workspaces.id],
    }),
  }),
);

export const apiTokensRelations = relations(apiTokens, ({ one }) => ({
  user: one(users, {
    fields: [apiTokens.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [apiTokens.workspaceId],
    references: [workspaces.id],
  }),
}));
