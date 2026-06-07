'use client'

import { useState } from 'react'
import { X, ExternalLink, Save, User, Trash2, Pencil } from 'lucide-react'
import { PropertyProspect, ProspectionStatus, STATUS_CONFIG } from '../types'

interface ProspectDetailModalProps {
  prospect: PropertyProspect
  onClose: () => void
  onUpdate: (id: string, updates: Partial<PropertyProspect>) => void
  onDelete?: (id: string) => void
}

export default function ProspectDetailModal({
  prospect,
  onClose,
  onUpdate,
  onDelete,
}: ProspectDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<PropertyProspect>(prospect)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSave = () => {
    onUpdate(prospect.id, formData)
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (!onDelete) return
    onDelete(prospect.id)
    onClose()
  }

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A'
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price)
  }

  const fieldLabelClass =
    'mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#867A70]'

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-[#12110F] px-3 py-2.5 text-sm text-[#F4EEE7] outline-none transition placeholder:text-[#867A70] focus:border-[#FF6A1A]/40 focus:bg-[#171512]'

  const sectionClass = 'rounded-2xl bg-[#1D1A17] p-4 sm:p-5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-[#171512] shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[rgba(23,21,18,0.88)] px-4 py-4 backdrop-blur-2xl sm:px-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FF9A5C]">
              Prospect
            </div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#F4EEE7] sm:text-2xl">
              Property details
            </h2>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(true)
                    setConfirmDelete(false)
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-[#F4EEE7] transition hover:bg-[#FF6A1A]/10 hover:text-[#FFD0B4]"
                >
                  <Pencil size={16} />
                  Edit
                </button>

                {onDelete && !confirmDelete && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-500/12 px-4 py-2.5 text-sm font-medium text-red-100 transition hover:bg-red-500/18"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                )}

                {onDelete && confirmDelete && (
                  <>
                    <button
                      onClick={handleDelete}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-500/18 px-4 py-2.5 text-sm font-semibold text-red-100 transition hover:bg-red-500/24"
                    >
                      <Trash2 size={16} />
                      Confirm delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-xl bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-[#B9AEA2] transition hover:bg-white/[0.08] hover:text-[#F4EEE7]"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </>
            ) : (
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-xl bg-[#FF6A1A]/14 px-4 py-2.5 text-sm font-semibold text-[#FFD0B4] transition hover:bg-[#FF6A1A]/20"
              >
                <Save size={16} />
                Save
              </button>
            )}

            <button
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-[#B9AEA2] transition hover:bg-white/[0.08] hover:text-[#F4EEE7]"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          <div className="space-y-5">
            {formData.photo_url && (
              <div className="overflow-hidden rounded-3xl bg-[#1D1A17]">
                <img
                  src={formData.photo_url}
                  alt="Property"
                  className="h-64 w-full object-cover sm:h-80"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>
            )}

            <div className="flex flex-col gap-4 rounded-2xl bg-[#1D1A17] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex items-center gap-3">
                <div
                  className="h-5 w-5 rounded-full border border-white/80"
                  style={{
                    backgroundColor: STATUS_CONFIG[formData.status].dotColor,
                    boxShadow: `0 0 10px ${STATUS_CONFIG[formData.status].dotColor}`,
                  }}
                />
                {isEditing ? (
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as ProspectionStatus })
                    }
                    className={inputClass}
                  >
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-lg font-semibold text-[#F4EEE7]">
                    {STATUS_CONFIG[formData.status].label}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <User size={16} className="text-[#FF9A5C]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#867A70]">
                  Added by
                </span>
                {isEditing ? (
                  <select
                    value={formData.added_by || 'Henry'}
                    onChange={(e) => setFormData({ ...formData, added_by: e.target.value })}
                    className="rounded-xl border border-white/10 bg-[#12110F] px-3 py-2 text-sm font-medium text-[#F4EEE7] outline-none transition focus:border-[#FF6A1A]/40"
                  >
                    <option value="Henry">Henry</option>
                    <option value="Millé">Millé</option>
                  </select>
                ) : (
                  <span className="font-medium text-[#FFD0B4]">{formData.added_by || 'N/A'}</span>
                )}
              </div>
            </div>

            <div className={sectionClass}>
              <div className="mb-4 text-sm font-semibold text-[#F4EEE7]">Property</div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={fieldLabelClass}>Address</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className={inputClass}
                    />
                  ) : (
                    <p className="font-medium text-[#F4EEE7]">{formData.address}</p>
                  )}
                </div>

                <div>
                  <label className={fieldLabelClass}>Town</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.town || ''}
                      onChange={(e) => setFormData({ ...formData, town: e.target.value })}
                      className={inputClass}
                    />
                  ) : (
                    <p className="text-[#DDD2C8]">{formData.town || 'N/A'}</p>
                  )}
                </div>

                <div>
                  <label className={fieldLabelClass}>Postcode</label>
                  <p className="text-[#DDD2C8]">{formData.postcode || 'N/A'}</p>
                </div>

                <div>
                  <label className={fieldLabelClass}>Price</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={formData.price || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      className={inputClass}
                    />
                  ) : (
                    <p className="text-lg font-semibold text-[#FFD0B4]">
                      {formatPrice(formData.price)}
                    </p>
                  )}
                </div>

                <div>
                  <label className={fieldLabelClass}>Property type</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.property_type || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, property_type: e.target.value })
                      }
                      className={inputClass}
                    />
                  ) : (
                    <p className="text-[#DDD2C8]">{formData.property_type || 'N/A'}</p>
                  )}
                </div>

                <div>
                  <label className={fieldLabelClass}>Current agent</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.current_agent || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, current_agent: e.target.value })
                      }
                      className={inputClass}
                    />
                  ) : (
                    <p className="text-[#DDD2C8]">{formData.current_agent || 'N/A'}</p>
                  )}
                </div>
              </div>
            </div>

            <div className={sectionClass}>
              <div className="mb-4 text-sm font-semibold text-[#F4EEE7]">Owner information</div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={fieldLabelClass}>Owner name</label>
                  <p className="text-[#DDD2C8]">{formData.owner_name || 'N/A'}</p>
                </div>
                <div>
                  <label className={fieldLabelClass}>Phone</label>
                  <p className="text-[#DDD2C8]">{formData.owner_phone || 'N/A'}</p>
                </div>
                <div>
                  <label className={fieldLabelClass}>Email</label>
                  <p className="text-[#DDD2C8]">{formData.owner_email || 'N/A'}</p>
                </div>
                <div>
                  <label className={fieldLabelClass}>Address</label>
                  <p className="text-[#DDD2C8]">{formData.owner_address || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className={sectionClass}>
              <div className="mb-4 text-sm font-semibold text-[#F4EEE7]">Contact tracking</div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={fieldLabelClass}>Last contact</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={formData.last_contact_date || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, last_contact_date: e.target.value })
                      }
                      className={inputClass}
                    />
                  ) : (
                    <p className="text-[#DDD2C8]">{formData.last_contact_date || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className={fieldLabelClass}>Return date</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={formData.return_date || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, return_date: e.target.value })
                      }
                      className={inputClass}
                    />
                  ) : (
                    <p className="text-[#DDD2C8]">{formData.return_date || 'N/A'}</p>
                  )}
                </div>
              </div>
            </div>

            <div className={sectionClass}>
              <label className={fieldLabelClass}>Notes</label>
              {isEditing ? (
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={5}
                  className={inputClass}
                />
              ) : (
                <p className="whitespace-pre-wrap text-[#DDD2C8]">{formData.notes || 'No notes'}</p>
              )}
            </div>

            {formData.link && (
              <div>
                <a
                  href={formData.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#FF6A1A]/14 px-4 py-2.5 text-sm font-semibold text-[#FFD0B4] transition hover:bg-[#FF6A1A]/20"
                >
                  View property listing
                  <ExternalLink size={16} />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}