import {
  AuthenticatedUser,
  AuthSessionResponse,
  ChildProfileInput,
  Learner,
} from '../types';
import {
  API_ENDPOINTS,
  ApiClientError,
  AUTH_ENDPOINTS,
  apiFetch,
  FetchLike,
} from './apiConfig';
import {
  evaluatePasswordStrength,
  validateDisplayName,
  validateEmail,
} from '../utils/security';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedPolicies: boolean;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export class AuthService {
  private readonly fetchImpl?: FetchLike;
  private readonly baseUrlOverride?: string;

  constructor(options?: { fetchImpl?: FetchLike; baseUrlOverride?: string }) {
    this.fetchImpl = options?.fetchImpl;
    this.baseUrlOverride = options?.baseUrlOverride;
  }

  private request<T>(path: string, init: RequestInit = {}): Promise<T> {
    return apiFetch<T>(path, {
      ...init,
      fetchImpl: this.fetchImpl,
      baseUrlOverride: this.baseUrlOverride,
    });
  }

  public async register(payload: RegisterPayload): Promise<AuthSessionResponse> {
    const nameCheck = validateDisplayName(payload.fullName, 2, 60, 'Full name');
    if (!nameCheck.valid) {
      throw new ApiClientError(nameCheck.error || 'Invalid full name.', 400, 'VALIDATION_ERROR', {
        fullName: nameCheck.error || 'Invalid full name.',
      });
    }

    const emailCheck = validateEmail(payload.email);
    if (!emailCheck.valid) {
      throw new ApiClientError(emailCheck.error || 'Invalid email.', 400, 'VALIDATION_ERROR', {
        email: emailCheck.error || 'Invalid email.',
      });
    }

    const strength = evaluatePasswordStrength(payload.password);
    if (!strength.isValid) {
      throw new ApiClientError(
        `Password does not meet security requirements: ${strength.unmetRequirements.join(', ')}.`,
        400,
        'VALIDATION_ERROR',
        { password: `Missing: ${strength.unmetRequirements.join(', ')}` }
      );
    }

    if (payload.password !== payload.confirmPassword) {
      throw new ApiClientError('Passwords do not match.', 400, 'VALIDATION_ERROR', {
        confirmPassword: 'Passwords must match.',
      });
    }

    if (!payload.acceptedPolicies) {
      throw new ApiClientError(
        'Please accept the Privacy Policy and Terms of Use to create an account.',
        400,
        'VALIDATION_ERROR',
        { acceptedPolicies: 'Policy acceptance is required.' }
      );
    }

    return this.request<AuthSessionResponse>(AUTH_ENDPOINTS.REGISTER, {
      method: 'POST',
      body: JSON.stringify({
        fullName: nameCheck.normalized,
        email: emailCheck.normalized,
        password: payload.password,
        acceptedPolicies: true,
      }),
    });
  }

  public async login(credentials: LoginCredentials): Promise<AuthSessionResponse> {
    const emailCheck = validateEmail(credentials.email);
    if (!emailCheck.valid) {
      throw new ApiClientError(emailCheck.error || 'Invalid email.', 400, 'VALIDATION_ERROR', {
        email: emailCheck.error || 'Invalid email.',
      });
    }

    if (!credentials.password || credentials.password.length === 0) {
      throw new ApiClientError('Please enter your password.', 400, 'VALIDATION_ERROR', {
        password: 'Password is required.',
      });
    }

    return this.request<AuthSessionResponse>(AUTH_ENDPOINTS.LOGIN, {
      method: 'POST',
      body: JSON.stringify({
        email: emailCheck.normalized,
        password: credentials.password,
      }),
    });
  }

  public async logout(): Promise<void> {
    await this.request<void>(AUTH_ENDPOINTS.LOGOUT, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  public async getCurrentUser(): Promise<{
    user: AuthenticatedUser;
    childProfiles: Learner[];
  }> {
    const data = await this.request<{
      user: AuthenticatedUser;
      childProfiles?: Learner[];
    }>(AUTH_ENDPOINTS.ME, {
      method: 'GET',
    });
    return {
      user: data.user,
      childProfiles: Array.isArray(data.childProfiles) ? data.childProfiles : [],
    };
  }

  public async refreshSession(): Promise<AuthSessionResponse> {
    return this.request<AuthSessionResponse>(AUTH_ENDPOINTS.REFRESH, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  public async requestPasswordReset(email: string): Promise<{ message: string }> {
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      throw new ApiClientError(emailCheck.error || 'Invalid email.', 400, 'VALIDATION_ERROR', {
        email: emailCheck.error || 'Invalid email.',
      });
    }

    return this.request<{ message: string }>(AUTH_ENDPOINTS.FORGOT_PASSWORD, {
      method: 'POST',
      body: JSON.stringify({ email: emailCheck.normalized }),
    });
  }

  public async confirmPasswordReset(payload: ResetPasswordPayload): Promise<{ message: string }> {
    const token = payload.token.trim();
    if (!token) {
      throw new ApiClientError(
        'Reset link is missing or invalid. Please request a new password reset email.',
        400,
        'VALIDATION_ERROR',
        { token: 'Valid reset token is required.' }
      );
    }

    const strength = evaluatePasswordStrength(payload.newPassword);
    if (!strength.isValid) {
      throw new ApiClientError(
        `New password is too weak: ${strength.unmetRequirements.join(', ')}.`,
        400,
        'VALIDATION_ERROR',
        { newPassword: `Missing: ${strength.unmetRequirements.join(', ')}` }
      );
    }

    if (payload.newPassword !== payload.confirmNewPassword) {
      throw new ApiClientError('Passwords do not match.', 400, 'VALIDATION_ERROR', {
        confirmNewPassword: 'Passwords must match.',
      });
    }

    return this.request<{ message: string }>(AUTH_ENDPOINTS.RESET_PASSWORD, {
      method: 'POST',
      body: JSON.stringify({
        token,
        newPassword: payload.newPassword,
      }),
    });
  }

  public async verifyEmail(token: string): Promise<{ message: string }> {
    const trimmed = token.trim();
    if (!trimmed) {
      throw new ApiClientError('Verification token is missing.', 400, 'VALIDATION_ERROR');
    }
    return this.request<{ message: string }>(AUTH_ENDPOINTS.VERIFY_EMAIL, {
      method: 'POST',
      body: JSON.stringify({ token: trimmed }),
    });
  }

  public async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      throw new ApiClientError(emailCheck.error || 'Invalid email.', 400, 'VALIDATION_ERROR');
    }
    return this.request<{ message: string }>(AUTH_ENDPOINTS.RESEND_VERIFICATION, {
      method: 'POST',
      body: JSON.stringify({ email: emailCheck.normalized }),
    });
  }

  public async changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
    if (!payload.currentPassword) {
      throw new ApiClientError('Please enter your current password.', 400, 'VALIDATION_ERROR', {
        currentPassword: 'Current password is required.',
      });
    }
    const strength = evaluatePasswordStrength(payload.newPassword);
    if (!strength.isValid) {
      throw new ApiClientError(
        `New password is too weak: ${strength.unmetRequirements.join(', ')}.`,
        400,
        'VALIDATION_ERROR',
        { newPassword: `Missing: ${strength.unmetRequirements.join(', ')}` }
      );
    }
    if (payload.newPassword !== payload.confirmNewPassword) {
      throw new ApiClientError('New passwords do not match.', 400, 'VALIDATION_ERROR', {
        confirmNewPassword: 'New passwords must match.',
      });
    }

    return this.request<{ message: string }>(AUTH_ENDPOINTS.CHANGE_PASSWORD, {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
      }),
    });
  }

  public async reauthenticate(password: string): Promise<{ verified: boolean }> {
    if (!password) {
      throw new ApiClientError('Please enter your account password to confirm.', 400, 'VALIDATION_ERROR');
    }
    return this.request<{ verified: boolean }>(AUTH_ENDPOINTS.REAUTHENTICATE, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  public async requestAccountDeletion(password: string): Promise<{ message: string }> {
    if (!password) {
      throw new ApiClientError(
        'Please confirm your account password before deleting your account.',
        400,
        'VALIDATION_ERROR'
      );
    }
    return this.request<{ message: string }>(AUTH_ENDPOINTS.DELETE_ACCOUNT, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
  }

  public async listChildProfiles(): Promise<Learner[]> {
    return this.request<Learner[]>(API_ENDPOINTS.CHILD_PROFILES, { method: 'GET' });
  }

  public async createChildProfile(input: ChildProfileInput): Promise<Learner> {
    const nameCheck = validateDisplayName(input.displayName, 2, 24, 'Child nickname');
    if (!nameCheck.valid) {
      throw new ApiClientError(nameCheck.error || 'Invalid nickname.', 400, 'VALIDATION_ERROR', {
        displayName: nameCheck.error || 'Invalid nickname.',
      });
    }

    return this.request<Learner>(API_ENDPOINTS.CHILD_PROFILES, {
      method: 'POST',
      body: JSON.stringify({
        name: nameCheck.normalized,
        avatar: input.avatar,
        avatarName: input.avatarName,
        readingLevelId: input.readingLevelId,
        gradeLevel: input.ageBandOrGrade,
      }),
    });
  }

  public async updateChildProfile(
    childId: string,
    updates: Partial<ChildProfileInput>
  ): Promise<Learner> {
    const body: Record<string, unknown> = { ...updates };
    if (updates.displayName !== undefined) {
      const nameCheck = validateDisplayName(updates.displayName, 2, 24, 'Child nickname');
      if (!nameCheck.valid) {
        throw new ApiClientError(nameCheck.error || 'Invalid nickname.', 400, 'VALIDATION_ERROR', {
          displayName: nameCheck.error || 'Invalid nickname.',
        });
      }
      body.name = nameCheck.normalized;
      delete body.displayName;
    }
    if (updates.ageBandOrGrade !== undefined) {
      body.gradeLevel = updates.ageBandOrGrade;
      delete body.ageBandOrGrade;
    }

    return this.request<Learner>(API_ENDPOINTS.CHILD_PROFILE_BY_ID(childId), {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  public async deleteChildProfile(childId: string, password: string): Promise<void> {
    if (!password) {
      throw new ApiClientError(
        'Parent password confirmation is required to delete a child profile.',
        400,
        'VALIDATION_ERROR'
      );
    }
    await this.request<void>(API_ENDPOINTS.CHILD_PROFILE_BY_ID(childId), {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
  }
}

export const authService = new AuthService();
