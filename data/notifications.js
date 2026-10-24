import { randomUUID } from 'node:crypto';
export function notification(userId, message) {
  return { id: randomUUID(), userId, message, read: false, createdAt: new Date().toISOString() };
}
export function writeNotification(tx, db, userId, message) {
  const item = notification(userId, message);
  tx.create(db.collection('notifications').doc(item.id), item);
}
