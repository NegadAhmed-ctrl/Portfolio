/// Pure, framework-free validation. Returns an error *code* (or null),
/// never a message: messages are localized in the UI layer.
enum FieldError {
  emailRequired,
  emailInvalid,
  passwordRequired,
  passwordShort,
  passwordWeak,
  nameRequired,
  nameShort,
  confirmMismatch,
  otpInvalid,
}

enum PasswordStrength { empty, weak, fair, good, strong }

abstract final class Validators {
  static const minPasswordLength = 8;
  static const otpLength = 6;

  // Practical email check: something@domain.tld, no spaces, one @.
  static final _email = RegExp(r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$");
  static final _arabicDigits = RegExp('[٠-٩]');

  static FieldError? email(String value) {
    final v = value.trim();
    if (v.isEmpty) return FieldError.emailRequired;
    if (!_email.hasMatch(v) || v.contains('..')) return FieldError.emailInvalid;
    return null;
  }

  /// For login: only "is it there". Strength rules apply when choosing one.
  static FieldError? loginPassword(String value) =>
      value.isEmpty ? FieldError.passwordRequired : null;

  static FieldError? newPassword(String value) {
    if (value.isEmpty) return FieldError.passwordRequired;
    if (value.length < minPasswordLength) return FieldError.passwordShort;
    final hasUpper = value.contains(RegExp('[A-Z]'));
    final hasLower = value.contains(RegExp('[a-z]'));
    final hasDigit = value.contains(RegExp('[0-9]'));
    if (!(hasUpper && hasLower && hasDigit)) return FieldError.passwordWeak;
    return null;
  }

  static FieldError? confirmPassword(String password, String confirm) =>
      confirm != password || confirm.isEmpty ? FieldError.confirmMismatch : null;

  static FieldError? name(String value) {
    final v = value.trim();
    if (v.isEmpty) return FieldError.nameRequired;
    if (v.runes.length < 2) return FieldError.nameShort;
    return null;
  }

  static FieldError? otp(String value) =>
      RegExp('^[0-9]{$otpLength}\$').hasMatch(normalizeDigits(value).trim())
          ? null
          : FieldError.otpInvalid;

  /// Arabic-Indic digits (٠١٢…) typed on Arabic keyboards → 0-9.
  static String normalizeDigits(String value) => value.replaceAllMapped(
        _arabicDigits,
        (m) => (m[0]!.codeUnitAt(0) - 0x0660).toString(),
      );

  static PasswordStrength strength(String value) {
    if (value.isEmpty) return PasswordStrength.empty;
    var score = 0;
    if (value.length >= minPasswordLength) score++;
    if (value.length >= 12) score++;
    if (value.contains(RegExp('[A-Z]')) && value.contains(RegExp('[a-z]'))) score++;
    if (value.contains(RegExp('[0-9]'))) score++;
    if (value.contains(RegExp(r'[^A-Za-z0-9]'))) score++;
    // Anything that fails the rules is weak; a valid password scores 3–5.
    if (newPassword(value) != null) return PasswordStrength.weak;
    return switch (score) {
      <= 3 => PasswordStrength.fair,
      4 => PasswordStrength.good,
      _ => PasswordStrength.strong,
    };
  }
}
