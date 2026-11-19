import 'package:auth_kit/core/validation/validators.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('email', () {
    test('required and format', () {
      expect(Validators.email(''), FieldError.emailRequired);
      expect(Validators.email('   '), FieldError.emailRequired);
      for (final bad in ['sara', 'sara@', '@mail.com', 'sara@mail', 'sa ra@mail.com', 'sara@@mail.com', 'sara..a@mail.com']) {
        expect(Validators.email(bad), FieldError.emailInvalid, reason: bad);
      }
    });

    test('accepts real-world addresses and trims spaces', () {
      for (final ok in ['sara@mail.com', ' Sara.Ahmed+shop@mail.co.uk ', 'a_b-c@sub.domain.eg']) {
        expect(Validators.email(ok), isNull, reason: ok);
      }
    });
  });

  group('passwords', () {
    test('login password only needs a value', () {
      expect(Validators.loginPassword(''), FieldError.passwordRequired);
      expect(Validators.loginPassword('x'), isNull);
    });

    test('new password rules', () {
      expect(Validators.newPassword(''), FieldError.passwordRequired);
      expect(Validators.newPassword('Ab1'), FieldError.passwordShort);
      expect(Validators.newPassword('abcdefgh1'), FieldError.passwordWeak);
      expect(Validators.newPassword('ABCDEFGH1'), FieldError.passwordWeak);
      expect(Validators.newPassword('Abcdefghi'), FieldError.passwordWeak);
      expect(Validators.newPassword('Abcdefg1'), isNull);
    });

    test('confirm must match and not be empty', () {
      expect(Validators.confirmPassword('Abcdefg1', 'Abcdefg2'), FieldError.confirmMismatch);
      expect(Validators.confirmPassword('', ''), FieldError.confirmMismatch);
      expect(Validators.confirmPassword('Abcdefg1', 'Abcdefg1'), isNull);
    });

    test('strength meter', () {
      expect(Validators.strength(''), PasswordStrength.empty);
      expect(Validators.strength('abc'), PasswordStrength.weak);
      expect(Validators.strength('abcdefgh'), PasswordStrength.weak);
      expect(Validators.strength('Abcdefg1'), PasswordStrength.fair);
      expect(Validators.strength('Abcdefg1!'), PasswordStrength.good);
      expect(Validators.strength('Abcdefghijk1!'), PasswordStrength.strong);
    });
  });

  test('name', () {
    expect(Validators.name(' '), FieldError.nameRequired);
    expect(Validators.name('S'), FieldError.nameShort);
    expect(Validators.name('سارة'), isNull);
  });

  test('otp accepts 6 digits, including Arabic-Indic', () {
    expect(Validators.otp('12345'), FieldError.otpInvalid);
    expect(Validators.otp('12a456'), FieldError.otpInvalid);
    expect(Validators.otp('123456'), isNull);
    expect(Validators.otp('١٢٣٤٥٦'), isNull);
    expect(Validators.normalizeDigits('٠٩٨'), '098');
  });
}
