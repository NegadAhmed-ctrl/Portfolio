import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ar.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'gen/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('en'),
  ];

  /// No description provided for @appName.
  ///
  /// In en, this message translates to:
  /// **'Auth Kit'**
  String get appName;

  /// No description provided for @brandName.
  ///
  /// In en, this message translates to:
  /// **'Negad Builds'**
  String get brandName;

  /// No description provided for @demoBadge.
  ///
  /// In en, this message translates to:
  /// **'Demo'**
  String get demoBadge;

  /// No description provided for @demoModeNote.
  ///
  /// In en, this message translates to:
  /// **'Demo mode: accounts are saved in this browser only and no real emails are sent.'**
  String get demoModeNote;

  /// No description provided for @languageToggle.
  ///
  /// In en, this message translates to:
  /// **'العربية'**
  String get languageToggle;

  /// No description provided for @themeTooltip.
  ///
  /// In en, this message translates to:
  /// **'Change theme'**
  String get themeTooltip;

  /// No description provided for @themeLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get themeLight;

  /// No description provided for @themeDark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get themeDark;

  /// No description provided for @themeSystem.
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get themeSystem;

  /// No description provided for @loading.
  ///
  /// In en, this message translates to:
  /// **'Please wait…'**
  String get loading;

  /// No description provided for @brandHeadline.
  ///
  /// In en, this message translates to:
  /// **'One secure sign-in flow, ready for your app'**
  String get brandHeadline;

  /// No description provided for @brandBody.
  ///
  /// In en, this message translates to:
  /// **'Login, sign-up, email verification and password reset, built once with clean architecture and reused in every project.'**
  String get brandBody;

  /// No description provided for @brandPoint1.
  ///
  /// In en, this message translates to:
  /// **'Email and password with live validation'**
  String get brandPoint1;

  /// No description provided for @brandPoint2.
  ///
  /// In en, this message translates to:
  /// **'Email verification with a 6-digit code'**
  String get brandPoint2;

  /// No description provided for @brandPoint3.
  ///
  /// In en, this message translates to:
  /// **'Password reset by code, no links to lose'**
  String get brandPoint3;

  /// No description provided for @brandPoint4.
  ///
  /// In en, this message translates to:
  /// **'Arabic and English, light and dark'**
  String get brandPoint4;

  /// No description provided for @emailLabel.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get emailLabel;

  /// No description provided for @emailHint.
  ///
  /// In en, this message translates to:
  /// **'name@example.com'**
  String get emailHint;

  /// No description provided for @passwordLabel.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get passwordLabel;

  /// No description provided for @nameLabel.
  ///
  /// In en, this message translates to:
  /// **'Full name'**
  String get nameLabel;

  /// No description provided for @nameHint.
  ///
  /// In en, this message translates to:
  /// **'Your name'**
  String get nameHint;

  /// No description provided for @confirmPasswordLabel.
  ///
  /// In en, this message translates to:
  /// **'Confirm password'**
  String get confirmPasswordLabel;

  /// No description provided for @newPasswordLabel.
  ///
  /// In en, this message translates to:
  /// **'New password'**
  String get newPasswordLabel;

  /// No description provided for @showPassword.
  ///
  /// In en, this message translates to:
  /// **'Show password'**
  String get showPassword;

  /// No description provided for @hidePassword.
  ///
  /// In en, this message translates to:
  /// **'Hide password'**
  String get hidePassword;

  /// No description provided for @loginTitle.
  ///
  /// In en, this message translates to:
  /// **'Welcome back'**
  String get loginTitle;

  /// No description provided for @loginSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Sign in to continue to your account.'**
  String get loginSubtitle;

  /// No description provided for @forgotPasswordLink.
  ///
  /// In en, this message translates to:
  /// **'Forgot password?'**
  String get forgotPasswordLink;

  /// No description provided for @signInButton.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get signInButton;

  /// No description provided for @noAccount.
  ///
  /// In en, this message translates to:
  /// **'New here?'**
  String get noAccount;

  /// No description provided for @createAccountLink.
  ///
  /// In en, this message translates to:
  /// **'Create an account'**
  String get createAccountLink;

  /// No description provided for @useDemoAccount.
  ///
  /// In en, this message translates to:
  /// **'Fill the demo account'**
  String get useDemoAccount;

  /// No description provided for @demoAccountHint.
  ///
  /// In en, this message translates to:
  /// **'Demo account: {email} / {password}'**
  String demoAccountHint(String email, String password);

  /// No description provided for @registerTitle.
  ///
  /// In en, this message translates to:
  /// **'Create your account'**
  String get registerTitle;

  /// No description provided for @registerSubtitle.
  ///
  /// In en, this message translates to:
  /// **'It takes less than a minute.'**
  String get registerSubtitle;

  /// No description provided for @createAccountButton.
  ///
  /// In en, this message translates to:
  /// **'Create account'**
  String get createAccountButton;

  /// No description provided for @haveAccount.
  ///
  /// In en, this message translates to:
  /// **'Already have an account?'**
  String get haveAccount;

  /// No description provided for @signInLink.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get signInLink;

  /// No description provided for @verifyEmailTitle.
  ///
  /// In en, this message translates to:
  /// **'Verify your email'**
  String get verifyEmailTitle;

  /// No description provided for @verifyEmailSubtitle.
  ///
  /// In en, this message translates to:
  /// **'We sent a 6-digit code to {email}.'**
  String verifyEmailSubtitle(String email);

  /// No description provided for @otpLabel.
  ///
  /// In en, this message translates to:
  /// **'6-digit code'**
  String get otpLabel;

  /// No description provided for @verifyButton.
  ///
  /// In en, this message translates to:
  /// **'Verify'**
  String get verifyButton;

  /// No description provided for @resendCode.
  ///
  /// In en, this message translates to:
  /// **'Resend code'**
  String get resendCode;

  /// No description provided for @resendIn.
  ///
  /// In en, this message translates to:
  /// **'Resend in {seconds}s'**
  String resendIn(int seconds);

  /// No description provided for @codeResent.
  ///
  /// In en, this message translates to:
  /// **'A new code is on its way.'**
  String get codeResent;

  /// No description provided for @useAnotherAccount.
  ///
  /// In en, this message translates to:
  /// **'Use another account'**
  String get useAnotherAccount;

  /// No description provided for @forgotTitle.
  ///
  /// In en, this message translates to:
  /// **'Forgot your password?'**
  String get forgotTitle;

  /// No description provided for @forgotSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Enter your email and we\'ll send you a 6-digit code to reset it.'**
  String get forgotSubtitle;

  /// No description provided for @sendCodeButton.
  ///
  /// In en, this message translates to:
  /// **'Send code'**
  String get sendCodeButton;

  /// No description provided for @forgotSentNote.
  ///
  /// In en, this message translates to:
  /// **'If an account exists for {email}, a code is on its way.'**
  String forgotSentNote(String email);

  /// No description provided for @backToSignIn.
  ///
  /// In en, this message translates to:
  /// **'Back to sign in'**
  String get backToSignIn;

  /// No description provided for @resetCodeTitle.
  ///
  /// In en, this message translates to:
  /// **'Enter the reset code'**
  String get resetCodeTitle;

  /// No description provided for @continueButton.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get continueButton;

  /// No description provided for @resetTitle.
  ///
  /// In en, this message translates to:
  /// **'Choose a new password'**
  String get resetTitle;

  /// No description provided for @resetSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Use something you don\'t use on other sites.'**
  String get resetSubtitle;

  /// No description provided for @savePasswordButton.
  ///
  /// In en, this message translates to:
  /// **'Save new password'**
  String get savePasswordButton;

  /// No description provided for @resetSuccessTitle.
  ///
  /// In en, this message translates to:
  /// **'Password updated'**
  String get resetSuccessTitle;

  /// No description provided for @resetSuccessBody.
  ///
  /// In en, this message translates to:
  /// **'Your password was changed. Sign in with the new one.'**
  String get resetSuccessBody;

  /// No description provided for @homeGreeting.
  ///
  /// In en, this message translates to:
  /// **'Hi, {name}'**
  String homeGreeting(String name);

  /// No description provided for @homeSubtitle.
  ///
  /// In en, this message translates to:
  /// **'You\'re signed in. Refresh the page: the session stays.'**
  String get homeSubtitle;

  /// No description provided for @emailVerified.
  ///
  /// In en, this message translates to:
  /// **'Email verified'**
  String get emailVerified;

  /// No description provided for @memberSince.
  ///
  /// In en, this message translates to:
  /// **'Member since {date}'**
  String memberSince(String date);

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get signOut;

  /// No description provided for @homeChecklistTitle.
  ///
  /// In en, this message translates to:
  /// **'What this kit covers'**
  String get homeChecklistTitle;

  /// No description provided for @checkLogin.
  ///
  /// In en, this message translates to:
  /// **'Login with validation, loading and error states'**
  String get checkLogin;

  /// No description provided for @checkRegister.
  ///
  /// In en, this message translates to:
  /// **'Registration with a password-strength meter'**
  String get checkRegister;

  /// No description provided for @checkOtp.
  ///
  /// In en, this message translates to:
  /// **'Email verification by OTP with resend cooldown'**
  String get checkOtp;

  /// No description provided for @checkReset.
  ///
  /// In en, this message translates to:
  /// **'Forgot password → code → new password'**
  String get checkReset;

  /// No description provided for @checkPersist.
  ///
  /// In en, this message translates to:
  /// **'Session saved across restarts'**
  String get checkPersist;

  /// No description provided for @checkArchitecture.
  ///
  /// In en, this message translates to:
  /// **'Clean architecture + Cubit, tested'**
  String get checkArchitecture;

  /// No description provided for @inboxTitle.
  ///
  /// In en, this message translates to:
  /// **'Demo inbox'**
  String get inboxTitle;

  /// No description provided for @inboxSubtitle.
  ///
  /// In en, this message translates to:
  /// **'In a real app this arrives by email. Here it is shown on screen.'**
  String get inboxSubtitle;

  /// No description provided for @inboxEmpty.
  ///
  /// In en, this message translates to:
  /// **'No emails yet.'**
  String get inboxEmpty;

  /// No description provided for @inboxVerifySubject.
  ///
  /// In en, this message translates to:
  /// **'Your verification code'**
  String get inboxVerifySubject;

  /// No description provided for @inboxResetSubject.
  ///
  /// In en, this message translates to:
  /// **'Your password reset code'**
  String get inboxResetSubject;

  /// No description provided for @inboxUseCode.
  ///
  /// In en, this message translates to:
  /// **'Use code'**
  String get inboxUseCode;

  /// No description provided for @inboxTo.
  ///
  /// In en, this message translates to:
  /// **'To: {email}'**
  String inboxTo(String email);

  /// No description provided for @passwordRules.
  ///
  /// In en, this message translates to:
  /// **'8+ characters with upper and lower case letters and a number.'**
  String get passwordRules;

  /// No description provided for @strengthWeak.
  ///
  /// In en, this message translates to:
  /// **'Weak'**
  String get strengthWeak;

  /// No description provided for @strengthFair.
  ///
  /// In en, this message translates to:
  /// **'Fair'**
  String get strengthFair;

  /// No description provided for @strengthGood.
  ///
  /// In en, this message translates to:
  /// **'Good'**
  String get strengthGood;

  /// No description provided for @strengthStrong.
  ///
  /// In en, this message translates to:
  /// **'Strong'**
  String get strengthStrong;

  /// No description provided for @errEmailRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter your email.'**
  String get errEmailRequired;

  /// No description provided for @errEmailInvalid.
  ///
  /// In en, this message translates to:
  /// **'That email doesn\'t look right.'**
  String get errEmailInvalid;

  /// No description provided for @errPasswordRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter your password.'**
  String get errPasswordRequired;

  /// No description provided for @errPasswordShort.
  ///
  /// In en, this message translates to:
  /// **'Use at least 8 characters.'**
  String get errPasswordShort;

  /// No description provided for @errPasswordWeak.
  ///
  /// In en, this message translates to:
  /// **'Add upper and lower case letters and a number.'**
  String get errPasswordWeak;

  /// No description provided for @errNameRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter your name.'**
  String get errNameRequired;

  /// No description provided for @errNameShort.
  ///
  /// In en, this message translates to:
  /// **'Name is too short.'**
  String get errNameShort;

  /// No description provided for @errConfirmMismatch.
  ///
  /// In en, this message translates to:
  /// **'Passwords don\'t match.'**
  String get errConfirmMismatch;

  /// No description provided for @errOtpInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter the 6 digits.'**
  String get errOtpInvalid;

  /// No description provided for @failInvalidCredentials.
  ///
  /// In en, this message translates to:
  /// **'Email or password is incorrect.'**
  String get failInvalidCredentials;

  /// No description provided for @failEmailInUse.
  ///
  /// In en, this message translates to:
  /// **'An account with this email already exists.'**
  String get failEmailInUse;

  /// No description provided for @failWeakPassword.
  ///
  /// In en, this message translates to:
  /// **'Choose a stronger password.'**
  String get failWeakPassword;

  /// No description provided for @failInvalidCode.
  ///
  /// In en, this message translates to:
  /// **'That code isn\'t correct. {left} attempts left.'**
  String failInvalidCode(int left);

  /// No description provided for @failInvalidCodePlain.
  ///
  /// In en, this message translates to:
  /// **'That code isn\'t correct.'**
  String get failInvalidCodePlain;

  /// No description provided for @failCodeExpired.
  ///
  /// In en, this message translates to:
  /// **'This code expired. Request a new one.'**
  String get failCodeExpired;

  /// No description provided for @failTooManyAttempts.
  ///
  /// In en, this message translates to:
  /// **'Too many tries. Request a new code.'**
  String get failTooManyAttempts;

  /// No description provided for @failTooManyRequests.
  ///
  /// In en, this message translates to:
  /// **'Please wait a moment before trying again.'**
  String get failTooManyRequests;

  /// No description provided for @failNetwork.
  ///
  /// In en, this message translates to:
  /// **'No connection. Check your internet and try again.'**
  String get failNetwork;

  /// No description provided for @failSessionExpired.
  ///
  /// In en, this message translates to:
  /// **'Your session ended. Start again.'**
  String get failSessionExpired;

  /// No description provided for @failUnknown.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Please try again.'**
  String get failUnknown;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ar', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar':
      return AppLocalizationsAr();
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
