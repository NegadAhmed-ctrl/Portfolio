import 'package:auth_kit/features/auth/domain/auth_repository.dart';
import 'package:auth_kit/features/auth/domain/auth_user.dart';
import 'package:mocktail/mocktail.dart';

class MockAuthRepository extends Mock implements AuthRepository {}

final sara = AuthUser(
  id: 'u1',
  email: 'sara@mail.com',
  name: 'Sara',
  emailVerified: true,
  createdAt: DateTime(2026, 11, 1),
);
