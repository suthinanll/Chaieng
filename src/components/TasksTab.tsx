'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Plus, 
  GripVertical, 
  ListTodo, 
  Eye, 
  EyeOff, 
  Loader2, 
  Target
} from 'lucide-react'
import {
  showSuccess,
  showError,
  showDeleteConfirm,
} from '../lib/swalConfig'

interface TodoItem {
  id: string
  user_id: string
  title: string
  is_completed: boolean
  sort_order: number
  target_date: string | null
  created_at: string
}

interface TasksTabProps {
  userId: string
}

export default function TasksTab({ userId }: TasksTabProps) {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [quickInput, setQuickInput] = useState('')
  const [hideCompleted, setHideCompleted] = useState(false)

  // Drag state
  const dragItem = useRef<string | null>(null)
  const dragOverItem = useRef<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  useEffect(() => {
    fetchTodos()
  }, [userId])

  const fetchTodos = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('todo_list')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })

      if (error) {
        const { data: data2, error: e2 } = await supabase
          .from('todo_list')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
        if (e2) throw e2
        setTodos((data2 || []).map((t, i) => ({ ...t, sort_order: t.sort_order ?? i })))
      } else {
        setTodos((data || []).map((t, i) => ({ ...t, sort_order: t.sort_order ?? i })))
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error fetching todo list:', message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickInput.trim()) return

    const newTitle = quickInput.trim()
    setQuickInput('')

    const tempId = `temp-${Date.now()}`
    const tempItem: TodoItem = {
      id: tempId,
      user_id: userId,
      title: newTitle,
      is_completed: false,
      sort_order: -1,
      target_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }
    setTodos(prev => [tempItem, ...prev])

    try {
      const { data, error } = await supabase
        .from('todo_list')
        .insert({
          user_id: userId,
          title: newTitle,
          is_completed: false,
          target_date: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      setTodos(prev => [{ ...data, sort_order: data.sort_order ?? 0 }, ...prev.filter(t => t.id !== tempId)])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setTodos(prev => prev.filter(t => t.id !== tempId))
      showError('เกิดข้อผิดพลาด', 'เพิ่มงานไม่สำเร็จ: ' + message)
    }
  }

  const handleToggleComplete = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus

    setTodos(prev =>
      prev.map(t => (t.id === id ? { ...t, is_completed: nextStatus } : t))
    )

    try {
      const { error } = await supabase
        .from('todo_list')
        .update({ is_completed: nextStatus })
        .eq('id', id)

      if (error) throw error
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      fetchTodos()
      showError('เกิดข้อผิดพลาด', 'อัปเดตสถานะล้มเหลว: ' + message)
    }
  }

  const handleDeleteTodo = async (id: string) => {
    const result = await showDeleteConfirm(
      'ลบรายการงาน?',
      'คุณต้องการลบงานนี้ใช่หรือไม่'
    )

    if (!result.isConfirmed) return

    setTodos(prev => prev.filter(t => t.id !== id))
    try {
      const { error } = await supabase
        .from('todo_list')
        .delete()
        .eq('id', id)

      if (error) throw error
      showSuccess('ลบออกแล้ว')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      fetchTodos()
      showError('เกิดข้อผิดพลาด', 'ลบงานล้มเหลว: ' + message)
    }
  }

  const handleDragStart = (id: string) => {
    dragItem.current = id
    setDraggingId(id)
  }

  const handleDragEnter = (id: string) => {
    if (dragItem.current === id) return
    dragOverItem.current = id
    setDragOverId(id)
  }

  const handleDragEnd = async () => {
    if (!dragItem.current || !dragOverItem.current || dragItem.current === dragOverItem.current) {
      setDraggingId(null)
      setDragOverId(null)
      dragItem.current = null
      dragOverItem.current = null
      return
    }

    const newList = [...todos]
    const fromIndex = newList.findIndex(t => t.id === dragItem.current)
    const toIndex = newList.findIndex(t => t.id === dragOverItem.current)

    if (fromIndex === -1 || toIndex === -1) {
      setDraggingId(null)
      setDragOverId(null)
      return
    }

    const [moved] = newList.splice(fromIndex, 1)
    newList.splice(toIndex, 0, moved)

    const updated = newList.map((item, index) => ({ ...item, sort_order: index }))
    setTodos(updated)

    setDraggingId(null)
    setDragOverId(null)
    dragItem.current = null
    dragOverItem.current = null

    try {
      await Promise.all(
        updated.map(item =>
          supabase
            .from('todo_list')
            .update({ sort_order: item.sort_order })
            .eq('id', item.id)
        )
      )
    } catch (err) {
      console.warn('Could not persist sort order:', err)
    }
  }

  const completedCount = todos.filter(t => t.is_completed).length
  const totalCount = todos.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const displayTodos = hideCompleted
    ? todos.filter(t => !t.is_completed)
    : todos

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)] space-y-5 pb-28 lg:pb-24 text-slate-800 dark:text-slate-200 antialiased">
      
      {/* ── Tab Header ── */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-neutral-900 dark:bg-neutral-800 p-2 text-yellow-400">
            <ListTodo className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">รายการงาน</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              เสร็จสิ้นแล้ว {completedCount} จากทั้งหมด {totalCount} งาน
            </p>
          </div>
        </div>

        <button
          onClick={() => setHideCompleted(!hideCompleted)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold border transition-all active:scale-95 cursor-pointer ${
            hideCompleted
              ? 'bg-yellow-400/10 dark:bg-yellow-400/15 border-yellow-400/20 text-yellow-600 dark:text-yellow-400'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          {hideCompleted ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          <span>{hideCompleted ? 'แสดงทั้งหมด' : 'ซ่อนที่เสร็จ'}</span>
        </button>
      </div>

      {/* ── Progress Widget ── */}
      {totalCount > 0 && (
        <div className="space-y-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm dark:shadow-inner">
          <div className="flex justify-between items-center text-[11px] font-bold tracking-wide uppercase text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1">
              <Target className="h-3.5 w-3.5 text-yellow-500 dark:text-yellow-400" /> ความสำเร็จโดยรวม
            </span>
            <span className="text-slate-700 dark:text-slate-300 font-extrabold">{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-yellow-400 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Drag Hint ── */}
      {displayTodos.length > 1 && (
        <p className="text-[10px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-600 text-center flex items-center justify-center gap-1">
          <GripVertical className="h-3 w-3 inline" /> กดค้างและลากเพื่อเรียงลำดับงานความสำคัญ
        </p>
      )}

      {/* ── Task List Area ── */}
      <div className="flex-1">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/50" />
            ))}
          </div>
        ) : displayTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20">
            <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-3 text-slate-400 dark:text-slate-500 mb-3">
              <Target className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {hideCompleted ? 'เคลียร์งานทั้งหมดสำเร็จแล้ว' : 'ไม่มีรายการงานค้างอยู่'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm divide-y divide-slate-100 dark:divide-slate-800/60">
            {displayTodos.map(todo => (
              <div
                key={todo.id}
                draggable={!todo.is_completed}
                onDragStart={() => handleDragStart(todo.id)}
                onDragEnter={() => handleDragEnter(todo.id)}
                onDragEnd={handleDragEnd}
                onDragOver={e => e.preventDefault()}
                className={`group flex items-center justify-between p-3.5 lg:p-4.5 transition-colors select-none ${
                  todo.id === draggingId
                    ? 'bg-slate-50 dark:bg-slate-800/60 opacity-60'
                    : todo.id === dragOverId
                    ? 'border-t-2 border-yellow-400 bg-yellow-400/5'
                    : todo.is_completed
                    ? 'bg-slate-50/40 dark:bg-slate-950/[0.15] opacity-50'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Drag Handle Icon */}
                  {!todo.is_completed && (
                    <div className="text-slate-300 dark:text-slate-700 cursor-grab active:cursor-grabbing shrink-0 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical className="h-4 w-4" />
                    </div>
                  )}

                  {/* Custom Checklist Button */}
                  <button
                    onClick={() => handleToggleComplete(todo.id, todo.is_completed)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all cursor-pointer ${
                      todo.is_completed
                        ? 'text-yellow-500 dark:text-yellow-400'
                        : 'text-slate-300 dark:text-slate-700 hover:text-yellow-500 dark:hover:text-yellow-400'
                    }`}
                  >
                    {todo.is_completed ? (
                      <CheckCircle2 className="h-5 w-5 fill-yellow-400/10" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>

                  {/* Title Text */}
                  <span
                    onClick={() => handleToggleComplete(todo.id, todo.is_completed)}
                    className={`cursor-pointer text-sm font-medium truncate transition-all flex-1 ${
                      todo.is_completed
                        ? 'line-through text-slate-400 dark:text-slate-600'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {todo.title}
                  </span>
                </div>

                {/* Trash Delete Action */}
                <button
                  onClick={() => handleDeleteTodo(todo.id)}
                  className="ml-2 shrink-0 rounded-lg p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all lg:opacity-0 group-hover:opacity-100 cursor-pointer"
                  title="ลบงาน"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Floating Quick Input Bar ── */}
      <div className="fixed bottom-[72px] lg:bottom-6 left-0 lg:left-[240px] right-0 z-30 px-4 py-3 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-900 transition-all duration-300">
        <form onSubmit={handleAddTodo} className="mx-auto max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl flex gap-2">
          <input
            type="text"
            required
            placeholder="เพิ่มรายการงานใหม่..."
            value={quickInput}
            onChange={e => setQuickInput(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 placeholder:text-slate-400 dark:placeholder-slate-600 font-medium"
          />
          <button
            type="submit"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 dark:bg-white font-bold text-white dark:text-slate-900 shadow-md transition-all hover:bg-slate-700 dark:hover:bg-slate-200 active:scale-95 cursor-pointer"
          >
            <Plus className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  )
}