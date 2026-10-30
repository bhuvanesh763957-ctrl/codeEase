import { z } from 'zod';

export const quizSubmissionSchema = z.object({
  answers: z.array(
    z.object({
      question_id: z.string().uuid({ message: 'Invalid question ID format' }),
      answer: z.string().min(1, { message: 'Answer cannot be empty' }),
    })
  ).min(1, { message: 'At least one answer must be submitted' }),
});

export const codeExecutionSchema = z.object({
  language: z.string().refine(
    (val): val is 'python' | 'javascript' | 'c' | 'cpp' | 'java' =>
      ['python', 'javascript', 'c', 'cpp', 'java'].includes(val),
    { message: 'Unsupported language. Supported: python, javascript, c, cpp, java' }
  ),
  source_code: z
    .string()
    .min(1, { message: 'Source code cannot be empty' })
    .max(65536, { message: 'Source code exceeds maximum allowed size (64KB)' }),
  stdin: z.string().max(8192, { message: 'Standard input exceeds limit (8KB)' }).optional().default(''),
  level_id: z.string().uuid().optional(),
});

export const profileUpdateSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().or(z.literal('')).optional(),
});

export const certificateIssueSchema = z.object({
  course_id: z.string().uuid({ message: 'Valid course ID is required' }),
});
