import 'package:material_ui/material_ui.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart' show DateFormat;

import '../../features/settings/settings_cubit.dart';
import '../config/app_services.dart';
import '../l10n/l10n.dart';
import '../theme/app_theme.dart';
import 'passport.dart';

/// Shared layout for every auth screen, styled as a passport:
/// the oxblood cover (brand) and a data page (the form) with its
/// machine-readable zone at the bottom.
/// Phone: a slim cover strip on top. Wide screens (≥ 960 px): cover on
/// one side, page on the other (mirrors automatically in Arabic).
class AuthScaffold extends StatelessWidget {
  const AuthScaffold({
    super.key,
    required this.title,
    required this.child,
    this.subtitle,
    this.code = 'AUTH',
    this.below,
    this.onBack,
  });

  final String title;
  final String? subtitle;

  /// Latin code printed in the page's MRZ line (e.g. `SIGN<IN`).
  final String code;
  final Widget child;

  /// Extra content under the page (e.g. the demo inbox).
  final Widget? below;
  final VoidCallback? onBack;

  static const wideBreakpoint = 960.0;

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= wideBreakpoint;
    final page = _PageColumn(
      title: title,
      subtitle: subtitle,
      code: code,
      below: below,
      onBack: onBack,
      wide: wide,
      child: child,
    );
    final paper = _SecurityPaper(child: page);

    return Scaffold(
      body: wide
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Expanded(flex: 5, child: _Cover()),
                Expanded(flex: 6, child: paper),
              ],
            )
          : _SecurityPaper(
              child: CustomScrollView(
                slivers: [
                  const SliverToBoxAdapter(child: CoverStrip()),
                  SliverToBoxAdapter(child: page),
                ],
              ),
            ),
    );
  }
}

/// Faint guilloché print behind the page.
class _SecurityPaper extends StatelessWidget {
  const _SecurityPaper({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme;
    final light = c.brightness == Brightness.light;
    return CustomPaint(
      painter: GuillochePainter(
        color: light ? const Color(0xFFB9C8BE) : const Color(0xFF2A3431),
        lines: 14,
        opacity: light ? .5 : .6,
      ),
      child: child,
    );
  }
}

class _PageColumn extends StatelessWidget {
  const _PageColumn({
    required this.title,
    required this.subtitle,
    required this.code,
    required this.child,
    required this.below,
    required this.onBack,
    required this.wide,
  });

  final String title;
  final String? subtitle;
  final String code;
  final Widget child;
  final Widget? below;
  final VoidCallback? onBack;
  final bool wide;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final c = theme.colorScheme;
    final isDemo = context.read<AppServices>().isDemo;
    final today = DateFormat('yyMMdd').format(DateTime.now());

    final content = Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 452),
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: wide ? 24 : 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (wide)
                const Padding(
                  padding: EdgeInsets.only(top: 24, bottom: 32),
                  child: Align(
                    alignment: AlignmentDirectional.centerEnd,
                    child: SettingsControls(),
                  ),
                )
              else
                const SizedBox(height: 16),
              // Semantics container (like Card) keeps the form's a11y nodes
              // stable; without it Flutter web re-creates the focused input.
              Semantics(
                container: true,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: c.surface,
                    borderRadius: BorderRadius.circular(AppRadii.page),
                    border: Border.all(color: c.outlineVariant),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.ink.withValues(
                          alpha: c.brightness == Brightness.light ? .07 : .3,
                        ),
                        offset: const Offset(0, 1),
                        blurRadius: 0,
                      ),
                    ],
                  ),
                  child: Padding(
                    padding: EdgeInsets.zero,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Padding(
                          padding: EdgeInsets.fromLTRB(wide ? 32 : 20, 20, wide ? 32 : 20, 28),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              if (onBack != null || isDemo)
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: Row(
                                    children: [
                                      if (onBack != null)
                                        IconButton(
                                          tooltip: MaterialLocalizations.of(
                                            context,
                                          ).backButtonTooltip,
                                          onPressed: onBack,
                                          style: IconButton.styleFrom(
                                            side: BorderSide(color: c.outlineVariant),
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(AppRadii.button),
                                            ),
                                          ),
                                          icon: const BackButtonIcon(),
                                        ),
                                      const Spacer(),
                                      if (isDemo) const DemoChip(),
                                    ],
                                  ),
                                ),
                              Semantics(
                                header: true,
                                child: Text(title, style: theme.textTheme.headlineSmall),
                              ),
                              if (subtitle != null) ...[
                                const SizedBox(height: 4),
                                Text(
                                  subtitle!,
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    color: c.onSurfaceVariant,
                                  ),
                                ),
                              ],
                              const SizedBox(height: 24),
                              child,
                            ],
                          ),
                        ),
                        // Machine-readable zone: the page's signature detail.
                        Container(
                          decoration: BoxDecoration(
                            color: c.surfaceContainer,
                            borderRadius: const BorderRadius.vertical(
                              bottom: Radius.circular(AppRadii.page - 1),
                            ),
                          ),
                          padding: EdgeInsets.fromLTRB(wide ? 32 : 20, 10, wide ? 32 : 20, 12),
                          child: MrzBlock(
                            lines: ['P<EGYAUTH<KIT<<$code', 'NB$today<<FLUTTER<BLOC<CLEAN<ARCH'],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              if (below != null) ...[const SizedBox(height: 16), below!],
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
    if (!wide) return content;
    // Wide screens: vertically centered, still scrollable on short windows.
    return LayoutBuilder(
      builder: (context, box) => SingleChildScrollView(
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: box.maxHeight),
          child: Center(child: content),
        ),
      ),
    );
  }
}

/// The passport cover: oxblood with a foil frame and emblem.
class _Cover extends StatelessWidget {
  const _Cover();

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    const ivory = Color(0xFFF6EEE2);
    final points = [l10n.brandPoint1, l10n.brandPoint2, l10n.brandPoint3, l10n.brandPoint4];
    return ColoredBox(
      color: AppColors.cover,
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: DecoratedBox(
          decoration: BoxDecoration(
            border: Border.all(color: AppColors.foil.withValues(alpha: .55), width: 1),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(40, 36, 40, 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const FoilEmblem(size: 56),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l10n.appName,
                            style: const TextStyle(
                              fontFamily: AppFonts.display,
                              fontFamilyFallback: [AppFonts.text],
                              color: AppColors.foil,
                              fontSize: 24,
                              fontWeight: FontWeight.w800,
                              height: 1.3,
                            ),
                          ),
                          Text(
                            l10n.coverIssuer,
                            style: TextStyle(
                              color: AppColors.foil.withValues(alpha: .85),
                              fontSize: 13.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const Spacer(flex: 3),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 440),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.brandHeadline,
                        style: const TextStyle(
                          fontFamily: AppFonts.display,
                          fontFamilyFallback: [AppFonts.text],
                          color: ivory,
                          fontSize: 34,
                          fontWeight: FontWeight.w800,
                          height: 1.45,
                        ),
                      ),
                      const SizedBox(height: 14),
                      Text(
                        l10n.brandBody,
                        style: TextStyle(
                          color: ivory.withValues(alpha: .78),
                          fontSize: 15.5,
                          height: 1.75,
                        ),
                      ),
                      const SizedBox(height: 26),
                      for (final p in points)
                        Container(
                          padding: const EdgeInsets.symmetric(vertical: 11),
                          decoration: BoxDecoration(
                            border: Border(
                              top: BorderSide(color: AppColors.foil.withValues(alpha: .3)),
                            ),
                          ),
                          child: Row(
                            children: [
                              Transform.rotate(
                                angle: .785,
                                child: Container(width: 7, height: 7, color: AppColors.foil),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Text(
                                  p,
                                  style: const TextStyle(
                                    color: ivory,
                                    fontSize: 15,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
                const Spacer(flex: 2),
                Text(
                  l10n.brandName,
                  style: TextStyle(
                    color: AppColors.foil.withValues(alpha: .8),
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Phone header: a slim strip of the cover.
class CoverStrip extends StatelessWidget {
  const CoverStrip({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.cover,
      padding: EdgeInsets.fromLTRB(16, MediaQuery.paddingOf(context).top + 12, 12, 12),
      child: Center(
        child: ConstrainedBox(
          // On the wide home page the strip lines up with the content.
          constraints: const BoxConstraints(maxWidth: 600),
          child: Row(
            children: [
              const FoilEmblem(size: 36),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  context.l10n.appName,
                  style: const TextStyle(
                    fontFamily: AppFonts.display,
                    fontFamilyFallback: [AppFonts.text],
                    color: AppColors.foil,
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SettingsControls(onDark: true),
            ],
          ),
        ),
      ),
    );
  }
}

/// Language + theme switches, used on every screen.
class SettingsControls extends StatelessWidget {
  const SettingsControls({super.key, this.onDark = false});

  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final settings = context.watch<SettingsCubit>().state;
    final fg = onDark ? const Color(0xFFF6EEE2) : Theme.of(context).colorScheme.onSurface;
    final icon = switch (settings.themeMode) {
      ThemeMode.light => Icons.light_mode_outlined,
      ThemeMode.dark => Icons.dark_mode_outlined,
      ThemeMode.system => Icons.brightness_auto_outlined,
    };
    final themeName = switch (settings.themeMode) {
      ThemeMode.light => l10n.themeLight,
      ThemeMode.dark => l10n.themeDark,
      ThemeMode.system => l10n.themeSystem,
    };
    final side = BorderSide(color: fg.withValues(alpha: .3));
    final shape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.button));
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        OutlinedButton(
          key: const Key('toggle-language'),
          style: OutlinedButton.styleFrom(
            foregroundColor: fg,
            side: side,
            shape: shape,
            minimumSize: const Size(0, 40),
            padding: const EdgeInsets.symmetric(horizontal: 14),
          ),
          onPressed: () => context.read<SettingsCubit>().toggleLocale(),
          child: Text(l10n.languageToggle),
        ),
        const SizedBox(width: 8),
        IconButton.outlined(
          key: const Key('toggle-theme'),
          tooltip: '${l10n.themeTooltip}: $themeName',
          style: IconButton.styleFrom(foregroundColor: fg, side: side, shape: shape),
          onPressed: () => context.read<SettingsCubit>().cycleTheme(),
          icon: Icon(icon, size: 20),
        ),
      ],
    );
  }
}

/// "Demo" marker: a small rectangular rubber stamp, not a pill.
class DemoChip extends StatelessWidget {
  const DemoChip({super.key});

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme;
    final ink = c.brightness == Brightness.light
        ? const Color(0xFF94600F)
        : const Color(0xFFE2B15C);
    return Tooltip(
      message: context.l10n.demoModeNote,
      child: Transform.rotate(
        angle: -.04,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 1),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(2),
            border: Border.all(color: ink, width: 1.4),
          ),
          child: Text(
            context.l10n.demoBadge,
            style: TextStyle(color: ink, fontWeight: FontWeight.w700, fontSize: 12.5),
          ),
        ),
      ),
    );
  }
}
