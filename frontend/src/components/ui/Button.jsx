import clsx from 'clsx'

export function Button ({
  children,
  variant = 'primary',
  className,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={clsx(
        'glass-button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
        variant === 'primary' &&
          'bg-brand-600 text-white hover:scale-[1.02] hover:bg-brand-700',
        variant === 'secondary' &&
          'border border-brand-200 bg-white/70 text-brand-800 hover:bg-brand-100',
        variant === 'danger' &&
          'bg-red-600 text-white hover:bg-red-700',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
