'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  X,
  ExternalLink,
  Save,
  User,
  Trash2,
  Pencil,
  MapPin,
  CalendarDays,
  FileText,
  Building2,
  Phone,
  Mail,
  Home,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
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
  const [showOwnerInfo, setShowOwnerInfo] = useState(false)

  useEffect(() => {
    setFormData(prospect)
    setIsEditing(false)
    setConfirmDelete(false)
  }, [prospect])

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
      maximumFractionDigits: 0,
    }).format(price)
  }

  const formatDisplayDate = (date?: string) => {
    if (!date) return 'N/A'
    const parsed = new Date(date)
    if (Number.isNaN(parsed.getTime())) return date
    return parsed.toLocaleDateString('fr-FR')
  }

  const statusConfig = useMemo(() => STATUS_CONFIG[formData.status], [formData.status])

  const inputClass =
    'w-full rounded-xl bg-[#12110F] px-3 py-2.5 text-sm text-[#F4EEE7] outline-none transition placeholder:text-[#867A70] focus:bg-[#171512] focus:ring-1 focus:ring-[#FF6A1A]/28'

  const fieldLabelClass =
    'mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#867A70]'

  const sectionClass =
    'rounded-[1.2rem] bg-[rgba(29,26,23,0.88)] p-4 shadow-[0_10px_26px_rgba(0,0,0,0.14)] backdrop-blur-xl sm:p-5'

  return (
    <div className="fixed inset-0 z-50 bg-black/72 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />

      <div className="absolute inset-0 flex items-end justify-center md:items-stretch md:justify-end">
        <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#171512] shadow-[0_30px_100px_rgba(0,0,0,0.45)] md:h-full md:max-h-none md:w-[560px] md:border-l md:border-white/0">
          <div className="sticky top-0 z-10 bg-[rgba(23,21,18,0.92)] px-4 py-4 backdrop-blur-2xl sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FF9A5C]">
                  Prospect
                </div>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#F4EEE7] sm:text-2xl">
                  Property details
                </h2>
                <div className="mt-2 flex items-start gap-2 text-sm text-[#D7CCC1]">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#867A70]" />
                  <div className="min-w-0">
                    <div className="break-words font-medium text-[#F4EEE7]">{formData.address}</div>
                    <div className="mt-0.5 text-[#9F9388]">
                      {[formData.postcode, formData.town].filter(Boolean).join(' • ') || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-[#B9AEA2] transition hover:bg-white/[0.08] hover:text-[#F4EEE7]"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div
                className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{
                  backgroundColor: `${statusConfig.dotColor}18`,
                  color: statusConfig.dotColor,
                }}
              >
                <span
                  className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: statusConfig.dotColor }}
                />
                {statusConfig.label}
              </div>

              {formData.reference && (
                <div className="rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-[#D2C6BB]">
                  Ref {formData.reference}
                </div>
              )}

              {formData.price && (
                <div className="rounded-full bg-[#FF6A1A]/12 px-3 py-1.5 text-xs font-semibold text-[#FFD0B4]">
                  {formatPrice(formData.price)}
                </div>
              )}

              {formData.link && (
                <a
                  href={formData.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-[#F4EEE7] transition hover:bg-[#FF6A1A]/10 hover:text-[#FFD0B4]"
                >
                  Listing
                  <ExternalLink size={14} />
                </a>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
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
                <>
                  <button
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#FF6A1A]/14 px-4 py-2.5 text-sm font-semibold text-[#FFD0B4] transition hover:bg-[#FF6A1A]/20"
                  >
                    <Save size={16} />
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setFormData(prospect)
                      setIsEditing(false)
                    }}
                    className="rounded-xl bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-[#B9AEA2] transition hover:bg-white/[0.08] hover:text-[#F4EEE7]"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
            <div className="space-y-4">
              <section className={sectionClass}>
                <div className="mb-4 text-sm font-semibold text-[#F4EEE7]">Core details</div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className={fieldLabelClass}>Status</label>
                    {isEditing ? (
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            status: e.target.value as ProspectionStatus,
                          })
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
                      <div
                        className="inline-flex items-center rounded-full px-3 py-2 text-sm font-semibold"
                        style={{
                          backgroundColor: `${statusConfig.dotColor}18`,
                          color: statusConfig.dotColor,
                        }}
                      >
                        <span
                          className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: statusConfig.dotColor }}
                        />
                        {statusConfig.label}
                      </div>
                    )}
                  </div>

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

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                    <div className="sm:col-span-2">
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
              </section>

              <section className={sectionClass}>
                <div className="mb-4 flex items-center gap-2">
                  <User className="h-4 w-4 text-[#FF9A5C]" />
                  <div className="text-sm font-semibold text-[#F4EEE7]">Assignment</div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={fieldLabelClass}>Added by</label>
                    {isEditing ? (
                      <select
                        value={formData.added_by || 'Henry'}
                        onChange={(e) => setFormData({ ...formData, added_by: e.target.value })}
                        className={inputClass}
                      >
                        <option value="Henry">Henry</option>
                        <option value="Millé">Millé</option>
                      </select>
                    ) : (
                      <p className="font-medium text-[#FFD0B4]">{formData.added_by || 'N/A'}</p>
                    )}
                  </div>

                  {formData.reference && (
                    <div>
                      <label className={fieldLabelClass}>Reference</label>
                      <p className="text-[#DDD2C8]">{formData.reference}</p>
                    </div>
                  )}
                </div>
              </section>

              <section className={sectionClass}>
                <div className="mb-4 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[#FF9A5C]" />
                  <div className="text-sm font-semibold text-[#F4EEE7]">Contact tracking</div>
                </div>

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
                      <p className="text-[#DDD2C8]">
                        {formatDisplayDate(formData.last_contact_date)}
                      </p>
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
                      <p className="text-[#DDD2C8]">{formatDisplayDate(formData.return_date)}</p>
                    )}
                  </div>
                </div>
              </section>

              <section className={sectionClass}>
                <div className="mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#FF9A5C]" />
                  <div className="text-sm font-semibold text-[#F4EEE7]">Notes</div>
                </div>

                {isEditing ? (
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={6}
                    className={inputClass}
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-[#DDD2C8]">
                    {formData.notes || 'No notes'}
                  </p>
                )}
              </section>

              <section className={sectionClass}>
                <button
                  type="button"
                  onClick={() => setShowOwnerInfo((prev) => !prev)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-[#FF9A5C]" />
                    <div className="text-sm font-semibold text-[#F4EEE7]">
                      Owner information
                    </div>
                  </div>
                  <div className="text-[#867A70]">
                    {showOwnerInfo ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {showOwnerInfo && (
                  <div className="mt-4 grid grid-cols-1 gap-4">
                    <div>
                      <label className={fieldLabelClass}>Owner name</label>
                      <p className="text-[#DDD2C8]">{formData.owner_name || 'N/A'}</p>
                    </div>

                    <div>
                      <label className={fieldLabelClass}>Phone</label>
                      <div className="flex items-center gap-2 text-[#DDD2C8]">
                        <Phone className="h-3.5 w-3.5 text-[#867A70]" />
                        <span>{formData.owner_phone || 'N/A'}</span>
                      </div>
                    </div>

                    <div>
                      <label className={fieldLabelClass}>Email</label>
                      <div className="flex items-center gap-2 text-[#DDD2C8]">
                        <Mail className="h-3.5 w-3.5 text-[#867A70]" />
                        <span>{formData.owner_email || 'N/A'}</span>
                      </div>
                    </div>

                    <div>
                      <label className={fieldLabelClass}>Owner address</label>
                      <p className="text-[#DDD2C8]">{formData.owner_address || 'N/A'}</p>
                    </div>
                  </div>
                )}
              </section>

              {formData.photo_url && (
                <section className={sectionClass}>
                  <div className="mb-4 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#FF9A5C]" />
                    <div className="text-sm font-semibold text-[#F4EEE7]">Listing image</div>
                  </div>

                  <div className="overflow-hidden rounded-2xl bg-black/10">
                    <img
                      src={formData.photo_url}
                      alt="Property"
                      className="h-52 w-full object-cover"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}