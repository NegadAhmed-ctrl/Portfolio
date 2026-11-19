import 'package:equatable/equatable.dart';

/// Every way an auth call can fail, independent of the backend.
/// Adapters translate backend errors (FirebaseAuthException codes,
/// HTTP status codes…) into one of these, and the UI turns them into
/// localized messages. The UI never sees raw backend errors.
enum AuthFailureCode {
  invalidCredentials,
  emailAlreadyInUse,
  weakPassword,
  invalidCode,
  codeExpired,
  tooManyAttempts,
  tooManyRequests,
  sessionExpired,
  network,
  unknown,
}

class AuthFailure extends Equatable implements Exception {
  const AuthFailure(this.code, {this.attemptsLeft, this.retryAfter});

  final AuthFailureCode code;

  /// For [AuthFailureCode.invalidCode]: tries left before the code is burned.
  final int? attemptsLeft;

  /// For [AuthFailureCode.tooManyRequests]: how long to wait.
  final Duration? retryAfter;

  @override
  List<Object?> get props => [code, attemptsLeft, retryAfter];

  @override
  String toString() => 'AuthFailure($code)';
}
