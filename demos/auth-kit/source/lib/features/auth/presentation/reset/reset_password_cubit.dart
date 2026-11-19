import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/validation/validators.dart';
import '../../domain/auth_failure.dart';
import '../../domain/auth_repository.dart';
import '../shared/form_status.dart';

class ResetPasswordState extends Equatable {
  const ResetPasswordState({
    this.password = '',
    this.confirm = '',
    this.showErrors = false,
    this.status = FormStatus.idle,
    this.failure,
  });

  final String password;
  final String confirm;
  final bool showErrors;
  final FormStatus status;
  final AuthFailure? failure;

  FieldError? get passwordError => showErrors ? Validators.newPassword(password) : null;
  FieldError? get confirmError =>
      showErrors ? Validators.confirmPassword(password, confirm) : null;
  PasswordStrength get strength => Validators.strength(password);
  bool get isValid =>
      Validators.newPassword(password) == null &&
      Validators.confirmPassword(password, confirm) == null;

  ResetPasswordState copyWith({
    String? password,
    String? confirm,
    bool? showErrors,
    FormStatus? status,
    AuthFailure? Function()? failure,
  }) =>
      ResetPasswordState(
        password: password ?? this.password,
        confirm: confirm ?? this.confirm,
        showErrors: showErrors ?? this.showErrors,
        status: status ?? this.status,
        failure: failure != null ? failure() : this.failure,
      );

  @override
  List<Object?> get props => [password, confirm, showErrors, status, failure];
}

class ResetPasswordCubit extends Cubit<ResetPasswordState> {
  ResetPasswordCubit(this._repository, {required this.resetToken})
      : super(const ResetPasswordState());

  final AuthRepository _repository;
  final String resetToken;

  void passwordChanged(String v) => emit(state.copyWith(password: v, failure: () => null));
  void confirmChanged(String v) => emit(state.copyWith(confirm: v, failure: () => null));

  Future<void> submit() async {
    if (state.status == FormStatus.submitting) return;
    emit(state.copyWith(showErrors: true));
    if (!state.isValid) return;
    emit(state.copyWith(status: FormStatus.submitting, failure: () => null));
    final failure = await runGuarded(() => _repository.resetPassword(
          resetToken: resetToken,
          newPassword: state.password,
        ));
    if (isClosed) return;
    emit(failure == null
        ? state.copyWith(status: FormStatus.success)
        : state.copyWith(status: FormStatus.failure, failure: () => failure));
  }
}
