import 'auth_user.dart';

/// The only thing the presentation layer knows about authentication.
///
/// Implementations:
/// * `DemoAuthRepository`: works fully offline (used by the live demo and tests).
/// * `FirebaseAuthRepository`: firebase_auth adapter, ready to wire.
///
/// All methods throw `AuthFailure` on expected errors.
abstract interface class AuthRepository {
  /// Emits the current user on every sign-in, sign-out or verification.
  Stream<AuthUser?> authStateChanges();

  /// Restores a saved session (app start / page refresh).
  Future<AuthUser?> restoreSession();

  Future<AuthUser> signIn({required String email, required String password});

  /// Creates the account, signs it in and sends a verification code.
  Future<AuthUser> register({
    required String name,
    required String email,
    required String password,
  });

  /// Sends a new verification code to the signed-in user.
  Future<void> sendEmailVerification();

  /// Confirms the signed-in user's email with the code they received.
  Future<AuthUser> verifyEmail(String code);

  /// Sends a reset code. Completes normally even if no account exists,
  /// so the form can't be used to discover registered emails.
  Future<void> requestPasswordReset(String email);

  /// Checks a reset code and returns a one-time token for [resetPassword].
  Future<String> verifyResetCode({required String email, required String code});

  Future<void> resetPassword({
    required String resetToken,
    required String newPassword,
  });

  Future<void> signOut();
}
