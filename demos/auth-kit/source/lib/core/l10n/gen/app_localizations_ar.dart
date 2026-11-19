// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class AppLocalizationsAr extends AppLocalizations {
  AppLocalizationsAr([String locale = 'ar']) : super(locale);

  @override
  String get appName => 'Auth Kit';

  @override
  String get brandName => 'Negad Builds';

  @override
  String get demoBadge => 'ديمو';

  @override
  String get demoModeNote =>
      'وضع الديمو: الحسابات بتتحفظ في المتصفح ده بس، ومفيش إيميلات حقيقية بتتبعت.';

  @override
  String get languageToggle => 'English';

  @override
  String get themeTooltip => 'تغيير المظهر';

  @override
  String get themeLight => 'فاتح';

  @override
  String get themeDark => 'داكن';

  @override
  String get themeSystem => 'حسب الجهاز';

  @override
  String get loading => 'لحظة من فضلك…';

  @override
  String get brandHeadline => 'تسجيل دخول آمن وجاهز لتطبيقك';

  @override
  String get brandBody =>
      'دخول، وإنشاء حساب، وتأكيد الإيميل، واسترجاع كلمة السر. متبني مرة واحدة بهيكلة نظيفة وبيتركّب في أي مشروع.';

  @override
  String get brandPoint1 => 'إيميل وكلمة سر مع تحقق فوري';

  @override
  String get brandPoint2 => 'تأكيد الإيميل بكود من 6 أرقام';

  @override
  String get brandPoint3 => 'استرجاع كلمة السر بكود بدل لينكات بتضيع';

  @override
  String get brandPoint4 => 'عربي وإنجليزي، فاتح وداكن';

  @override
  String get emailLabel => 'الإيميل';

  @override
  String get emailHint => 'name@example.com';

  @override
  String get passwordLabel => 'كلمة السر';

  @override
  String get nameLabel => 'الاسم بالكامل';

  @override
  String get nameHint => 'اسمك';

  @override
  String get confirmPasswordLabel => 'تأكيد كلمة السر';

  @override
  String get newPasswordLabel => 'كلمة السر الجديدة';

  @override
  String get showPassword => 'إظهار كلمة السر';

  @override
  String get hidePassword => 'إخفاء كلمة السر';

  @override
  String get loginTitle => 'أهلاً بيك تاني';

  @override
  String get loginSubtitle => 'سجّل دخولك عشان تكمل.';

  @override
  String get forgotPasswordLink => 'نسيت كلمة السر؟';

  @override
  String get signInButton => 'تسجيل الدخول';

  @override
  String get noAccount => 'أول مرة هنا؟';

  @override
  String get createAccountLink => 'اعمل حساب';

  @override
  String get useDemoAccount => 'املأ حساب الديمو';

  @override
  String demoAccountHint(String email, String password) {
    return 'حساب الديمو: $email / $password';
  }

  @override
  String get registerTitle => 'اعمل حسابك';

  @override
  String get registerSubtitle => 'مش هياخد منك دقيقة.';

  @override
  String get createAccountButton => 'إنشاء الحساب';

  @override
  String get haveAccount => 'عندك حساب؟';

  @override
  String get signInLink => 'سجّل دخول';

  @override
  String get verifyEmailTitle => 'أكّد إيميلك';

  @override
  String verifyEmailSubtitle(String email) {
    return 'بعتنا كود من 6 أرقام على $email.';
  }

  @override
  String get otpLabel => 'الكود (6 أرقام)';

  @override
  String get verifyButton => 'تأكيد';

  @override
  String get resendCode => 'ابعت الكود تاني';

  @override
  String resendIn(int seconds) {
    return 'إعادة الإرسال بعد $seconds ث';
  }

  @override
  String get codeResent => 'كود جديد في الطريق.';

  @override
  String get useAnotherAccount => 'استخدم حساب تاني';

  @override
  String get forgotTitle => 'نسيت كلمة السر؟';

  @override
  String get forgotSubtitle =>
      'اكتب إيميلك وهنبعتلك كود من 6 أرقام تغيّر بيه كلمة السر.';

  @override
  String get sendCodeButton => 'ابعت الكود';

  @override
  String forgotSentNote(String email) {
    return 'لو فيه حساب بالإيميل $email، الكود في الطريق.';
  }

  @override
  String get backToSignIn => 'رجوع لتسجيل الدخول';

  @override
  String get resetCodeTitle => 'اكتب كود الاسترجاع';

  @override
  String get continueButton => 'متابعة';

  @override
  String get resetTitle => 'اختار كلمة سر جديدة';

  @override
  String get resetSubtitle => 'اختار كلمة سر مش بتستخدمها في مواقع تانية.';

  @override
  String get savePasswordButton => 'حفظ كلمة السر';

  @override
  String get resetSuccessTitle => 'كلمة السر اتغيرت';

  @override
  String get resetSuccessBody => 'تم تغيير كلمة السر. سجّل دخولك بالجديدة.';

  @override
  String homeGreeting(String name) {
    return 'أهلاً يا $name';
  }

  @override
  String get homeSubtitle =>
      'إنت مسجّل دخول. اعمل Refresh للصفحة: الجلسة هتفضل موجودة.';

  @override
  String get emailVerified => 'الإيميل متأكد';

  @override
  String memberSince(String date) {
    return 'عضو من $date';
  }

  @override
  String get signOut => 'تسجيل الخروج';

  @override
  String get homeChecklistTitle => 'الكيت ده فيه إيه';

  @override
  String get checkLogin => 'دخول مع تحقق وحالات تحميل وأخطاء واضحة';

  @override
  String get checkRegister => 'إنشاء حساب مع مقياس قوة كلمة السر';

  @override
  String get checkOtp => 'تأكيد الإيميل بكود OTP مع مهلة لإعادة الإرسال';

  @override
  String get checkReset => 'نسيت كلمة السر ← كود ← كلمة سر جديدة';

  @override
  String get checkPersist => 'الجلسة بتتحفظ بعد قفل التطبيق';

  @override
  String get checkArchitecture => 'Clean architecture + Cubit وعليه tests';

  @override
  String get inboxTitle => 'صندوق رسايل الديمو';

  @override
  String get inboxSubtitle =>
      'في التطبيق الحقيقي ده بيوصل على الإيميل. هنا بيظهر على الشاشة.';

  @override
  String get inboxEmpty => 'مفيش رسايل لسه.';

  @override
  String get inboxVerifySubject => 'كود تأكيد الإيميل';

  @override
  String get inboxResetSubject => 'كود استرجاع كلمة السر';

  @override
  String get inboxUseCode => 'استخدم الكود';

  @override
  String inboxTo(String email) {
    return 'إلى: $email';
  }

  @override
  String get passwordRules =>
      '8 حروف أو أكتر، فيها حرف كابيتال وحرف سمول ورقم.';

  @override
  String get strengthWeak => 'ضعيفة';

  @override
  String get strengthFair => 'مقبولة';

  @override
  String get strengthGood => 'كويسة';

  @override
  String get strengthStrong => 'قوية';

  @override
  String get errEmailRequired => 'اكتب الإيميل.';

  @override
  String get errEmailInvalid => 'الإيميل ده شكله مش مظبوط.';

  @override
  String get errPasswordRequired => 'اكتب كلمة السر.';

  @override
  String get errPasswordShort => 'استخدم 8 حروف على الأقل.';

  @override
  String get errPasswordWeak => 'زوّد حرف كابيتال وحرف سمول ورقم.';

  @override
  String get errNameRequired => 'اكتب اسمك.';

  @override
  String get errNameShort => 'الاسم قصير.';

  @override
  String get errConfirmMismatch => 'كلمتين السر مش زي بعض.';

  @override
  String get errOtpInvalid => 'اكتب الـ 6 أرقام.';

  @override
  String get failInvalidCredentials => 'الإيميل أو كلمة السر غلط.';

  @override
  String get failEmailInUse => 'فيه حساب بالإيميل ده بالفعل.';

  @override
  String get failWeakPassword => 'اختار كلمة سر أقوى.';

  @override
  String failInvalidCode(int left) {
    return 'الكود مش صحيح. فاضل $left محاولات.';
  }

  @override
  String get failInvalidCodePlain => 'الكود مش صحيح.';

  @override
  String get failCodeExpired => 'الكود ده انتهى. اطلب كود جديد.';

  @override
  String get failTooManyAttempts => 'محاولات كتير. اطلب كود جديد.';

  @override
  String get failTooManyRequests => 'استنى لحظة قبل ما تحاول تاني.';

  @override
  String get failNetwork => 'مفيش إنترنت. اتأكد من الاتصال وجرّب تاني.';

  @override
  String get failSessionExpired => 'الجلسة انتهت. ابدأ من الأول.';

  @override
  String get failUnknown => 'حصلت مشكلة. جرّب تاني.';
}
