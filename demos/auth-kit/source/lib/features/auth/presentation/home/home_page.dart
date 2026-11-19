import 'package:material_ui/material_ui.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart' show DateFormat;

import '../../../../core/config/app_services.dart';
import '../../../../core/l10n/l10n.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/auth_scaffold.dart';
import '../session/auth_session_cubit.dart';

/// The protected screen: only reachable with a verified session.
class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final user = context.select((AuthSessionCubit c) => c.state.user);
    if (user == null) return const SizedBox.shrink(); // router is redirecting
    final theme = Theme.of(context);
    final c = theme.colorScheme;
    final locale = Localizations.localeOf(context).toLanguageTag();
    final since = DateFormat.yMMMM(locale).format(user.createdAt);
    final initials = user.name.trim().split(RegExp(r'\s+')).take(2).map((w) => w.characters.first).join();
    final checks = [
      l10n.checkLogin,
      l10n.checkRegister,
      l10n.checkOtp,
      l10n.checkReset,
      l10n.checkPersist,
      l10n.checkArchitecture,
    ];

    return Scaffold(
      body: CustomScrollView(slivers: [
        SliverToBoxAdapter(
          child: Container(
            decoration: const BoxDecoration(
              gradient: AppColors.brandGradient,
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
            ),
            padding: EdgeInsets.fromLTRB(16, MediaQuery.paddingOf(context).top + 14, 12, 72),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 720),
                child: Row(children: [
                  const Icon(Icons.shield_rounded, color: Colors.white),
                  const SizedBox(width: 8),
                  Text(l10n.appName,
                      style: const TextStyle(
                          color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                  const Spacer(),
                  const SettingsControls(onDark: true),
                ]),
              ),
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Transform.translate(
            offset: const Offset(0, -52),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 720),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Row(children: [
                            CircleAvatar(
                              radius: 30,
                              backgroundColor: c.primaryContainer,
                              child: Text(initials.toUpperCase(),
                                  style: TextStyle(
                                      color: c.onPrimaryContainer,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 20)),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Semantics(
                                  header: true,
                                  child: Text(l10n.homeGreeting(user.name),
                                      key: const Key('home-greeting'),
                                      style: theme.textTheme.headlineSmall),
                                ),
                                Text(user.email,
                                    textDirection: TextDirection.ltr,
                                    style: TextStyle(color: c.onSurfaceVariant)),
                              ]),
                            ),
                            if (context.read<AppServices>().isDemo) const DemoChip(),
                          ]),
                          const SizedBox(height: 16),
                          Wrap(spacing: 8, runSpacing: 8, children: [
                            if (user.emailVerified)
                              _Pill(
                                  icon: Icons.verified_rounded,
                                  text: l10n.emailVerified,
                                  color: AppColors.success),
                            _Pill(
                                icon: Icons.calendar_month_rounded,
                                text: l10n.memberSince(since),
                                color: c.primary),
                          ]),
                          const SizedBox(height: 14),
                          Text(l10n.homeSubtitle, style: TextStyle(color: c.onSurfaceVariant)),
                        ]),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(24, 22, 24, 14),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(l10n.homeChecklistTitle, style: theme.textTheme.titleMedium),
                          const SizedBox(height: 10),
                          for (final item in checks)
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 7),
                              child: Row(children: [
                                const Icon(Icons.check_circle_rounded,
                                    color: AppColors.success, size: 20),
                                const SizedBox(width: 10),
                                Expanded(child: Text(item)),
                              ]),
                            ),
                        ]),
                      ),
                    ),
                    const SizedBox(height: 20),
                    OutlinedButton.icon(
                      key: const Key('sign-out'),
                      onPressed: () => context.read<AuthSessionCubit>().signOut(),
                      icon: const Icon(Icons.logout_rounded, size: 20),
                      label: Text(l10n.signOut),
                    ),
                  ]),
                ),
              ),
            ),
          ),
        ),
      ]),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.icon, required this.text, required this.color});

  final IconData icon;
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: color.withValues(alpha: .12),
          borderRadius: BorderRadius.circular(99),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 6),
          Text(text, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 13)),
        ]),
      );
}
