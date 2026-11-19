import 'package:auth_kit/core/storage/key_value_store.dart';
import 'package:auth_kit/features/auth/data/demo_auth_repository.dart';
import 'package:auth_kit/features/auth/data/demo_outbox.dart';
import 'package:auth_kit/features/auth/domain/auth_failure.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late MemoryStore store;
  late DemoOutbox outbox;
  late DateTime now;
  late DemoAuthRepository repo;

  DemoAuthRepository build() => DemoAuthRepository(
        store: store,
        outbox: outbox,
        clock: () => now,
        latency: Duration.zero,
      );

  setUp(() {
    store = MemoryStore();
    outbox = DemoOutbox();
    now = DateTime(2026, 11, 20, 10);
    repo = build();
  });

  Matcher failsWith(AuthFailureCode code) =>
      throwsA(isA<AuthFailure>().having((f) => f.code, 'code', code));

  String lastCode(String email, DemoEmailKind kind) => outbox.latestFor(email, kind)!.code;

  test('seeded demo account signs in (email is case/space insensitive)', () async {
    final user = await repo.signIn(email: ' DEMO@negadbuilds.dev ', password: 'Demo@1234');
    expect(user.email, DemoAuthRepository.demoEmail);
    expect(user.emailVerified, isTrue);
  });

  test('wrong password and unknown email give the same error', () async {
    expect(repo.signIn(email: DemoAuthRepository.demoEmail, password: 'nope'),
        failsWith(AuthFailureCode.invalidCredentials));
    expect(repo.signIn(email: 'ghost@mail.com', password: 'Demo@1234'),
        failsWith(AuthFailureCode.invalidCredentials));
  });

  test('register → unverified session + code emailed → verify', () async {
    final events = <bool?>[];
    repo.authStateChanges().listen((u) => events.add(u?.emailVerified));

    final user = await repo.register(name: ' Omar ', email: 'Omar@Mail.com', password: 'Abcdefg1');
    expect(user.name, 'Omar');
    expect(user.emailVerified, isFalse);

    final verified = await repo.verifyEmail(lastCode('omar@mail.com', DemoEmailKind.verifyEmail));
    expect(verified.emailVerified, isTrue);
    await Future<void>.delayed(Duration.zero);
    expect(events, [false, true]);
  });

  test('duplicate email is rejected', () async {
    expect(repo.register(name: 'X', email: DemoAuthRepository.demoEmail, password: 'Abcdefg1'),
        failsWith(AuthFailureCode.emailAlreadyInUse));
  });

  test('wrong codes count down, then the code is burned', () async {
    await repo.register(name: 'Omar', email: 'omar@mail.com', password: 'Abcdefg1');
    final good = lastCode('omar@mail.com', DemoEmailKind.verifyEmail);
    final bad = good == '111111' ? '222222' : '111111';

    for (var left = 4; left >= 1; left--) {
      await expectLater(
        repo.verifyEmail(bad),
        throwsA(isA<AuthFailure>().having((f) => f.attemptsLeft, 'left', left)),
      );
    }
    await expectLater(repo.verifyEmail(bad), failsWith(AuthFailureCode.tooManyAttempts));
    // Even the right code no longer works.
    await expectLater(repo.verifyEmail(good), failsWith(AuthFailureCode.tooManyAttempts));
  });

  test('codes expire and resend has a cooldown', () async {
    await repo.register(name: 'Omar', email: 'omar@mail.com', password: 'Abcdefg1');
    final code = lastCode('omar@mail.com', DemoEmailKind.verifyEmail);

    await expectLater(repo.sendEmailVerification(), failsWith(AuthFailureCode.tooManyRequests));
    now = now.add(const Duration(minutes: 11));
    await expectLater(repo.verifyEmail(code), failsWith(AuthFailureCode.codeExpired));

    await repo.sendEmailVerification(); // cooldown passed
    expect(lastCode('omar@mail.com', DemoEmailKind.verifyEmail), isNot(isEmpty));
  });

  test('password reset: code → one-time token → new password works, old does not', () async {
    await repo.requestPasswordReset(DemoAuthRepository.demoEmail);
    final token = await repo.verifyResetCode(
      email: DemoAuthRepository.demoEmail,
      code: lastCode(DemoAuthRepository.demoEmail, DemoEmailKind.resetPassword),
    );
    await repo.resetPassword(resetToken: token, newPassword: 'NewPass123');

    expect(repo.signIn(email: DemoAuthRepository.demoEmail, password: 'Demo@1234'),
        failsWith(AuthFailureCode.invalidCredentials));
    expect((await repo.signIn(email: DemoAuthRepository.demoEmail, password: 'NewPass123')).email,
        DemoAuthRepository.demoEmail);
    // Token is single-use.
    expect(repo.resetPassword(resetToken: token, newPassword: 'Again1234'),
        failsWith(AuthFailureCode.sessionExpired));
  });

  test('reset for an unknown email completes silently and sends nothing', () async {
    await repo.requestPasswordReset('ghost@mail.com');
    expect(outbox.value, isEmpty);
  });

  test('session and accounts survive a restart (same storage)', () async {
    await repo.register(name: 'Omar', email: 'omar@mail.com', password: 'Abcdefg1');
    final restarted = build();
    final restored = await restarted.restoreSession();
    expect(restored?.email, 'omar@mail.com');

    await restarted.signOut();
    expect(await build().restoreSession(), isNull);
    expect((await build().signIn(email: 'omar@mail.com', password: 'Abcdefg1')).name, 'Omar');
  });

  test('corrupted storage does not crash the app', () async {
    store = MemoryStore({'auth.users.v1': '{not json'});
    expect(await build().restoreSession(), isNull);
  });
}
