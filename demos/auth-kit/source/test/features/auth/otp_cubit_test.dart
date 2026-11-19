import 'package:auth_kit/core/validation/validators.dart';
import 'package:auth_kit/features/auth/domain/auth_failure.dart';
import 'package:auth_kit/features/auth/presentation/shared/form_status.dart';
import 'package:auth_kit/features/auth/presentation/verify/otp_cubit.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'mocks.dart';

void main() {
  late MockAuthRepository repo;
  late DateTime now;
  setUp(() {
    repo = MockAuthRepository();
    now = DateTime(2026, 11, 20, 10);
  });

  OtpCubit build(OtpPurpose purpose) => OtpCubit(
        repository: repo,
        purpose: purpose,
        email: 'sara@mail.com',
        clock: () => now,
      );

  test('resend is locked for the cooldown after the code was sent', () {
    final c = build(OtpPurpose.verifyEmail);
    expect(c.state.resendAvailableAt, now.add(const Duration(seconds: 30)));
    c.resend();
    verifyNever(() => repo.sendEmailVerification());
  });

  blocTest<OtpCubit, OtpState>(
    'Arabic-Indic digits are normalized; short code is rejected locally',
    build: () => build(OtpPurpose.verifyEmail),
    act: (c) => c
      ..codeChanged('١٢٣')
      ..submit(),
    verify: (c) {
      expect(c.state.code, '123');
      expect(c.state.codeError, FieldError.otpInvalid);
      verifyNever(() => repo.verifyEmail(any()));
    },
  );

  blocTest<OtpCubit, OtpState>(
    'verify email: wrong code clears the field and shows attempts left',
    setUp: () => when(() => repo.verifyEmail('111111'))
        .thenThrow(const AuthFailure(AuthFailureCode.invalidCode, attemptsLeft: 3)),
    build: () => build(OtpPurpose.verifyEmail),
    act: (c) => c
      ..codeChanged('111111')
      ..submit(),
    verify: (c) {
      expect(c.state.status, FormStatus.failure);
      expect(c.state.failure?.attemptsLeft, 3);
      expect(c.state.code, isEmpty);
    },
  );

  blocTest<OtpCubit, OtpState>(
    'reset: accepted code yields the reset token',
    setUp: () => when(() => repo.verifyResetCode(email: 'sara@mail.com', code: '654321'))
        .thenAnswer((_) async => 'token-1'),
    build: () => build(OtpPurpose.resetPassword),
    act: (c) => c
      ..codeChanged('654321')
      ..submit(),
    verify: (c) {
      expect(c.state.status, FormStatus.success);
      expect(c.state.resetToken, 'token-1');
    },
  );

  blocTest<OtpCubit, OtpState>(
    'resend after cooldown sends again and restarts the timer',
    setUp: () => when(() => repo.requestPasswordReset('sara@mail.com')).thenAnswer((_) async {}),
    build: () => build(OtpPurpose.resetPassword),
    act: (c) {
      now = now.add(const Duration(seconds: 31));
      return c.resend();
    },
    verify: (c) {
      verify(() => repo.requestPasswordReset('sara@mail.com')).called(1);
      expect(c.state.resent, isTrue);
      expect(c.state.resendAvailableAt, now.add(const Duration(seconds: 30)));
    },
  );

  blocTest<OtpCubit, OtpState>(
    'server-side cooldown (retryAfter) moves the timer',
    setUp: () => when(() => repo.sendEmailVerification()).thenThrow(const AuthFailure(
        AuthFailureCode.tooManyRequests,
        retryAfter: Duration(seconds: 12))),
    build: () => build(OtpPurpose.verifyEmail),
    act: (c) {
      now = now.add(const Duration(seconds: 40));
      return c.resend();
    },
    verify: (c) {
      expect(c.state.failure?.code, AuthFailureCode.tooManyRequests);
      expect(c.state.resendAvailableAt, now.add(const Duration(seconds: 12)));
    },
  );
}
