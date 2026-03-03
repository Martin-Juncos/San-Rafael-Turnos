import { AppError, isAppError } from './errors.js'

const PG_ERROR_MAPPERS = {
  23505: (error) => new AppError(
    'Conflicto de datos: ya existe un registro con esos valores.',
    409,
    'db_unique_violation',
    {
      constraint: error?.parent?.constraint || error?.original?.constraint || null
    }
  ),
  23503: (error) => new AppError(
    'Referencia invalida: el recurso relacionado no existe.',
    409,
    'db_foreign_key_violation',
    {
      constraint: error?.parent?.constraint || error?.original?.constraint || null
    }
  ),
  23502: (error) => new AppError(
    'Faltan campos obligatorios para procesar la solicitud.',
    400,
    'db_not_null_violation',
    {
      column: error?.parent?.column || error?.original?.column || null
    }
  ),
  '22P02': () => new AppError(
    'Formato de dato invalido para la operacion solicitada.',
    400,
    'db_invalid_text_representation'
  )
}

const mapValidationError = (error) => {
  const details = Array.isArray(error?.errors)
    ? error.errors.map((item) => ({
      path: item.path || null,
      message: item.message
    }))
    : undefined

  return new AppError(
    'Datos invalidos para persistencia.',
    400,
    'db_validation_error',
    details
  )
}

const mapUniqueConstraintError = (error) => {
  const details = Array.isArray(error?.errors)
    ? error.errors.map((item) => ({
      path: item.path || null,
      value: item.value ?? null,
      message: item.message
    }))
    : undefined

  return new AppError(
    'Conflicto de datos: ya existe un registro con esos valores.',
    409,
    'db_unique_violation',
    details
  )
}

const mapForeignKeyError = (error) => {
  return new AppError(
    'Referencia invalida: el recurso relacionado no existe.',
    409,
    'db_foreign_key_violation',
    {
      table: error?.table || error?.parent?.table || null,
      constraint: error?.index || error?.parent?.constraint || null
    }
  )
}

export const mapSequelizeError = (error) => {
  if (!error) return null
  if (isAppError(error)) return error

  if (error.name === 'SequelizeValidationError') {
    return mapValidationError(error)
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    return mapUniqueConstraintError(error)
  }

  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return mapForeignKeyError(error)
  }

  const pgCode = error?.parent?.code || error?.original?.code
  if (pgCode && PG_ERROR_MAPPERS[pgCode]) {
    return PG_ERROR_MAPPERS[pgCode](error)
  }

  return null
}
