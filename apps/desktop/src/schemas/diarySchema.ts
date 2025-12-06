/**
 * Diary form validation schema
 */

import { z } from 'zod';

export const diaryFormSchema = z.object({
  date: z.string().min(1, '日付を入力してください'),
  title: z.string().min(1, 'タイトルを入力してください').max(100, 'タイトルは100文字以内にしてください'),
  originalContent: z.string().min(10, '本文は10文字以上入力してください').max(10000, '本文は10000文字以内にしてください'),
});

export type DiaryFormData = z.infer<typeof diaryFormSchema>;
