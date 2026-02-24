import { DataTypes, Model } from 'sequelize'

export class AuditLog extends Model {}

export const initAuditLogModel = (sequelize) => {
  AuditLog.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      actorRole: {
        type: DataTypes.STRING,
        allowNull: false
      },
      actorId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false
      },
      entity: {
        type: DataTypes.STRING,
        allowNull: false
      },
      entityId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      meta: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {}
      }
    },
    {
      sequelize,
      modelName: 'AuditLog',
      tableName: 'AuditLog',
      updatedAt: false
    }
  )

  return AuditLog
}
