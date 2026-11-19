import 'package:auth_kit/core/validation/validators.dart';
import 'package:auth_kit/features/auth/domain/auth_failure.dart';
import 'package:auth_kit/features/auth/presentation/register/register_cubit.dart';
import 'package:auth_kit/features/auth/presentation/shared/form_status.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'mocks.dart';

void main() {
  late MockAuthRepository repo;
  setUp(() => repo = MockAuthRepository());

  void fill(RegisterCubit c, {String confirm = 'Abcdefg1'}) => c
    ..nameChanged('Omar')
    ..emailChanged('omar@mail.com')
    ..passwordChanged('Abcdefg1')
    ..confirmChanged(confirm);

  blocTest<RegisterCubit, RegisterState>(
    'mismatched confirmation blocks submit',
    build: () => RegisterCubit(repo),
    act: (c) {
      fill(c, confirm: 'Abcdefg2');
      return c.submit();
    },
    verify: (c) {
      expect(c.state.confirmError, FieldError.confirmMismatch);
      verifyNever(() => repo.register(
          name: any(named: 'name'), email: any(named: 'email'), password: any(named: 'password')));
    },
  );

  blocTest<RegisterCubit, RegisterState>(
    'email already in use is reported',
    setUp: () => when(() => repo.register(
            name: any(named: 'name'), email: any(named: 'email'), password: any(named: 'password')))
        .thenThrow(const AuthFailure(AuthFailureCode.emailAlreadyInUse)),
    build: () => RegisterCubit(repo),
    act: (c) {
      fill(c);
      return c.submit();
    },
    verify: (c) {
      expect(c.state.status, FormStatus.failure);
      expect(c.state.failure?.code, AuthFailureCode.emailAlreadyInUse);
    },
  );

  blocTest<RegisterCubit, RegisterState>(
    'valid form registers with the typed values',
    setUp: () => when(() => repo.register(name: 'Omar', email: 'omar@mail.com', password: 'Abcdefg1'))
        .thenAnswer((_) async => sara),
    build: () => RegisterCubit(repo),
    act: (c) {
      fill(c);
      return c.submit();
    },
    verify: (c) {
      expect(c.state.status, FormStatus.success);
      expect(c.state.strength, PasswordStrength.fair);
    },
  );
}
