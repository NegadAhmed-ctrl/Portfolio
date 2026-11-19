import 'package:material_ui/material_ui.dart';

import '../../../../core/l10n/l10n.dart';
import '../../../../core/theme/app_theme.dart';

/// Shown for a split second while the saved session is restored.
class SplashPage extends StatelessWidget {
  const SplashPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: AppColors.brandGradient),
        child: Center(
          child: Semantics(
            label: context.l10n.loading,
            child: const SizedBox.square(
              dimension: 36,
              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 3),
            ),
          ),
        ),
      ),
    );
  }
}
