import '../../domain/auth_failure.dart';

enum FormStatus { idle, submitting, success, failure }

/// Runs [action] and converts anything unexpected into [AuthFailureCode.unknown],
/// so a cubit never leaks a raw exception into the UI.
Future<AuthFailure?> runGuarded(Future<void> Function() action) async {
  try {
    await action();
    return null;
  } on AuthFailure catch (f) {
    return f;
  } catch (_) {
    return const AuthFailure(AuthFailureCode.unknown);
  }
}
