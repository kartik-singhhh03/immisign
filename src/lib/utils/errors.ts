export class AppError extends Error {
  constructor(
    public message: string,
    public code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'INTERNAL_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleServerError(error: unknown) {
  console.error('[Server Error]', error);

  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      details: error.details,
    };
  }

  // Handle Supabase errors
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const sbError = error as { code: string; message: string; details: string };
    
    // Postgres RLS violation
    if (sbError.code === '42501') {
      return {
        error: 'You do not have permission to access this resource.',
        code: 'FORBIDDEN',
      };
    }
  }

  return {
    error: 'An unexpected error occurred.',
    code: 'INTERNAL_ERROR',
  };
}
