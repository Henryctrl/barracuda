'use client'

import React from 'react'
import { X } from 'lucide-react'

interface PopupProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export default function Popup({ isOpen, onClose, title, children }: PopupProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#171512] text-stone-100 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 sm:px-8">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-stone-100">{title}</h3>
            <p className="mt-1 text-sm text-stone-500">
              Review and update workspace information.
            </p>
          </div>

          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-stone-300 transition-colors duration-200 hover:bg-white/[0.08] hover:text-stone-100"
            aria-label="Close popup"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6 sm:px-8 sm:py-8">{children}</div>
      </div>
    </div>
  )
}