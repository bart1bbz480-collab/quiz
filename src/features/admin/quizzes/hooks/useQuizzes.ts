import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Quiz } from '@/types'

export function useQuizzes() {
  return useQuery({
    queryKey: ['quizzes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Quiz[]
    },
  })
}

export function useQuiz(id: string | undefined) {
  return useQuery({
    queryKey: ['quiz', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`*, questions(*, options(*))`)
        .eq('id', id!)
        .single()
      if (error) throw error
      // Sorteren op positie
      const quiz = data as Quiz
      quiz.questions = (quiz.questions ?? [])
        .sort((a, b) => a.position - b.position)
        .map((q) => ({ ...q, options: (q.options ?? []).sort((a, b) => a.position - b.position) }))
      return quiz
    },
  })
}

export function useActivateQuiz() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (quizId: string) => {
      const { error } = await supabase.rpc('activate_quiz', { p_quiz_id: quizId })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quizzes'] }),
  })
}

export function useArchiveQuiz() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (quizId: string) => {
      const { error } = await supabase
        .from('quizzes')
        .update({ status: 'archived' })
        .eq('id', quizId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quizzes'] }),
  })
}

export function useDuplicateQuiz() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (quizId: string) => {
      const { data, error } = await supabase.rpc('duplicate_quiz', { p_quiz_id: quizId })
      if (error) throw error
      return data as string
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quizzes'] }),
  })
}

export function useDeleteQuiz() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (quizId: string) => {
      const { error } = await supabase.rpc('delete_quiz', { p_quiz_id: quizId })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quizzes'] }),
  })
}
