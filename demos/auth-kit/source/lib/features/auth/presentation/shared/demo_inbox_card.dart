import 'package:material_ui/material_ui.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/config/app_services.dart';
import '../../../../core/l10n/l10n.dart';
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
        return Container(
          key: const Key('demo-inbox'),
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: c.surface,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: c.outline, style: BorderStyle.solid),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Icon(Icons.inbox_rounded, color: c.primary, size: 20),
              const SizedBox(width: 8),
              Expanded(child: Text(l10n.inboxTitle, style: theme.textTheme.titleMedium)),
              const DemoChip(),
            ]),
            const SizedBox(height: 4),
            Text(l10n.inboxSubtitle,
                style: theme.textTheme.bodySmall?.copyWith(color: c.onSurfaceVariant)),
            const SizedBox(height: 14),
            if (mail == null)
              Text(l10n.inboxEmpty, style: TextStyle(color: c.onSurfaceVariant))
            else
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: c.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(children: [
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(
                        kind == DemoEmailKind.verifyEmail
                            ? l10n.inboxVerifySubject
                            : l10n.inboxResetSubject,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      Text(l10n.inboxTo(mail.to),
                          style: theme.textTheme.bodySmall?.copyWith(color: c.onSurfaceVariant)),
                      const SizedBox(height: 6),
                      Text(
                        mail.code,
                        key: const Key('demo-code'),
                        textDirection: TextDirection.ltr,
                        style: TextStyle(
                          fontSize: 26,
                          letterSpacing: 6,
                          fontWeight: FontWeight.w800,
                          color: c.primary,
                        ),
                      ),
                    ]),
                  ),
                  FilledButton.tonal(
                    key: const Key('use-demo-code'),
                    style: FilledButton.styleFrom(minimumSize: const Size(0, 44)),
                    onPressed: () => onUseCode(mail.code),
                    child: Text(l10n.inboxUseCode),
                  ),
                ]),
              ),
          ]),
        );
      },
    );
  }
}
