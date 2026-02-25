import clsx from 'clsx'

export function Card ({ className, children, ...props }) {
  return (
    <article className={clsx('glass-card p-5', className)} {...props}>
      {children}
    </article>
  )
}
