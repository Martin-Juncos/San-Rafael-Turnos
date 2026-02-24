import { AuditLog } from '../db/models/index.js'

export const writeAuditLog = async ({
  actorRole,
  actorId,
  action,
  entity,
  entityId,
  meta = {},
  transaction
}) => {
  await AuditLog.create(
    {
      actorRole,
      actorId: actorId ?? null,
      action,
      entity,
      entityId: entityId ?? null,
      meta
    },
    { transaction }
  )
}
