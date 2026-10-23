import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  files: defineTable({
    key: v.string(),
    orgId: v.string(),
    storageId: v.optional(v.id("_storage")),
  })
    .index("by_key", ["key"])
    .index("by_storageId", ["storageId"]),
  todos: defineTable({
    text: v.string(),
    userId: v.string(),
    orgId: v.string(),
  }).index("by_orgId", ["orgId"]),
});
