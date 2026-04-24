import express from "express";
import { Notification, ActivityLog } from "../models/index.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /notifications
 * Get all notifications for the authenticated user
 * Query params:
 * - unread_only (boolean): Only return unread notifications
 * - limit (number): Number of notifications to return (default: 50)
 * - offset (number): Pagination offset (default: 0)
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const { unread_only, limit = 50, offset = 0 } = req.query;
    
    const query = { user_id: req.authUser.id };
    if (unread_only === "true") {
      query.is_read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ user_id: req.authUser.id, is_read: false });

    return res.json({
      notifications,
      total,
      unreadCount,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to fetch notifications" });
  }
});

/**
 * GET /notifications/unread-count
 * Get only the count of unread notifications
 */
router.get("/unread-count", requireAuth, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ 
      user_id: req.authUser.id, 
      is_read: false 
    });

    return res.json({ unreadCount });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to get unread count" });
  }
});

/**
 * PATCH /notifications/:notification_id
 * Mark a notification as read or unread
 * Body: { is_read: boolean }
 */
router.patch("/:notification_id", requireAuth, async (req, res) => {
  try {
    const { notification_id } = req.params;
    const { is_read } = req.body;

    const notification = await Notification.findById(notification_id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // Verify ownership
    if (!notification.user_id.equals(req.authUser.id)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    notification.is_read = is_read === true;
    await notification.save();

    return res.json({ success: true, notification });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to update notification" });
  }
});

/**
 * PATCH /notifications
 * Mark multiple notifications as read
 * Body: { notification_ids: [id1, id2], is_read: boolean }
 */
router.patch("/", requireAuth, async (req, res) => {
  try {
    const { notification_ids = [], is_read } = req.body;

    if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
      return res.status(400).json({ error: "Invalid notification_ids" });
    }

    const result = await Notification.updateMany(
      { _id: { $in: notification_ids }, user_id: req.authUser.id },
      { $set: { is_read: is_read === true } }
    );

    return res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to update notifications" });
  }
});

/**
 * DELETE /notifications/:notification_id
 * Delete a notification
 */
router.delete("/:notification_id", requireAuth, async (req, res) => {
  try {
    const { notification_id } = req.params;

    const notification = await Notification.findById(notification_id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // Verify ownership
    if (!notification.user_id.equals(req.authUser.id)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await Notification.deleteOne({ _id: notification_id });

    await ActivityLog.create({
      user_id: req.authUser.id,
      action: "notification_deleted",
      entity_type: "notification",
      entity_id: notification_id,
      description: `Deleted notification: ${notification.title}`,
    });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to delete notification" });
  }
});

/**
 * DELETE /notifications
 * Delete all notifications for the user (or all read notifications if filter is set)
 * Query params:
 * - read_only (boolean): Only delete read notifications
 */
router.delete("/", requireAuth, async (req, res) => {
  try {
    const { read_only } = req.query;

    const query = { user_id: req.authUser.id };
    if (read_only === "true") {
      query.is_read = true;
    }

    const result = await Notification.deleteMany(query);

    await ActivityLog.create({
      user_id: req.authUser.id,
      action: "notifications_bulk_deleted",
      entity_type: "notification",
      description: `Bulk deleted ${result.deletedCount} notifications`,
    });

    return res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to delete notifications" });
  }
});

export default router;
