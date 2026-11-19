import 'package:firebase_auth/firebase_auth.dart' as fb;

import '../domain/auth_failure.dart';
import '../domain/auth_repository.dart';
import '../domain/auth_user.dart';

/// firebase_auth adapter. NOT wired in the live demo: it needs a Firebase
/// project in the client's account (see README → "Connect Firebase").
///
/// Firebase emails *links* for verification and reset. The `oobCode` inside
/// the link is what this adapter treats as the "code":
/// * verifyEmail(code)        → applyActionCode(code)
/// * verifyResetCode(code)    → verifyPasswordResetCode(code) (returns it as token)
/// * resetPassword(token,…)   → confirmPasswordReset(token, newPassword)
/// For true 6-digit email codes on Firebase, add a small Cloud Function;
/// Supabase supports email OTP out of the box.
class FirebaseAuthRepository implements AuthRepository {
  FirebaseAuthRepository([fb.FirebaseAuth? auth]) : _auth = auth ?? fb.FirebaseAuth.instance;

  final fb.FirebaseAuth _auth;

  @override
  Stream<AuthUser?> authStateChanges() => _auth.userChanges().map(_map);

  @override
  Future<AuthUser?> restoreSession() async {
    // Firebase restores the session itself; wait for the first event.
    final user = await _auth.authStateChanges().first;
    await user?.reload();
    return _map(_auth.currentUser);
  }

  @override
  Future<AuthUser> signIn({required String email, required String password}) =>
      _guard(() async {
        final cred = await _auth.signInWithEmailAndPassword(
          email: email.trim(),
          password: password,
        );
        return _map(cred.user)!;
      });

  @override
  Future<AuthUser> register({
    required String name,
    required String email,
    required String password,
  }) =>
      _guard(() async {
        final cred = await _auth.createUserWithEmailAndPassword(
          email: email.trim(),
          password: password,
        );
        await cred.user!.updateDisplayName(name.trim());
        await cred.user!.sendEmailVerification();
        await cred.user!.reload();
        return _map(_auth.currentUser)!;
      });

  @override
  Future<void> sendEmailVerification() => _guard(() async {
        final user = _auth.currentUser;
        if (user == null) throw const AuthFailure(AuthFailureCode.sessionExpired);
        await user.sendEmailVerification();
      });

  @override
  Future<AuthUser> verifyEmail(String code) => _guard(() async {
        await _auth.applyActionCode(code);
        await _auth.currentUser?.reload();
        final user = _map(_auth.currentUser);
        if (user == null) throw const AuthFailure(AuthFailureCode.sessionExpired);
        return user;
      });

  @override
  Future<void> requestPasswordReset(String email) => _guard(() async {
        try {
          await _auth.sendPasswordResetEmail(email: email.trim());
        } on fb.FirebaseAuthException catch (e) {
          // Same answer whether or not the account exists.
          if (e.code != 'user-not-found') rethrow;
        }
      });

  @override
  Future<String> verifyResetCode({required String email, required String code}) =>
      _guard(() async {
        await _auth.verifyPasswordResetCode(code);
        return code;
      });

  @override
  Future<void> resetPassword({required String resetToken, required String newPassword}) =>
      _guard(() => _auth.confirmPasswordReset(code: resetToken, newPassword: newPassword));

  @override
  Future<void> signOut() => _auth.signOut();

  AuthUser? _map(fb.User? u) => u == null
      ? null
      : AuthUser(
          id: u.uid,
          email: u.email ?? '',
          name: u.displayName ?? (u.email ?? '').split('@').first,
          emailVerified: u.emailVerified,
          createdAt: u.metadata.creationTime ?? DateTime.now(),
        );

  Future<T> _guard<T>(Future<T> Function() run) async {
    try {
      return await run();
    } on fb.FirebaseAuthException catch (e) {
      throw AuthFailure(mapFirebaseCode(e.code));
    }
  }

  /// Public for unit tests.
  static AuthFailureCode mapFirebaseCode(String code) => switch (code) {
        'invalid-credential' ||
        'wrong-password' ||
        'user-not-found' ||
        'invalid-email' ||
        'user-disabled' =>
          AuthFailureCode.invalidCredentials,
        'email-already-in-use' => AuthFailureCode.emailAlreadyInUse,
        'weak-password' => AuthFailureCode.weakPassword,
        'invalid-action-code' => AuthFailureCode.invalidCode,
        'expired-action-code' => AuthFailureCode.codeExpired,
        'too-many-requests' => AuthFailureCode.tooManyRequests,
        'requires-recent-login' || 'user-token-expired' => AuthFailureCode.sessionExpired,
        'network-request-failed' => AuthFailureCode.network,
        _ => AuthFailureCode.unknown,
      };
}
