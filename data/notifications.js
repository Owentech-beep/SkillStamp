import { randomUUID } from "node:crypto";

const notifications = [];

export function notify(userId, message) {
  const notification = {
    id: randomUUID(),
    userId,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  };

  notifications.push(notification);
  return notification;
}

export function getNotifications(userId) {
  return notifications
    .filter((item) => item.userId === userId)
    .slice()
    .reverse();
}

export function markNotificationRead(userId, notificationId) {
  const notification = notifications.find(
    (item) => item.userId === userId && item.id === notificationId
  );

  if (!notification) return null;

  notification.read = true;
  return notification;
}