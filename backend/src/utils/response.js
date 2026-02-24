export const ok = (res, data, message = 'ok', statusCode = 200) => {
  res.status(statusCode).json({
    ok: true,
    message,
    data
  })
}

export const paginated = (res, data, pagination, message = 'ok') => {
  res.status(200).json({
    ok: true,
    message,
    data,
    pagination
  })
}
