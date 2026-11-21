import 'package:material_ui/material_ui.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart' show DateFormat;

import '../../../../core/config/app_services.dart';
import '../../../../core/l10n/l10n.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/auth_scaffold.dart';
import '../../../../core/widgets/passport.dart';
import '../../domain/auth_user.dart';
import '../session/auth_session_cubit.dart';

/// The protected screen: only reachable with a verified session.
/// The reward for signing in is the member's card, stamped "verified".
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
    final checks = [
      l10n.checkLogin,
      l10n.checkRegister,
      l10n.checkOtp,
      l10n.checkReset,
      l10n.checkPersist,
      l10n.checkArchitecture,
    ];

    return Scaffold(
      body: CustomPaint(
        painter: GuillochePainter(
          color: c.brightness == Brightness.light
              ? const Color(0xFFB9C8BE)
              : const Color(0xFF2A3431),
          lines: 14,
        ),
        child: CustomScrollView(
          slivers: [
            const SliverToBoxAdapter(child: CoverStrip()),
            SliverToBoxAdapter(
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 600),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 28, 16, 40),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Semantics(
                                header: true,
                                child: Text(
                                  l10n.homeGreeting(user.name),
                                  key: const Key('home-greeting'),
                                  style: theme.textTheme.headlineSmall,
                                ),
                              ),
                            ),
                            if (context.read<AppServices>().isDemo)
                              const Padding(padding: EdgeInsets.only(top: 8), child: DemoChip()),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(l10n.homeSubtitle, style: TextStyle(color: c.onSurfaceVariant)),
                        const SizedBox(height: 22),
                        _MemberCard(user: user, since: since),
                        const SizedBox(height: 14),
                        Wrap(
                          spacing: 18,
                          runSpacing: 6,
                          children: [
                            if (user.emailVerified)
                              _Fact(
                                icon: Icons.check_rounded,
                                text: l10n.emailVerified,
                                color: c.secondary,
                              ),
                            _Fact(
                              icon: Icons.event_outlined,
                              text: l10n.memberSince(since),
                              color: c.onSurfaceVariant,
                            ),
                          ],
                        ),
                        const SizedBox(height: 32),
                        Text(
                          l10n.homeChecklistTitle,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontFamily: AppFonts.display,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 8),
                        for (final item in checks)
                          Container(
                            padding: const EdgeInsets.symmetric(vertical: 11),
                            decoration: BoxDecoration(
                              border: Border(top: BorderSide(color: c.outlineVariant)),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.check_rounded, color: c.secondary, size: 18),
                                const SizedBox(width: 12),
                                Expanded(child: Text(item)),
                              ],
                            ),
                          ),
                        const SizedBox(height: 24),
                        Align(
                          alignment: AlignmentDirectional.centerStart,
                          child: OutlinedButton.icon(
                            key: const Key('sign-out'),
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(0, 46),
                              padding: const EdgeInsets.symmetric(horizontal: 20),
                            ),
                            onPressed: () => context.read<AuthSessionCubit>().signOut(),
                            icon: const Icon(Icons.logout_rounded, size: 20),
                            label: Text(l10n.signOut),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// ID-1 style membership card: oxblood band, holder fields, MRZ,
/// and an ink stamp that lands when the card first appears.
class _MemberCard extends StatelessWidget {
  const _MemberCard({required this.user, required this.since});

  final AuthUser user;
  final String since;

  /// Stable, human-looking member number from the user id.
  static String memberNo(String id) {
    var h = 0;
    for (final unit in id.codeUnits) {
      h = (h * 31 + unit) & 0x7fffffff;
    }
    return 'NB-${(h % 900000 + 100000)}';
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = Theme.of(context).colorScheme;
    final light = c.brightness == Brightness.light;
    final number = memberNo(user.id);
    final issued = DateFormat('yyMMdd').format(user.createdAt);
    final mrzName = user.email.split('@').first;

    Widget field(String label, String value, {bool ltr = false, Key? key}) => Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: c.onSurfaceVariant, fontSize: 12)),
          Text(
            value,
            key: key,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textDirection: ltr ? TextDirection.ltr : null,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, height: 1.4),
          ),
        ],
      ),
    );

    return Semantics(
      container: true,
      label: l10n.cardTitle,
      child: Container(
        decoration: BoxDecoration(
          color: light ? Colors.white : c.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: c.outlineVariant),
          boxShadow: [
            BoxShadow(
              color: AppColors.coverDeep.withValues(alpha: light ? .14 : .4),
              offset: const Offset(0, 14),
              blurRadius: 30,
              spreadRadius: -12,
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              color: AppColors.cover,
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 12),
              child: Row(
                children: [
                  const FoilEmblem(size: 28),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      l10n.cardTitle,
                      style: const TextStyle(
                        fontFamily: AppFonts.display,
                        fontFamilyFallback: [AppFonts.text],
                        color: AppColors.foil,
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                      ),
                    ),
                  ),
                  Text(
                    l10n.appName,
                    style: TextStyle(color: AppColors.foil.withValues(alpha: .8), fontSize: 13),
                  ),
                ],
              ),
            ),
            Stack(
              children: [
                Positioned.fill(
                  child: CustomPaint(
                    painter: GuillochePainter(
                      color: light ? const Color(0xFFE2C9C9) : const Color(0xFF3A2A2D),
                      lines: 6,
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(18, 16, 18, 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            field(l10n.cardHolder, user.name),
                            field(l10n.cardEmail, user.email, ltr: true),
                            Wrap(
                              spacing: 28,
                              children: [
                                field(
                                  l10n.cardNumber,
                                  number,
                                  ltr: true,
                                  key: const Key('member-no'),
                                ),
                                field(l10n.cardIssued, since),
                              ],
                            ),
                          ],
                        ),
                      ),
                      if (user.emailVerified)
                        Padding(
                          padding: const EdgeInsetsDirectional.only(start: 8, top: 6),
                          child: InkStamp(
                            text: l10n.stampVerified,
                            date: DateFormat('dd.MM.yyyy').format(DateTime.now()),
                            color: light ? AppColors.verified : c.secondary,
                            size: 96,
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            Container(
              color: c.surfaceContainer,
              padding: const EdgeInsets.fromLTRB(18, 8, 18, 10),
              child: MrzBlock(
                lines: [
                  'IDEGY${number.replaceAll('-', '')}<<$mrzName',
                  '$issued<<AUTH<KIT<<NEGAD<BUILDS',
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact({required this.icon, required this.text, required this.color});

  final IconData icon;
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, size: 18, color: color),
      const SizedBox(width: 6),
      Text(
        text,
        style: TextStyle(color: color, fontWeight: FontWeight.w500, fontSize: 13.5),
      ),
    ],
  );
}
