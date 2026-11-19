import '../../features/auth/data/demo_outbox.dart';
import '../../features/auth/domain/auth_repository.dart';
import '../storage/key_value_store.dart';

/// Composition root: the single place that decides which implementations
/// the app runs with. Swap `DemoAuthRepository` for `FirebaseAuthRepository`
/// here (see README) and nothing else changes.
class AppServices {
  const AppServices({
    required this.auth,
    required this.store,
    this.outbox,
    this.resendCooldown = const Duration(seconds: 30),
  });

  final AuthRepository auth;
  final KeyValueStore store;

  /// Only set in demo mode; shows "emailed" codes on screen.
  final DemoOutbox? outbox;
  final Duration resendCooldown;

  bool get isDemo => outbox != null;
}
