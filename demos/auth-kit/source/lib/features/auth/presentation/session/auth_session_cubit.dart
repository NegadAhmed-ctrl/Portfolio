import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/auth_repository.dart';
import '../../domain/auth_user.dart';

enum SessionStatus { unknown, authenticated, unauthenticated }

class AuthSessionState extends Equatable {
  const AuthSessionState._(this.status, this.user);

  const AuthSessionState.unknown() : this._(SessionStatus.unknown, null);
  const AuthSessionState.unauthenticated() : this._(SessionStatus.unauthenticated, null);
  const AuthSessionState.authenticated(AuthUser user)
      : this._(SessionStatus.authenticated, user);

  final SessionStatus status;
  final AuthUser? user;

  bool get needsVerification => user != null && !user!.emailVerified;

  @override
  List<Object?> get props => [status, user];
}

/// App-wide "who is signed in". The router redirects from this state,
/// so screens never navigate after sign-in/out themselves.
class AuthSessionCubit extends Cubit<AuthSessionState> {
  AuthSessionCubit(this._repository) : super(const AuthSessionState.unknown());

  final AuthRepository _repository;
  StreamSubscription<AuthUser?>? _sub;

  Future<void> start() async {
    _sub ??= _repository.authStateChanges().listen(_emitUser);
    try {
      _emitUser(await _repository.restoreSession());
    } catch (_) {
      emit(const AuthSessionState.unauthenticated());
    }
  }

  Future<void> signOut() => _repository.signOut();

  void _emitUser(AuthUser? user) => emit(
        user == null
            ? const AuthSessionState.unauthenticated()
            : AuthSessionState.authenticated(user),
      );

  @override
  Future<void> close() async {
    await _sub?.cancel();
    return super.close();
  }
}
