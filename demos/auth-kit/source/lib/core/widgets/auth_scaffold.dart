import 'package:material_ui/material_ui.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../features/settings/settings_cubit.dart';
import '../config/app_services.dart';
import '../l10n/l10n.dart';
import '../theme/app_theme.dart';

/// Shared layout for every auth screen.
/// Phone: gradient header + form. Wide screens (≥ 960 px): brand panel
/// on one side, form on the other (mirrors automatically in Arabic).
class AuthScaffold extends StatelessWidget {
  const AuthScaffold({
    super.key,
    required this.title,
    required this.child,
    this.subtitle,
    this.icon = Icons.lock_person_rounded,
    this.below,
    this.onBack,
  });

  final String title;
  final String? subtitle;
  final IconData icon;
  final Widget child;

  /// Extra content under the form card (e.g. the demo inbox).
  final Widget? below;
  final VoidCallback? onBack;

  static const wideBreakpoint = 960.0;

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= wideBreakpoint;
    final form = _FormColumn(
      title: title,
      subtitle: subtitle,
      icon: icon,
      below: below,
      onBack: onBack,
      showControls: wide,
      child: child,
    );

    return Scaffold(
      body: wide
          ? Row(children: [
              const Expanded(flex: 5, child: _BrandPanel()),
              Expanded(flex: 6, child: form),
            ])
          : CustomScrollView(slivers: [
              const SliverToBoxAdapter(child: _CompactHeader()),
              SliverToBoxAdapter(
                child: Transform.translate(offset: const Offset(0, -28), child: form),
              ),
            ]),
    );
  }
}

class _FormColumn extends StatelessWidget {
  const _FormColumn({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.child,
    required this.below,
    required this.onBack,
    required this.showControls,
  });

  final String title;
  final String? subtitle;
  final IconData icon;
  final Widget child;
  final Widget? below;
  final VoidCallback? onBack;
  final bool showControls;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final c = theme.colorScheme;
    final content = Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 460),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            if (showControls)
              const Padding(
                padding: EdgeInsets.only(top: 20, bottom: 28),
                child: Align(alignment: AlignmentDirectional.centerEnd, child: SettingsControls()),
              ),
            Card(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 28),
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Row(children: [
                    if (onBack != null) ...[
                      IconButton.filledTonal(
                        tooltip: MaterialLocalizations.of(context).backButtonTooltip,
                        onPressed: onBack,
                        icon: const BackButtonIcon(),
                      ),
                      const SizedBox(width: 12),
                    ],
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: c.primaryContainer,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(icon, color: c.onPrimaryContainer),
                    ),
                    const Spacer(),
                    if (context.read<AppServices>().isDemo) const DemoChip(),
                  ]),
                  const SizedBox(height: 18),
                  Semantics(
                    header: true,
                    child: Text(title, style: theme.textTheme.headlineSmall),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 6),
                    Text(subtitle!,
                        style: theme.textTheme.bodyMedium?.copyWith(color: c.onSurfaceVariant)),
                  ],
                  const SizedBox(height: 24),
                  child,
                ]),
              ),
            ),
            if (below != null) ...[const SizedBox(height: 16), below!],
            const SizedBox(height: 32),
          ]),
        ),
      ),
    );
    if (!showControls) return content;
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

class _BrandPanel extends StatelessWidget {
  const _BrandPanel();

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    const white = Colors.white;
    final points = [l10n.brandPoint1, l10n.brandPoint2, l10n.brandPoint3, l10n.brandPoint4];
    return DecoratedBox(
      decoration: const BoxDecoration(gradient: AppColors.brandGradient),
      child: Stack(children: [
        const Positioned.fill(child: CustomPaint(painter: _DotsPainter())),
        Padding(
          padding: const EdgeInsets.fromLTRB(48, 40, 48, 36),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const _Logo(),
            const Spacer(),
            Text(l10n.brandHeadline,
                style: const TextStyle(
                    color: white, fontSize: 38, fontWeight: FontWeight.w800, height: 1.25)),
            const SizedBox(height: 16),
            Text(l10n.brandBody,
                style: TextStyle(color: white.withValues(alpha: .82), fontSize: 16, height: 1.7)),
            const SizedBox(height: 28),
            for (final p in points)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(children: [
                  Container(
                    width: 26,
                    height: 26,
                    decoration: BoxDecoration(
                      color: white.withValues(alpha: .16),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.check_rounded, color: white, size: 18),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(p,
                        style: const TextStyle(
                            color: white, fontSize: 15.5, fontWeight: FontWeight.w600)),
                  ),
                ]),
              ),
            const Spacer(),
            Text('${l10n.brandName} · Flutter · Bloc · Clean Architecture',
                style: TextStyle(color: white.withValues(alpha: .7), fontSize: 13)),
          ]),
        ),
      ]),
    );
  }
}

class _CompactHeader extends StatelessWidget {
  const _CompactHeader();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: AppColors.brandGradient,
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      padding: EdgeInsets.fromLTRB(16, MediaQuery.paddingOf(context).top + 14, 12, 48),
      child: const Row(children: [
        _Logo(),
        Spacer(),
        SettingsControls(onDark: true),
      ]),
    );
  }
}

class _Logo extends StatelessWidget {
  const _Logo();

  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(11),
        ),
        child: const Icon(Icons.shield_rounded, color: AppColors.brand, size: 22),
      ),
      const SizedBox(width: 10),
      Text(context.l10n.appName,
          style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
    ]);
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
    final fg = onDark ? Colors.white : Theme.of(context).colorScheme.onSurface;
    final icon = switch (settings.themeMode) {
      ThemeMode.light => Icons.light_mode_rounded,
      ThemeMode.dark => Icons.dark_mode_rounded,
      ThemeMode.system => Icons.brightness_auto_rounded,
    };
    final themeName = switch (settings.themeMode) {
      ThemeMode.light => l10n.themeLight,
      ThemeMode.dark => l10n.themeDark,
      ThemeMode.system => l10n.themeSystem,
    };
    final side = BorderSide(color: fg.withValues(alpha: .28));
    return Row(mainAxisSize: MainAxisSize.min, children: [
      OutlinedButton(
        key: const Key('toggle-language'),
        style: OutlinedButton.styleFrom(
          foregroundColor: fg,
          side: side,
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
        style: IconButton.styleFrom(foregroundColor: fg, side: side),
        onPressed: () => context.read<SettingsCubit>().cycleTheme(),
        icon: Icon(icon, size: 20),
      ),
    ]);
  }
}

class DemoChip extends StatelessWidget {
  const DemoChip({super.key});

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme;
    return Tooltip(
      message: context.l10n.demoModeNote,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: AppColors.warning.withValues(alpha: .16),
          borderRadius: BorderRadius.circular(99),
          border: Border.all(color: AppColors.warning.withValues(alpha: .5)),
        ),
        child: Text(context.l10n.demoBadge,
            style: TextStyle(
                color: c.brightness == Brightness.light ? const Color(0xFF9A5B00) : AppColors.warning,
                fontWeight: FontWeight.w800,
                fontSize: 12.5)),
      ),
    );
  }
}

class _DotsPainter extends CustomPainter {
  const _DotsPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = Colors.white.withValues(alpha: .07);
    for (double x = 12; x < size.width; x += 26) {
      for (double y = 12; y < size.height; y += 26) {
        canvas.drawCircle(Offset(x, y), 1.4, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
