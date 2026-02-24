import clsx from 'clsx'

export function Card ({ className, children }) {
  return <article className={clsx('glass-card p-5', className)}>{children}</article>
}
