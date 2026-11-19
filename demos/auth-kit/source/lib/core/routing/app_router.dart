import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/forgot/forgot_password_page.dart';
import '../../features/auth/presentation/home/home_page.dart';
import '../../features/auth/presentation/login/login_page.dart';
import '../../features/auth/presentation/register/register_page.dart';
import '../../features/auth/presentation/reset/reset_password_page.dart';
import '../../features/auth/presentation/session/auth_session_cubit.dart';
import '../../features/auth/presentation/session/splash_page.dart';
import '../../features/auth/presentation/verify/otp_cubit.dart';
import '../../features/auth/presentation/verify/verify_code_page.dart';

abstract final class Routes {
  static const splash = '/splash';
  static const login = '/login';
  static const register = '/register';
  static const verifyEmail = '/verify-email';
  static const forgot = '/forgot';
  static const forgotCode = '/forgot/code';
  static const reset = '/reset';
  static const resetDone = '/reset/done';
  static const home = '/home';

  static const public = {login, register, forgot, forgotCode, reset, resetDone};
}

/// Pure redirect rule, unit-tested. Screens never push after sign-in/out:
/// the session changes and this function moves the user.
String? authRedirect(AuthSessionState session, Uri location) {
  final path = location.path;
  switch (session.status) {
    case SessionStatus.unknown:
      return path == Routes.splash
          ? null
          : Uri(path: Routes.splash, queryParameters: {'from': location.toString()}).toString();
    case SessionStatus.unauthenticated:
      if (Routes.public.contains(path)) return null;
      if (path == Routes.splash) {
        final from = Uri.tryParse(location.queryParameters['from'] ?? '');
        return from != null && Routes.public.contains(from.path) ? from.toString() : Routes.login;
      }
      return Routes.login;
    case SessionStatus.authenticated:
      if (session.needsVerification) {
        return path == Routes.verifyEmail ? null : Routes.verifyEmail;
      }
      return path == Routes.home ? null : Routes.home;
  }
}

GoRouter buildRouter(AuthSessionCubit session) => GoRouter(
      initialLocation: Routes.login,
      refreshListenable: _StreamListenable(session.stream),
      redirect: (context, state) => authRedirect(session.state, state.uri),
      routes: [
        GoRoute(path: Routes.splash, builder: (_, _) => const SplashPage()),
        GoRoute(path: Routes.login, builder: (_, _) => const LoginPage()),
        GoRoute(path: Routes.register, builder: (_, _) => const RegisterPage()),
        GoRoute(
          path: Routes.verifyEmail,
          builder: (_, _) => const VerifyCodePage(purpose: OtpPurpose.verifyEmail),
        ),
        GoRoute(
          path: Routes.forgot,
          builder: (_, s) => ForgotPasswordPage(initialEmail: s.uri.queryParameters['email'] ?? ''),
        ),
        GoRoute(
          path: Routes.forgotCode,
          redirect: (_, s) => (s.uri.queryParameters['email'] ?? '').isEmpty ? Routes.forgot : null,
          builder: (_, s) => VerifyCodePage(
            purpose: OtpPurpose.resetPassword,
            email: s.uri.queryParameters['email']!,
          ),
        ),
        GoRoute(
          path: Routes.reset,
          // The one-time token only lives in memory: a refresh restarts the flow.
          redirect: (_, s) => s.extra is String ? null : Routes.forgot,
          builder: (_, s) => ResetPasswordPage(resetToken: s.extra! as String),
        ),
        GoRoute(path: Routes.resetDone, builder: (_, _) => const ResetSuccessPage()),
        GoRoute(path: Routes.home, builder: (_, _) => const HomePage()),
      ],
    );

class _StreamListenable extends ChangeNotifier {
  _StreamListenable(Stream<dynamic> stream) {
    _sub = stream.listen((_) => notifyListeners());
  }

  late final StreamSubscription<dynamic> _sub;

  @override
  void dispose() {
    _sub.cancel();
    super.dispose();
  }
}
