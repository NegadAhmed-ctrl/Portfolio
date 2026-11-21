import 'package:material_ui/material_ui.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/config/app_services.dart';
import '../../../../core/l10n/l10n.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/auth_scaffold.dart';
import '../../data/demo_outbox.dart';

/// DEMO ONLY: shows the latest code the demo backend "emailed" to [email].
/// Renders nothing when the app runs on a real backend.
class DemoInboxCard extends StatelessWidget {
  const DemoInboxCard({
    super.key,
    required this.email,
    required this.kind,
    required this.onUseCode,
  });

  final String email;
  final DemoEmailKind kind;
  final ValueChanged<String> onUseCode;

  @override
  Widget build(BuildContext context) {
    final outbox = context.read<AppServices>().outbox;
    if (outbox == null) return const SizedBox.shrink();
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final c = theme.colorScheme;

    return ValueListenableBuilder<List<DemoEmail>>(
      valueListenable: outbox,
      builder: (context, _, _) {
        final mail = outbox.latestFor(email.trim().toLowerCase(), kind);
        // A tear-off slip under the page: perforated top edge, the code
        // printed in the same mono face as the passport number cells.
        return CustomPaint(
          key: const Key('demo-inbox'),
          painter: _PerforationPainter(c.outline),
          child: Container(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 18),
            decoration: BoxDecoration(
              color: c.surface.withValues(alpha: .92),
              border: Border(
                left: BorderSide(color: c.outlineVariant),
                right: BorderSide(color: c.outlineVariant),
                bottom: BorderSide(color: c.outlineVariant),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.mail_outline_rounded, color: c.onSurfaceVariant, size: 20),
                    const SizedBox(width: 8),
                    Expanded(child: Text(l10n.inboxTitle, style: theme.textTheme.titleMedium)),
                    const DemoChip(),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  l10n.inboxSubtitle,
                  style: theme.textTheme.bodySmall?.copyWith(color: c.onSurfaceVariant),
                ),
                const SizedBox(height: 14),
                if (mail == null)
                  Text(l10n.inboxEmpty, style: TextStyle(color: c.onSurfaceVariant))
                else
                  Wrap(
                    spacing: 16,
                    runSpacing: 10,
                    crossAxisAlignment: WrapCrossAlignment.end,
                    alignment: WrapAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            kind == DemoEmailKind.verifyEmail
                                ? l10n.inboxVerifySubject
                                : l10n.inboxResetSubject,
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          Text(
                            l10n.inboxTo(mail.to),
                            style: theme.textTheme.bodySmall?.copyWith(color: c.onSurfaceVariant),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            mail.code,
                            key: const Key('demo-code'),
                            textDirection: TextDirection.ltr,
                            style: TextStyle(
                              fontFamily: AppFonts.mrz,
                              fontSize: 28,
                              letterSpacing: 7,
                              color: c.primary,
                            ),
                          ),
                        ],
                      ),
                      OutlinedButton(
                        key: const Key('use-demo-code'),
                        style: OutlinedButton.styleFrom(minimumSize: const Size(0, 44)),
                        onPressed: () => onUseCode(mail.code),
                        child: Text(l10n.inboxUseCode),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _PerforationPainter extends CustomPainter {
  const _PerforationPainter(this.color);

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = color
      ..strokeWidth = 1.4
      ..strokeCap = StrokeCap.round;
    for (double x = 2; x < size.width; x += 9) {
      canvas.drawLine(Offset(x, 0), Offset(x + 4, 0), p);
    }
  }

  @override
  bool shouldRepaint(_PerforationPainter old) => old.color != color;
}
