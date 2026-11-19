import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/validation/validators.dart';
import '../../domain/auth_failure.dart';
import '../../domain/auth_repository.dart';
import '../shared/form_status.dart';

class RegisterState extends Equatable {
  const RegisterState({
    this.name = '',
    this.email = '',
    this.password = '',
    this.confirm = '',
    this.showErrors = false,
    this.status = FormStatus.idle,
    this.failure,
  });

  final String name;
  final String email;
  final String password;
  final String confirm;
  final bool showErrors;
  final FormStatus status;
  final AuthFailure? failure;

  FieldError? get nameError => showErrors ? Validators.name(name) : null;
  FieldError? get emailError => showErrors ? Validators.email(email) : null;
  FieldError? get passwordError => showErrors ? Validators.newPassword(password) : null;
  FieldError? get confirmError =>
      showErrors ? Validators.confirmPassword(password, confirm) : null;
  PasswordStrength get strength => Validators.strength(password);

  bool get isValid =>
      Validators.name(name) == null &&
      Validators.email(email) == null &&
      Validators.newPassword(password) == null &&
      Validators.confirmPassword(password, confirm) == null;

  RegisterState copyWith({
    String? name,
    String? email,
    String? password,
    String? confirm,
    bool? showErrors,
    FormStatus? status,
    AuthFailure? Function()? failure,
  }) =>
      RegisterState(
        name: name ?? this.name,
        email: email ?? this.email,
        password: password ?? this.password,
        confirm: confirm ?? this.confirm,
        showErrors: showErrors ?? this.showErrors,
        status: status ?? this.status,
        failure: failure != null ? failure() : this.failure,
      );

  @override
  List<Object?> get props => [name, email, password, confirm, showErrors, status, failure];
}

class RegisterCubit extends Cubit<RegisterState> {
  RegisterCubit(this._repository) : super(const RegisterState());

  final AuthRepository _repository;

  void nameChanged(String v) => emit(state.copyWith(name: v, failure: () => null));
  void emailChanged(String v) => emit(state.copyWith(email: v, failure: () => null));
  void passwordChanged(String v) => emit(state.copyWith(password: v, failure: () => null));
  void confirmChanged(String v) => emit(state.copyWith(confirm: v, failure: () => null));

  Future<void> submit() async {
    if (state.status == FormStatus.submitting) return;
    emit(state.copyWith(showErrors: true));
    if (!state.isValid) return;
    emit(state.copyWith(status: FormStatus.submitting, failure: () => null));
    final failure = await runGuarded(() => _repository.register(
          name: state.name,
          email: state.email,
          password: state.password,
        ));
    if (isClosed) return;
    emit(failure == null
        ? state.copyWith(status: FormStatus.success)
        : state.copyWith(status: FormStatus.failure, failure: () => failure));
  }
}
