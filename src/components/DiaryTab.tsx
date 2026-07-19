'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { 
  BookOpen, 
  Plus, 
  Search, 
  Calendar, 
  ChevronRight, 
  Trash2, 
  Edit3, 
  Smile, 
  Meh, 
  Frown, 
  Angry, 
  Laugh,
  X,
  FileText
} from 'lucide-react'
import {
  showSuccess,
  showError,
  showDeleteConfirm,
} from '../lib/swalConfig'

interface DiaryEntry {
  id: string
  user_id: string
  title: string
  content: string
  mood: string | null
  created_at: string
  updated_at: string
}

interface DiaryTabProps {
  userId: string
}

const MOOD_ITEMS = [
  { key: 'happy', emoji: '😄', label: 'สุขมาก', icon: Laugh, color: 'text-amber-500 bg-amber-500/10' },
  { key: 'good', emoji: '🙂', label: 'ดี', icon: Smile, color: 'text-emerald-500 bg-emerald-500/10' },
  { key: 'normal', emoji: '😐', label: 'ปกติ', icon: Meh, color: 'text-sky-500 bg-sky-500/10' },
  { key: 'sad', emoji: '😔', label: 'เศร้า', icon: Frown, color: 'text-violet-500 bg-violet-500/10' },
  { key: 'angry', emoji: '😤', label: 'หงุดหงิด', icon: Angry, color: 'text-rose-500 bg-rose-500/10' },
]

export default function DiaryTab({ userId }: DiaryTabProps) {
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null)
  const [viewingEntry, setViewingEntry] = useState<DiaryEntry | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchEntries()
  }, [userId])

  useEffect(() => {
    if (showForm && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [content, showForm])

  const fetchEntries = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setEntries(data || [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error fetching diary entries:', message)
    } finally {
      setLoading(false)
    }
  }

  const openNewForm = () => {
    setEditingEntry(null)
    setTitle('')
    setContent('')
    setSelectedMood(null)
    setShowForm(true)
  }

  const openEditForm = (entry: DiaryEntry) => {
    setViewingEntry(null)
    setEditingEntry(entry)
    setTitle(entry.title)
    setContent(entry.content)
    setSelectedMood(entry.mood)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingEntry(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() && !content.trim()) return
    setSaving(true)

    try {
      if (editingEntry) {
        const { error } = await supabase
          .from('diary_entries')
          .update({
            title: title.trim(),
            content: content.trim(),
            mood: selectedMood,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingEntry.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('diary_entries')
          .insert({
            user_id: userId,
            title: title.trim() || 'บันทึกใหม่',
            content: content.trim(),
            mood: selectedMood,
            updated_at: new Date().toISOString(),
          })
        if (error) throw error
      }

      showSuccess('บันทึกสำเร็จ', 'เก็บความทรงจำของคุณเรียบร้อยแล้ว 📑')
      await fetchEntries()
      closeForm()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      showError('เกิดข้อผิดพลาด', 'บันทึกไม่สำเร็จ: ' + message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const result = await showDeleteConfirm(
      'ลบบันทึกนี้?',
      'คุณต้องการลบความทรงจำนี้ออกจากระบบใช่หรือไม่'
    )

    if (!result.isConfirmed) return

    try {
      const { error } = await supabase
        .from('diary_entries')
        .delete()
        .eq('id', id)
      if (error) throw error
      
      setEntries(prev => prev.filter(e => e.id !== id))
      setViewingEntry(null)

      showSuccess('ลบออกแล้ว')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      showError('เกิดข้อผิดพลาด', 'ลบไม่สำเร็จ: ' + message)
    }
  }

  const filteredEntries = entries.filter(e =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    })

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    })

  const renderMoodIcon = (moodValue: string | null, className = "h-4 w-4") => {
    if (!moodValue) return null
    const target = MOOD_ITEMS.find(m => m.emoji === moodValue || m.key === moodValue)
    if (!target) return null
    const IconComponent = target.icon
    return <IconComponent className={`${className} ${target.color.split(' ')[0]}`} />
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)] space-y-5 pb-28 lg:pb-8 text-slate-800 dark:text-slate-200 antialiased">
      
      {/* ── Tab Header ── */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-neutral-900 dark:bg-neutral-800 p-2 text-yellow-400">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">บันทึกส่วนตัว</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {entries.length} บันทึก · ความทรงจำและเรื่องราว
            </p>
          </div>
        </div>
        
        <button
          onClick={openNewForm}
          className="inline-flex items-center gap-1 rounded-xl bg-slate-900 dark:bg-white px-3.5 py-2 text-xs font-bold text-white dark:text-slate-900 shadow-md transition-all hover:bg-slate-700 dark:hover:bg-slate-200 active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          บันทึกใหม่
        </button>
      </div>

      {/* ── Search Bar ── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="ค้นหาบันทึก..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 placeholder:text-slate-400 dark:placeholder-slate-600"
        />
      </div>

      {/* ── Notes Container (Grid layout for responsive) ── */}
      <div className="flex flex-col">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 w-full animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/50" />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20">
            <FileText className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2.5" />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {searchQuery ? 'ไม่พบโน้ตที่เกี่ยวข้องกับการค้นหา' : 'ไม่มีบันทึกประจำวัน'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => setViewingEntry(entry)}
                className="group flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm hover:border-slate-300 dark:hover:border-slate-700/60 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex-1 min-w-0 pr-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    {entry.mood && (
                      <div className="shrink-0">
                        {renderMoodIcon(entry.mood, "h-4 w-4")}
                      </div>
                    )}
                    <h3 className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {entry.title || 'ไม่มีชื่อหัวข้อ'}
                    </h3>
                  </div>
                  
                  {/* Preview แบบ iPhone Notes: วันที่ + เนื้อหาย่อ */}
                  <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                    <span className="shrink-0 font-medium text-slate-500 dark:text-slate-400">
                      {formatDate(entry.created_at)}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <p className="truncate text-slate-400 dark:text-slate-500 flex-1">
                      {entry.content || 'ไม่มีคำอธิบายเพิ่มเติม'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center text-slate-300 dark:text-slate-700 group-hover:text-slate-400 dark:group-hover:text-slate-500 transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── View Modal (Apple Style Slide-up Sheet centered on desktop) ── */}
      {viewingEntry && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop" onClick={() => setViewingEntry(null)} />
          <div className="relative w-full max-w-md md:max-w-lg rounded-t-3xl md:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 pb-10 max-h-[85vh] md:max-h-[90vh] overflow-y-auto shadow-2xl transition-all">
            {/* Top Indicator Accent (hidden on desktop) */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-slate-200 dark:bg-slate-800 md:hidden" />
            
            <div className="flex items-start justify-between mb-5 mt-2">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1.5">
                  {viewingEntry.mood && renderMoodIcon(viewingEntry.mood, "h-5 w-5")}
                  <div className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(viewingEntry.created_at)} ที่ {formatTime(viewingEntry.created_at)}</span>
                  </div>
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white leading-snug">
                  {viewingEntry.title}
                </h3>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => openEditForm(viewingEntry)}
                  className="rounded-xl p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors cursor-pointer"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(viewingEntry.id)}
                  className="rounded-xl p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800/60 pt-4">
              {viewingEntry.content ? (
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-normal">
                  {viewingEntry.content}
                </p>
              ) : (
                <p className="text-sm text-slate-400 italic">ไม่มีรายละเอียดบันทึก</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Write / Edit Modal (iPhone Note Creator Style centered on desktop) ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop" onClick={closeForm} />
          <form
            onSubmit={handleSave}
            className="relative w-full max-w-md md:max-w-lg rounded-t-3xl md:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 pb-10 max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-slate-200 dark:bg-slate-800 md:hidden" />

            <div className="flex items-center justify-between mt-2 mb-5">
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                {editingEntry ? 'แก้ไขบันทึก' : 'โน้ตใหม่'}
              </h3>
              <button 
                type="button" 
                onClick={closeForm}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mood Selector via Modern Icons */}
            <div className="mb-5 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-900">
              <p className="text-[11px] font-bold tracking-wide text-slate-400 dark:text-slate-500 uppercase mb-2 px-0.5">
                ความรู้สึกวันนี้
              </p>
              <div className="flex gap-2">
                {MOOD_ITEMS.map(m => {
                  const Icon = m.icon
                  const isSelected = selectedMood === m.emoji
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setSelectedMood(selectedMood === m.emoji ? null : m.emoji)}
                      title={m.label}
                      className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-white dark:bg-slate-900 border-yellow-400/40 ring-2 ring-yellow-400/20 scale-105'
                          : 'bg-transparent border-transparent hover:bg-white/60 dark:hover:bg-slate-900/40 text-slate-400 dark:text-slate-600'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isSelected ? m.color.split(' ')[0] : ''}`} />
                      <span className="text-[9px] font-medium mt-1 text-slate-400 dark:text-slate-500">{m.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Inputs Group */}
            <div className="space-y-3">
              <input
                type="text"
                placeholder="ชื่อเรื่อง"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-transparent px-1 py-1 text-base font-medium text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-700"
              />

              <textarea
                ref={textareaRef}
                placeholder="เริ่มพิมพ์บันทึกที่นี่..."
                value={content}
                onChange={e => {
                  setContent(e.target.value)
                  if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto'
                    textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
                  }
                }}
                rows={6}
                className="w-full bg-transparent px-1 py-1 text-sm text-slate-700 dark:text-slate-300 focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-700 resize-none leading-relaxed min-h-[120px]"
              />
            </div>

            {/* Footer Form Action Buttons */}
            <div className="flex gap-2 mt-6 border-t border-slate-100 dark:border-slate-800/60 pt-4">
              <button
                type="button"
                onClick={closeForm}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving || (!title.trim() && !content.trim())}
                className="flex-1 rounded-xl bg-slate-900 dark:bg-white py-2.5 text-xs font-medium text-white dark:text-slate-900 shadow-md transition-all hover:bg-slate-700 dark:hover:bg-slate-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? 'กำลังเซฟ...' : 'เสร็จสิ้น'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}