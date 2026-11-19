import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/validation/validators.dart';
import '../../domain/auth_failure.dart';
import '../../domain/auth_repository.dart';
import '../shared/form_status.dart';

enum OtpPurpose { verifyEmail, resetPassword }

class OtpState extends Equatable {
  const OtpState({
    required this.resendAvailableAt,
    this.code = '',
    this.showErrors = false,
    this.status = FormStatus.idle,
    this.failure,
    this.resending = false,
    this.resent = false,
    this.resetToken,
  });

  final String code;
  final bool showErrors;
  final FormStatus status;
  final AuthFailure? failure;
  final DateTime resendAvailableAt;
  final bool resending;

  /// True right after a successful resend (shows "a new code is on its way").
  final bool resent;

  /// Set after a reset code is accepted; passed to the new-password screen.
  final String? resetToken;

  FieldError? get codeError => showErrors ? Validators.otp(code) : null;

  OtpState copyWith({
    String? code,
    bool? showErrors,
    FormStatus? status,
    AuthFailure? Function()? failure,
    DateTime? resendAvailableAt,
    bool? resending,
    bool? resent,
    String? resetToken,
  }) =>
      OtpState(
        code: code ?? this.code,
        showErrors: showErrors ?? this.showErrors,
        status: status ?? this.status,
        failure: failure != null ? failure() : this.failure,
        resendAvailableAt: resendAvailableAt ?? this.resendAvailableAt,
        resending: resending ?? this.resending,
        resent: resent ?? this.resent,
        resetToken: resetToken ?? this.resetToken,
      );

  @override
  List<Object?> get props =>
      [code, showErrors, status, failure, resendAvailableAt, resending, resent, resetToken];
}

/// One cubit for both code screens: email verification and password reset.
class OtpCubit extends Cubit<OtpState> {
  OtpCubit({
    required AuthRepository repository,
    required this.purpose,
    required this.email,
    this.resendCooldown = const Duration(seconds: 30),
    DateTime Function()? clock,
  })  : _repository = repository,
        _now = clock ?? DateTime.now,
        super(OtpState(resendAvailableAt: (clock ?? DateTime.now)().add(resendCooldown)));

  final AuthRepository _repository;
  final OtpPurpose purpose;
  final String email;
  final Duration resendCooldown;
  final DateTime Function() _now;

  void codeChanged(String v) => emit(state.copyWith(
        code: Validators.normalizeDigits(v),
        failure: () => null,
        resent: false,
      ));

  Future<void> submit() async {
    if (state.status == FormStatus.submitting) return;
    emit(state.copyWith(showErrors: true));
    if (Validators.otp(state.code) != null) return;
    emit(state.copyWith(status: FormStatus.submitting, failure: () => null, resent: false));
    String? token;
    final failure = await runGuarded(() async {
      switch (purpose) {
        case OtpPurpose.verifyEmail:
          await _repository.verifyEmail(state.code);
        case OtpPurpose.resetPassword:
          token = await _repository.verifyResetCode(email: email, code: state.code);
      }
    });
    if (isClosed) return;
    emit(failure == null
        ? state.copyWith(status: FormStatus.success, resetToken: token)
        : state.copyWith(status: FormStatus.failure, failure: () => failure, code: ''));
  }

  Future<void> resend() async {
    if (state.resending || _now().isBefore(state.resendAvailableAt)) return;
    emit(state.copyWith(resending: true, failure: () => null, resent: false));
    final failure = await runGuarded(() => switch (purpose) {
          OtpPurpose.verifyEmail => _repository.sendEmailVerification(),
          OtpPurpose.resetPassword => _repository.requestPasswordReset(email),
        });
    if (isClosed) return;
    emit(failure == null
        ? state.copyWith(
            resending: false,
            resent: true,
            code: '',
            showErrors: false,
            status: FormStatus.idle,
            resendAvailableAt: _now().add(resendCooldown),
          )
        : state.copyWith(
            resending: false,
            failure: () => failure,
            resendAvailableAt: failure.retryAfter == null
                ? null
                : _now().add(failure.retryAfter!),
          ));
  }
}
