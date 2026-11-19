import 'package:auth_kit/core/routing/app_router.dart';
import 'package:auth_kit/features/auth/data/firebase_auth_repository.dart';
import 'package:auth_kit/features/auth/domain/auth_failure.dart';
import 'package:auth_kit/features/auth/presentation/session/auth_session_cubit.dart';
import 'package:flutter_test/flutter_test.dart';

import '../features/auth/mocks.dart';

void main() {
  group('authRedirect', () {
    String? go(AuthSessionState s, String location) => authRedirect(s, Uri.parse(location));
    const out = AuthSessionState.unauthenticated();
    final unverified = AuthSessionState.authenticated(sara.copyWith(emailVerified: false));
    final verified = AuthSessionState.authenticated(sara);

    test('unknown session waits on splash and remembers the target', () {
      expect(go(const AuthSessionState.unknown(), '/register'), '/splash?from=%2Fregister');
      expect(go(const AuthSessionState.unknown(), '/splash'), isNull);
    });

    test('signed out: public pages allowed, private pages → login', () {
      expect(go(out, '/forgot'), isNull);
      expect(go(out, '/home'), '/login');
      expect(go(out, '/splash?from=%2Fregister'), '/register');
      expect(go(out, '/splash?from=%2Fhome'), '/login');
    });

    test('signed in but unverified: always verify first', () {
      expect(go(unverified, '/home'), '/verify-email');
      expect(go(unverified, '/login'), '/verify-email');
      expect(go(unverified, '/verify-email'), isNull);
    });

    test('verified: auth pages bounce to home', () {
      expect(go(verified, '/login'), '/home');
      expect(go(verified, '/verify-email'), '/home');
      expect(go(verified, '/home'), isNull);
    });
  });

  test('Firebase error codes map to app failures', () {
    expect(FirebaseAuthRepository.mapFirebaseCode('wrong-password'), AuthFailureCode.invalidCredentials);
    expect(FirebaseAuthRepository.mapFirebaseCode('invalid-credential'), AuthFailureCode.invalidCredentials);
    expect(FirebaseAuthRepository.mapFirebaseCode('email-already-in-use'), AuthFailureCode.emailAlreadyInUse);
    expect(FirebaseAuthRepository.mapFirebaseCode('expired-action-code'), AuthFailureCode.codeExpired);
    expect(FirebaseAuthRepository.mapFirebaseCode('network-request-failed'), AuthFailureCode.network);
    expect(FirebaseAuthRepository.mapFirebaseCode('something-new'), AuthFailureCode.unknown);
  });
}
