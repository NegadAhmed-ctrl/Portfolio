import 'package:equatable/equatable.dart';

/// The signed-in user as the rest of the app sees it.
/// Backend-agnostic: Firebase, Supabase or a custom API all map to this.
class AuthUser extends Equatable {
  const AuthUser({
    required this.id,
    required this.email,
    required this.name,
    required this.emailVerified,
    required this.createdAt,
  });

  final String id;
  final String email;
  final String name;
  final bool emailVerified;
  final DateTime createdAt;

  AuthUser copyWith({String? name, bool? emailVerified}) => AuthUser(
        id: id,
        email: email,
        name: name ?? this.name,
        emailVerified: emailVerified ?? this.emailVerified,
        createdAt: createdAt,
      );

  @override
  List<Object?> get props => [id, email, name, emailVerified, createdAt];
}
