import clsx from 'clsx'

export function Input ({
  label,
  id,
  className,
  error,
  ...props
}) {
  return (
    <label className='block space-y-1'>
      {label && (
        <span className='text-xs font-medium text-emerald-900/80'>{label}</span>
      )}
      <input
        id={id}
        className={clsx('glass-input', error && 'border-red-400 focus:ring-red-300', className)}
        {...props}
      />
      {error ? <span className='text-xs text-red-600'>{error}</span> : null}
    </label>
  )
}
