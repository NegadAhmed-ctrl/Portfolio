import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/validation/validators.dart';
import '../../data/demo_auth_repository.dart';
import '../../domain/auth_failure.dart';
import '../../domain/auth_repository.dart';
import '../shared/form_status.dart';

class LoginState extends Equatable {
  const LoginState({
    this.email = '',
    this.password = '',
    this.showErrors = false,
    this.status = FormStatus.idle,
    this.failure,
  });

  final String email;
  final String password;

  /// Errors appear after the first submit, then update live while typing.
  final bool showErrors;
  final FormStatus status;
  final AuthFailure? failure;

  FieldError? get emailError => showErrors ? Validators.email(email) : null;
  FieldError? get passwordError => showErrors ? Validators.loginPassword(password) : null;
  bool get isValid =>
      Validators.email(email) == null && Validators.loginPassword(password) == null;

  LoginState copyWith({
    String? email,
    String? password,
    bool? showErrors,
    FormStatus? status,
    AuthFailure? Function()? failure,
  }) =>
      LoginState(
        email: email ?? this.email,
        password: password ?? this.password,
        showErrors: showErrors ?? this.showErrors,
        status: status ?? this.status,
        failure: failure != null ? failure() : this.failure,
      );

  @override
  List<Object?> get props => [email, password, showErrors, status, failure];
}

class LoginCubit extends Cubit<LoginState> {
  LoginCubit(this._repository) : super(const LoginState());

  final AuthRepository _repository;

  void emailChanged(String v) => emit(state.copyWith(email: v, failure: () => null));
  void passwordChanged(String v) => emit(state.copyWith(password: v, failure: () => null));

  void fillDemoAccount() => emit(state.copyWith(
        email: DemoAuthRepository.demoEmail,
        password: DemoAuthRepository.demoPassword,
        failure: () => null,
      ));

  Future<void> submit() async {
    if (state.status == FormStatus.submitting) return;
    emit(state.copyWith(showErrors: true));
    if (!state.isValid) return;
    emit(state.copyWith(status: FormStatus.submitting, failure: () => null));
    final failure = await runGuarded(
      () => _repository.signIn(email: state.email, password: state.password),
    );
    if (isClosed) return;
    emit(failure == null
        ? state.copyWith(status: FormStatus.success)
        : state.copyWith(status: FormStatus.failure, failure: () => failure));
  }
}
