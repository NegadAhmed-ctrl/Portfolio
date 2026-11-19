import 'package:auth_kit/core/validation/validators.dart';
import 'package:auth_kit/features/auth/data/demo_auth_repository.dart';
import 'package:auth_kit/features/auth/domain/auth_failure.dart';
import 'package:auth_kit/features/auth/presentation/login/login_cubit.dart';
import 'package:auth_kit/features/auth/presentation/shared/form_status.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'mocks.dart';

void main() {
  late MockAuthRepository repo;
  setUp(() => repo = MockAuthRepository());

  blocTest<LoginCubit, LoginState>(
    'empty submit shows field errors and never calls the backend',
    build: () => LoginCubit(repo),
    act: (c) => c.submit(),
    verify: (c) {
      expect(c.state.emailError, FieldError.emailRequired);
      expect(c.state.passwordError, FieldError.passwordRequired);
      expect(c.state.status, FormStatus.idle);
      verifyNever(() => repo.signIn(email: any(named: 'email'), password: any(named: 'password')));
    },
  );

  blocTest<LoginCubit, LoginState>(
    'errors stay hidden while typing before the first submit',
    build: () => LoginCubit(repo),
    act: (c) => c.emailChanged('not-an-email'),
    verify: (c) => expect(c.state.emailError, isNull),
  );

  blocTest<LoginCubit, LoginState>(
    'valid submit: submitting → success',
    setUp: () => when(() => repo.signIn(email: 'sara@mail.com', password: 'secret'))
        .thenAnswer((_) async => sara),
    build: () => LoginCubit(repo),
    act: (c) => c
      ..emailChanged('sara@mail.com')
      ..passwordChanged('secret')
      ..submit(),
    skip: 2,
    expect: () => [
      const LoginState(email: 'sara@mail.com', password: 'secret', showErrors: true),
      const LoginState(
          email: 'sara@mail.com', password: 'secret', showErrors: true, status: FormStatus.submitting),
      const LoginState(
          email: 'sara@mail.com', password: 'secret', showErrors: true, status: FormStatus.success),
    ],
  );

  blocTest<LoginCubit, LoginState>(
    'backend failure is exposed, and cleared as soon as the user types',
    setUp: () => when(() => repo.signIn(email: any(named: 'email'), password: any(named: 'password')))
        .thenThrow(const AuthFailure(AuthFailureCode.invalidCredentials)),
    build: () => LoginCubit(repo),
    act: (c) async {
      c
        ..emailChanged('sara@mail.com')
        ..passwordChanged('wrong');
      await c.submit();
      expect(c.state.status, FormStatus.failure);
      expect(c.state.failure?.code, AuthFailureCode.invalidCredentials);
      c.passwordChanged('wrong2');
    },
    verify: (c) => expect(c.state.failure, isNull),
  );

  blocTest<LoginCubit, LoginState>(
    'unexpected exceptions become AuthFailureCode.unknown (no crash)',
    setUp: () => when(() => repo.signIn(email: any(named: 'email'), password: any(named: 'password')))
        .thenThrow(StateError('boom')),
    build: () => LoginCubit(repo),
    act: (c) => c
      ..emailChanged('sara@mail.com')
      ..passwordChanged('x')
      ..submit(),
    verify: (c) => expect(c.state.failure?.code, AuthFailureCode.unknown),
  );

  blocTest<LoginCubit, LoginState>(
    'demo account fill',
    build: () => LoginCubit(repo),
    act: (c) => c.fillDemoAccount(),
    verify: (c) {
      expect(c.state.email, DemoAuthRepository.demoEmail);
      expect(c.state.password, DemoAuthRepository.demoPassword);
    },
  );
}
