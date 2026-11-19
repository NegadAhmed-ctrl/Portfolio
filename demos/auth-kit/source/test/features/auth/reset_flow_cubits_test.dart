import 'package:auth_kit/core/validation/validators.dart';
import 'package:auth_kit/features/auth/domain/auth_failure.dart';
import 'package:auth_kit/features/auth/presentation/forgot/forgot_password_cubit.dart';
import 'package:auth_kit/features/auth/presentation/reset/reset_password_cubit.dart';
import 'package:auth_kit/features/auth/presentation/shared/form_status.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'mocks.dart';

void main() {
  late MockAuthRepository repo;
  setUp(() => repo = MockAuthRepository());

  blocTest<ForgotPasswordCubit, ForgotPasswordState>(
    'forgot: invalid email is caught locally',
    build: () => ForgotPasswordCubit(repo, initialEmail: 'sara@'),
    act: (c) => c.submit(),
    verify: (c) {
      expect(c.state.emailError, FieldError.emailInvalid);
      verifyNever(() => repo.requestPasswordReset(any()));
    },
  );

  blocTest<ForgotPasswordCubit, ForgotPasswordState>(
    'forgot: sends the trimmed email',
    setUp: () => when(() => repo.requestPasswordReset('sara@mail.com')).thenAnswer((_) async {}),
    build: () => ForgotPasswordCubit(repo, initialEmail: ' sara@mail.com '),
    act: (c) => c.submit(),
    verify: (c) => expect(c.state.status, FormStatus.success),
  );

  blocTest<ResetPasswordCubit, ResetPasswordState>(
    'reset: weak password blocked',
    build: () => ResetPasswordCubit(repo, resetToken: 't'),
    act: (c) => c
      ..passwordChanged('password')
      ..confirmChanged('password')
      ..submit(),
    verify: (c) => expect(c.state.passwordError, FieldError.passwordWeak),
  );

  blocTest<ResetPasswordCubit, ResetPasswordState>(
    'reset: expired token reported',
    setUp: () => when(() => repo.resetPassword(resetToken: 't', newPassword: 'NewPass123'))
        .thenThrow(const AuthFailure(AuthFailureCode.sessionExpired)),
    build: () => ResetPasswordCubit(repo, resetToken: 't'),
    act: (c) => c
      ..passwordChanged('NewPass123')
      ..confirmChanged('NewPass123')
      ..submit(),
    verify: (c) => expect(c.state.failure?.code, AuthFailureCode.sessionExpired),
  );
}
