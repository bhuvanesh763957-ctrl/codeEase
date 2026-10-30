import { ENV, isJudge0Configured } from '../config/env.ts';
import { JUDGE0_LANGUAGES } from '../config/judge0.ts';
import { getSupabaseAdmin } from '../config/supabase.ts';
import { isSupabaseConfigured } from '../config/env.ts';

export interface CodeExecutionRequest {
  language: string;
  source_code: string;
  stdin?: string;
  level_id?: string;
  user_id?: string;
}

export interface CodeExecutionResponse {
  status: {
    id: number;
    description: string;
  };
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  time: string | null;
  memory: number | null;
  language: string;
  execution_status: 'success' | 'error' | 'timeout' | 'compile_error';
}

export const executeCode = async (params: CodeExecutionRequest): Promise<CodeExecutionResponse> => {
  if (!isJudge0Configured()) {
    const error: any = new Error(
      'Online compiler service is not configured. Please provide JUDGE0_API_URL and JUDGE0_API_KEY in your environment (.env).'
    );
    error.status = 503;
    error.code = 'COMPILER_UNCONFIGURED';
    throw error;
  }

  const langConfig = JUDGE0_LANGUAGES[params.language.toLowerCase()];
  if (!langConfig) {
    const error: any = new Error(`Unsupported programming language: ${params.language}`);
    error.status = 400;
    throw error;
  }

  // Security: Max source length limit (64 KB)
  if (params.source_code.length > 65536) {
    const error: any = new Error('Source code exceeds maximum size limit of 64KB');
    error.status = 400;
    throw error;
  }

  const judge0Url = ENV.JUDGE0_API_URL.replace(/\/$/, '');
  const submissionUrl = `${judge0Url}/submissions?base64_encoded=false&wait=true`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (ENV.JUDGE0_API_KEY) {
    headers['X-RapidAPI-Key'] = ENV.JUDGE0_API_KEY;
    headers['X-RapidAPI-Host'] = ENV.JUDGE0_API_HOST;
  }

  const payload = {
    language_id: langConfig.id,
    source_code: params.source_code,
    stdin: params.stdin || '',
    cpu_time_limit: 5,
    cpu_extra_time: 1.0,
    wall_time_limit: 10,
    memory_limit: 128000, // 128MB
    max_file_size: 1024,
  };

  const response = await fetch(submissionUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Compiler sandbox execution failed (${response.status}): ${errText}`);
  }

  let resultData = await response.json();

  // If Judge0 returned a token instead of waiting synchronously, poll once or twice
  if (resultData.token && !resultData.status) {
    const token = resultData.token;
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const pollRes = await fetch(`${judge0Url}/submissions/${token}?base64_encoded=false`, {
        headers,
      });
      if (pollRes.ok) {
        resultData = await pollRes.json();
        // Status 1 = In Queue, 2 = Processing
        if (resultData.status?.id > 2) {
          break;
        }
      }
    }
  }

  // Determine normalized execution_status
  const statusId = resultData.status?.id || 0;
  let executionStatus: CodeExecutionResponse['execution_status'] = 'error';

  if (statusId === 3) {
    // Accepted
    executionStatus = 'success';
  } else if (statusId === 6) {
    // Compilation Error
    executionStatus = 'compile_error';
  } else if (statusId === 5 || statusId === 13) {
    // Time Limit Exceeded
    executionStatus = 'timeout';
  }

  const formattedResponse: CodeExecutionResponse = {
    status: {
      id: statusId,
      description: resultData.status?.description || 'Unknown Status',
    },
    stdout: resultData.stdout || null,
    stderr: resultData.stderr || null,
    compile_output: resultData.compile_output || null,
    message: resultData.message || null,
    time: resultData.time || null,
    memory: resultData.memory || null,
    language: langConfig.name,
    execution_status: executionStatus,
  };

  // Asynchronously record submission if authenticated and DB configured
  if (params.user_id && isSupabaseConfigured()) {
    try {
      const admin = getSupabaseAdmin();
      await admin.from('code_submissions').insert({
        user_id: params.user_id,
        level_id: params.level_id || null,
        programming_language: params.language,
        source_code: params.source_code,
        execution_status: executionStatus,
        output: formattedResponse.stdout || formattedResponse.stderr || formattedResponse.compile_output || '',
        created_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.error('Failed to log code submission:', dbErr);
    }
  }

  return formattedResponse;
};
