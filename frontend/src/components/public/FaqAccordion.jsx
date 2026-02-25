import { useState } from 'react'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'

export function FaqAccordion ({ items = [], className }) {
  const [openId, setOpenId] = useState('')

  const toggle = (id) => {
    setOpenId((currentId) => (currentId === id ? '' : id))
  }

  return (
    <div className={clsx('space-y-3', className)}>
      {items.map((item) => {
        const isOpen = openId === item.id

        return (
          <article
            key={item.id}
            className='rounded-xl border border-emerald-200 bg-white/70 px-4 py-3'
          >
            <button
              type='button'
              onClick={() => toggle(item.id)}
              className='flex w-full items-center justify-between gap-3 text-left'
            >
              <span className='text-sm font-semibold text-emerald-950'>
                {item.question}
              </span>
              <ChevronDown
                className={clsx(
                  'h-4 w-4 shrink-0 text-brand-700 transition-transform duration-200',
                  isOpen && 'rotate-180'
                )}
              />
            </button>

            {isOpen
              ? (
                <p className='mt-3 text-sm leading-relaxed text-emerald-900/85'>
                  {item.answer}
                </p>
                )
              : null}
          </article>
        )
      })}
    </div>
  )
}
