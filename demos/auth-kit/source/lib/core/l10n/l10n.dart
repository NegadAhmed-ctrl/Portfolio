import 'package:flutter/widgets.dart';

import '../../features/auth/domain/auth_failure.dart';
import '../validation/validators.dart';
import 'gen/app_localizations.dart';

export 'gen/app_localizations.dart';

extension L10nX on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this);
}

/// Error codes → localized text. The only place messages are chosen.
extension FieldErrorText on AppLocalizations {
  String? field(FieldError? e) => switch (e) {
        null => null,
        FieldError.emailRequired => errEmailRequired,
        FieldError.emailInvalid => errEmailInvalid,
        FieldError.passwordRequired => errPasswordRequired,
        FieldError.passwordShort => errPasswordShort,
        FieldError.passwordWeak => errPasswordWeak,
        FieldError.nameRequired => errNameRequired,
        FieldError.nameShort => errNameShort,
        FieldError.confirmMismatch => errConfirmMismatch,
        FieldError.otpInvalid => errOtpInvalid,
      };

  String failure(AuthFailure f) => switch (f.code) {
        AuthFailureCode.invalidCredentials => failInvalidCredentials,
        AuthFailureCode.emailAlreadyInUse => failEmailInUse,
        AuthFailureCode.weakPassword => failWeakPassword,
        AuthFailureCode.invalidCode =>
          f.attemptsLeft == null ? failInvalidCodePlain : failInvalidCode(f.attemptsLeft!),
        AuthFailureCode.codeExpired => failCodeExpired,
        AuthFailureCode.tooManyAttempts => failTooManyAttempts,
        AuthFailureCode.tooManyRequests => failTooManyRequests,
        AuthFailureCode.sessionExpired => failSessionExpired,
        AuthFailureCode.network => failNetwork,
        AuthFailureCode.unknown => failUnknown,
      };
}
