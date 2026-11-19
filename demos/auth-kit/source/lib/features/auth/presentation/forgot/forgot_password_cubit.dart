import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/validation/validators.dart';
import '../../domain/auth_failure.dart';
import '../../domain/auth_repository.dart';
import '../shared/form_status.dart';

class ForgotPasswordState extends Equatable {
  const ForgotPasswordState({
    this.email = '',
    this.showErrors = false,
    this.status = FormStatus.idle,
    this.failure,
  });

  final String email;
  final bool showErrors;
  final FormStatus status;
  final AuthFailure? failure;

  FieldError? get emailError => showErrors ? Validators.email(email) : null;

  ForgotPasswordState copyWith({
    String? email,
    bool? showErrors,
    FormStatus? status,
    AuthFailure? Function()? failure,
  }) =>
      ForgotPasswordState(
        email: email ?? this.email,
        showErrors: showErrors ?? this.showErrors,
        status: status ?? this.status,
        failure: failure != null ? failure() : this.failure,
      );

  @override
  List<Object?> get props => [email, showErrors, status, failure];
}

class ForgotPasswordCubit extends Cubit<ForgotPasswordState> {
  ForgotPasswordCubit(this._repository, {String initialEmail = ''})
      : super(ForgotPasswordState(email: initialEmail));

  final AuthRepository _repository;

  void emailChanged(String v) =>
      emit(state.copyWith(email: v, failure: () => null, status: FormStatus.idle));

  Future<void> submit() async {
    if (state.status == FormStatus.submitting) return;
    emit(state.copyWith(showErrors: true));
    if (Validators.email(state.email) != null) return;
    emit(state.copyWith(status: FormStatus.submitting, failure: () => null));
    final failure = await runGuarded(
      () => _repository.requestPasswordReset(state.email.trim()),
    );
    if (isClosed) return;
    emit(failure == null
        ? state.copyWith(status: FormStatus.success)
        : state.copyWith(status: FormStatus.failure, failure: () => failure));
  }
}
