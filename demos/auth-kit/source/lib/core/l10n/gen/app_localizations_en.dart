// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'Auth Kit';

  @override
  String get brandName => 'Negad Builds';

  @override
  String get demoBadge => 'Demo';

  @override
  String get demoModeNote =>
      'Demo mode: accounts are saved in this browser only and no real emails are sent.';

  @override
  String get languageToggle => 'العربية';

  @override
  String get themeTooltip => 'Change theme';

  @override
  String get themeLight => 'Light';

  @override
  String get themeDark => 'Dark';

  @override
  String get themeSystem => 'System';

  @override
  String get loading => 'Please wait…';

  @override
  String get brandHeadline => 'One secure sign-in flow, ready for your app';

  @override
  String get brandBody =>
      'Login, sign-up, email verification and password reset, built once with clean architecture and reused in every project.';

  @override
  String get brandPoint1 => 'Email and password with live validation';

  @override
  String get brandPoint2 => 'Email verification with a 6-digit code';

  @override
  String get brandPoint3 => 'Password reset by code, no links to lose';

  @override
  String get brandPoint4 => 'Arabic and English, light and dark';

  @override
  String get emailLabel => 'Email';

  @override
  String get emailHint => 'name@example.com';

  @override
  String get passwordLabel => 'Password';

  @override
  String get nameLabel => 'Full name';

  @override
  String get nameHint => 'Your name';

  @override
  String get confirmPasswordLabel => 'Confirm password';

  @override
  String get newPasswordLabel => 'New password';

  @override
  String get showPassword => 'Show password';

  @override
  String get hidePassword => 'Hide password';

  @override
  String get loginTitle => 'Welcome back';

  @override
  String get loginSubtitle => 'Sign in to continue to your account.';

  @override
  String get forgotPasswordLink => 'Forgot password?';

  @override
  String get signInButton => 'Sign in';

  @override
  String get noAccount => 'New here?';

  @override
  String get createAccountLink => 'Create an account';

  @override
  String get useDemoAccount => 'Fill the demo account';

  @override
  String demoAccountHint(String email, String password) {
    return 'Demo account: $email / $password';
  }

  @override
  String get registerTitle => 'Create your account';

  @override
  String get registerSubtitle => 'It takes less than a minute.';

  @override
  String get createAccountButton => 'Create account';

  @override
  String get haveAccount => 'Already have an account?';

  @override
  String get signInLink => 'Sign in';

  @override
  String get verifyEmailTitle => 'Verify your email';

  @override
  String verifyEmailSubtitle(String email) {
    return 'We sent a 6-digit code to $email.';
  }

  @override
  String get otpLabel => '6-digit code';

  @override
  String get verifyButton => 'Verify';

  @override
  String get resendCode => 'Resend code';

  @override
  String resendIn(int seconds) {
    return 'Resend in ${seconds}s';
  }

  @override
  String get codeResent => 'A new code is on its way.';

  @override
  String get useAnotherAccount => 'Use another account';

  @override
  String get forgotTitle => 'Forgot your password?';

  @override
  String get forgotSubtitle =>
      'Enter your email and we\'ll send you a 6-digit code to reset it.';

  @override
  String get sendCodeButton => 'Send code';

  @override
  String forgotSentNote(String email) {
    return 'If an account exists for $email, a code is on its way.';
  }

  @override
  String get backToSignIn => 'Back to sign in';

  @override
  String get resetCodeTitle => 'Enter the reset code';

  @override
  String get continueButton => 'Continue';

  @override
  String get resetTitle => 'Choose a new password';

  @override
  String get resetSubtitle => 'Use something you don\'t use on other sites.';

  @override
  String get savePasswordButton => 'Save new password';

  @override
  String get resetSuccessTitle => 'Password updated';

  @override
  String get resetSuccessBody =>
      'Your password was changed. Sign in with the new one.';

  @override
  String homeGreeting(String name) {
    return 'Hi, $name';
  }

  @override
  String get homeSubtitle =>
      'You\'re signed in. Refresh the page: the session stays.';

  @override
  String get emailVerified => 'Email verified';

  @override
  String memberSince(String date) {
    return 'Member since $date';
  }

  @override
  String get signOut => 'Sign out';

  @override
  String get homeChecklistTitle => 'What this kit covers';

  @override
  String get checkLogin => 'Login with validation, loading and error states';

  @override
  String get checkRegister => 'Registration with a password-strength meter';

  @override
  String get checkOtp => 'Email verification by OTP with resend cooldown';

  @override
  String get checkReset => 'Forgot password → code → new password';

  @override
  String get checkPersist => 'Session saved across restarts';

  @override
  String get checkArchitecture => 'Clean architecture + Cubit, tested';

  @override
  String get inboxTitle => 'Demo inbox';

  @override
  String get inboxSubtitle =>
      'In a real app this arrives by email. Here it is shown on screen.';

  @override
  String get inboxEmpty => 'No emails yet.';

  @override
  String get inboxVerifySubject => 'Your verification code';

  @override
  String get inboxResetSubject => 'Your password reset code';

  @override
  String get inboxUseCode => 'Use code';

  @override
  String inboxTo(String email) {
    return 'To: $email';
  }

  @override
  String get passwordRules =>
      '8+ characters with upper and lower case letters and a number.';

  @override
  String get strengthWeak => 'Weak';

  @override
  String get strengthFair => 'Fair';

  @override
  String get strengthGood => 'Good';

  @override
  String get strengthStrong => 'Strong';

  @override
  String get errEmailRequired => 'Enter your email.';

  @override
  String get errEmailInvalid => 'That email doesn\'t look right.';

  @override
  String get errPasswordRequired => 'Enter your password.';

  @override
  String get errPasswordShort => 'Use at least 8 characters.';

  @override
  String get errPasswordWeak =>
      'Add upper and lower case letters and a number.';

  @override
  String get errNameRequired => 'Enter your name.';

  @override
  String get errNameShort => 'Name is too short.';

  @override
  String get errConfirmMismatch => 'Passwords don\'t match.';

  @override
  String get errOtpInvalid => 'Enter the 6 digits.';

  @override
  String get failInvalidCredentials => 'Email or password is incorrect.';

  @override
  String get failEmailInUse => 'An account with this email already exists.';

  @override
  String get failWeakPassword => 'Choose a stronger password.';

  @override
  String failInvalidCode(int left) {
    return 'That code isn\'t correct. $left attempts left.';
  }

  @override
  String get failInvalidCodePlain => 'That code isn\'t correct.';

  @override
  String get failCodeExpired => 'This code expired. Request a new one.';

  @override
  String get failTooManyAttempts => 'Too many tries. Request a new code.';

  @override
  String get failTooManyRequests => 'Please wait a moment before trying again.';

  @override
  String get failNetwork => 'No connection. Check your internet and try again.';

  @override
  String get failSessionExpired => 'Your session ended. Start again.';

  @override
  String get failUnknown => 'Something went wrong. Please try again.';
}
