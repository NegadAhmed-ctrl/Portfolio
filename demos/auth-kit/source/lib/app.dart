import 'package:material_ui/material_ui.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:cupertino_ui/cupertino_ui.dart' show GlobalCupertinoLocalizations;
import 'package:flutter_localizations/flutter_localizations.dart' show GlobalWidgetsLocalizations;
import 'package:go_router/go_router.dart';

import 'core/config/app_services.dart';
import 'core/l10n/l10n.dart';
import 'core/routing/app_router.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/presentation/session/auth_session_cubit.dart';
import 'features/settings/settings_cubit.dart';

class AuthKitApp extends StatelessWidget {
  const AuthKitApp({super.key, required this.services, this.initialLocale});

  final AppServices services;
  final Locale? initialLocale;

  @override
  Widget build(BuildContext context) {
    return RepositoryProvider.value(
      value: services,
      child: MultiBlocProvider(
        providers: [
          BlocProvider(
            create: (_) =>
                SettingsCubit(services.store, fallbackLocale: initialLocale)..load(),
          ),
          BlocProvider(create: (_) => AuthSessionCubit(services.auth)..start()),
        ],
        child: const _RouterHost(),
      ),
    );
  }
}

class _RouterHost extends StatefulWidget {
  const _RouterHost();

  @override
  State<_RouterHost> createState() => _RouterHostState();
}

class _RouterHostState extends State<_RouterHost> {
  late final GoRouter _router = buildRouter(context.read<AuthSessionCubit>());

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<SettingsCubit>().state;
    return MaterialApp.router(
      onGenerateTitle: (context) => '${context.l10n.appName} · Negad Builds',
      debugShowCheckedModeBanner: false,
      locale: settings.locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      themeMode: settings.themeMode,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      routerConfig: _router,
    );
  }
}
